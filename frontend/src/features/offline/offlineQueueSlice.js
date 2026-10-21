import { createSlice } from '@reduxjs/toolkit'

const STORAGE_KEY = 'split-even-wiser.offline-queue'

// Groups and placeholders created offline get a client-side id with this prefix until the server
// assigns the real one. Queued items referencing such an id are rewritten once it's known.
const LOCAL_ID_PREFIX = 'local-'

export function isLocalId(id) {
  return typeof id === 'string' && id.startsWith(LOCAL_ID_PREFIX)
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const state = raw ? JSON.parse(raw) : {}
    return { items: state.items ?? [], resolvedIds: state.resolvedIds ?? {} }
  } catch {
    return { items: [], resolvedIds: {} }
  }
}

function persist(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const initialState = loadPersisted()

const resolve = (value, localId, realId) => (value === localId ? realId : value)

// Payments, settlements, groups and placeholders made while offline are queued here (keyed by a
// client-generated UUID) and replayed against the API once the connection returns. Anything that
// requires an immediate, consistent server response - like leaving a group - is deliberately not
// queueable.
const offlineQueueSlice = createSlice({
  name: 'offlineQueue',
  initialState,
  reducers: {
    itemQueued(state, action) {
      state.items.push({
        id: action.payload.id,
        type: action.payload.type,
        groupId: action.payload.groupId,
        payload: action.payload.payload,
        label: action.payload.label,
        createdAt: new Date().toISOString(),
        status: 'pending',
        error: null,
      })
      persist(state)
    },
    itemSyncSucceeded(state, action) {
      state.items = state.items.filter((item) => item.id !== action.payload.id)
      persist(state)
    },
    itemSyncFailed(state, action) {
      const item = state.items.find((entry) => entry.id === action.payload.id)
      if (item) {
        item.status = 'error'
        item.error = action.payload.error
        // false only when the server rejected the item itself (4xx) - retrying won't help there.
        item.retryable = action.payload.retryable ?? true
      }
      persist(state)
    },
    // Puts failed items that may well succeed now (server errors, e.g. during a deploy) back in
    // line. Items that failed before `retryable` existed have no flag and are retried too.
    retryableItemsRequeued(state) {
      let changed = false
      for (const item of state.items) {
        if (item.status === 'error' && item.retryable !== false) {
          item.status = 'pending'
          item.error = null
          changed = true
        }
      }
      if (changed) persist(state)
    },
    itemRetried(state, action) {
      const item = state.items.find((entry) => entry.id === action.payload.id)
      if (item) {
        item.status = 'pending'
        item.error = null
      }
      persist(state)
    },
    itemDiscarded(state, action) {
      const discarded = state.items.find((item) => item.id === action.payload.id)
      // Everything queued inside a group that will now never be created goes with it.
      state.items = state.items.filter(
        (item) =>
          item.id !== action.payload.id && !(discarded?.type === 'group' && item.groupId === discarded.groupId),
      )
      persist(state)
    },
    // The server assigned `realId` to the group/placeholder created offline as `localId` - point
    // every remaining queued item at the real id, and remember the mapping so a screen still
    // showing the local id can redirect.
    localIdResolved(state, action) {
      const { localId, realId } = action.payload
      state.resolvedIds[localId] = realId
      for (const item of state.items) {
        item.groupId = resolve(item.groupId, localId, realId)
        const { payload } = item
        if (item.type === 'expense') {
          payload.paid_by = resolve(payload.paid_by, localId, realId)
          payload.shares = payload.shares.map((share) => ({
            ...share,
            user_id: resolve(share.user_id, localId, realId),
          }))
        } else if (item.type === 'settlement') {
          payload.from_user_id = resolve(payload.from_user_id, localId, realId)
          payload.to_user_id = resolve(payload.to_user_id, localId, realId)
        }
      }
      persist(state)
    },
  },
})

export const {
  itemQueued,
  itemSyncSucceeded,
  itemSyncFailed,
  retryableItemsRequeued,
  itemRetried,
  itemDiscarded,
  localIdResolved,
} = offlineQueueSlice.actions
export default offlineQueueSlice.reducer

// Builds an itemQueued action with a fresh client UUID. The same UUID is sent to the API as
// `client_uuid` so a retried sync (e.g. dropped connection mid-flush) can't create a duplicate.
export function queueOfflineAction({ type, groupId, payload, label }) {
  const id = crypto.randomUUID()
  return itemQueued({ id, type, groupId, payload: { ...payload, client_uuid: id }, label })
}

// Queues a group created offline. Its local id doubles as the item's groupId, so everything
// queued inside the new group is listed (and discarded) together with it.
export function queueOfflineGroup({ name, description }) {
  const id = crypto.randomUUID()
  const localId = LOCAL_ID_PREFIX + id
  return itemQueued({
    id,
    type: 'group',
    groupId: localId,
    payload: { name, description, client_uuid: id, local_id: localId },
    label: `Create group "${name}"`,
  })
}

export function queueOfflinePlaceholder({ groupId, name, email }) {
  const id = crypto.randomUUID()
  const localId = LOCAL_ID_PREFIX + id
  return itemQueued({
    id,
    type: 'placeholder',
    groupId,
    payload: { name, email, client_uuid: id, local_id: localId },
    label: `Add ${name || email}`,
  })
}

// Mirrors the API's user shape closely enough for member lists and pickers.
export function placeholderMemberFromItem(item) {
  const { name, email, local_id: localId } = item.payload
  return {
    id: localId,
    username: name || email.split('@')[0],
    display_name: name || email.split('@')[0],
    email: email ?? null,
    avatar_url: null,
    is_placeholder: true,
  }
}

export const selectQueueItems = (state) => state.offlineQueue.items
// The local ids (offline-created group/placeholders) an item can't be sent without.
export function localIdsReferencedBy(item) {
  const ids = [item.type === 'group' ? null : item.groupId]
  if (item.type === 'expense') {
    ids.push(item.payload.paid_by, ...item.payload.shares.map((share) => share.user_id))
  } else if (item.type === 'settlement') {
    ids.push(item.payload.from_user_id, item.payload.to_user_id)
  }
  return ids.filter(isLocalId)
}

// Items still to be sent - not counting those stuck behind a group/placeholder that failed, as
// they won't go anywhere until that one is retried or discarded.
export const selectPendingQueueCount = (state) => {
  const { items } = state.offlineQueue
  const failedLocalIds = new Set(
    items.filter((item) => item.status === 'error' && item.payload.local_id).map((item) => item.payload.local_id),
  )
  return items.filter(
    (item) => item.status === 'pending' && !localIdsReferencedBy(item).some((id) => failedLocalIds.has(id)),
  ).length
}
export const selectResolvedIds = (state) => state.offlineQueue.resolvedIds

// Maps a local id to the real one once it has synced; anything else is returned unchanged.
export function resolveId(resolvedIds, id) {
  return resolvedIds[id] ?? id
}
