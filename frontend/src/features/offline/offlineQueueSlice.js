import { createSlice } from '@reduxjs/toolkit'

const STORAGE_KEY = 'split-even-wiser.offline-queue'

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { items: [] }
  } catch {
    return { items: [] }
  }
}

function persist(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const initialState = loadPersisted()

// Payments and settlements made while offline are queued here (keyed by a client-generated
// UUID) and replayed against the API once the connection returns. Anything that requires an
// immediate, consistent server response — like leaving a group — is deliberately not queueable.
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
      }
      persist(state)
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
      state.items = state.items.filter((item) => item.id !== action.payload.id)
      persist(state)
    },
  },
})

export const { itemQueued, itemSyncSucceeded, itemSyncFailed, itemRetried, itemDiscarded } =
  offlineQueueSlice.actions
export default offlineQueueSlice.reducer

// Builds an itemQueued action with a fresh client UUID. The same UUID is sent to the API as
// `client_uuid` so a retried sync (e.g. dropped connection mid-flush) can't create a duplicate.
export function queueOfflineAction({ type, groupId, payload, label }) {
  const id = crypto.randomUUID()
  return itemQueued({ id, type, groupId, payload: { ...payload, client_uuid: id }, label })
}

export const selectQueueItems = (state) => state.offlineQueue.items
export const selectPendingQueueCount = (state) =>
  state.offlineQueue.items.filter((item) => item.status === 'pending').length
