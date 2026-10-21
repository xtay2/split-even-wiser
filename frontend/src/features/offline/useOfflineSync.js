import { useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { groupsApi } from '../../api/groupsApi'
import {
  isLocalId,
  itemSyncFailed,
  itemSyncSucceeded,
  localIdResolved,
  selectQueueItems,
} from './offlineQueueSlice'

// The local ids (offline-created group/placeholders) an item can't be sent without.
function localIdsReferencedBy(item) {
  const ids = [item.type === 'group' ? null : item.groupId]
  if (item.type === 'expense') {
    ids.push(item.payload.paid_by, ...item.payload.shares.map((share) => share.user_id))
  } else if (item.type === 'settlement') {
    ids.push(item.payload.from_user_id, item.payload.to_user_id)
  }
  return ids.filter(isLocalId)
}

async function sendItem(dispatch, item) {
  const { local_id: localId, ...payload } = item.payload

  switch (item.type) {
    case 'group': {
      const group = await dispatch(groupsApi.endpoints.createGroup.initiate(payload)).unwrap()
      dispatch(localIdResolved({ localId, realId: group.id }))
      return
    }
    case 'placeholder': {
      const result = await dispatch(
        groupsApi.endpoints.addPlaceholderMember.initiate({ groupId: item.groupId, ...payload }),
      ).unwrap()
      dispatch(localIdResolved({ localId, realId: result.placeholder.id }))
      return
    }
    case 'expense':
      await dispatch(groupsApi.endpoints.createExpense.initiate({ groupId: item.groupId, ...payload })).unwrap()
      return
    default:
      await dispatch(groupsApi.endpoints.createSettlement.initiate({ groupId: item.groupId, ...payload })).unwrap()
  }
}

// Replays queued offline items against the API once a connection is available, in the order they
// were queued - so a group or placeholder created offline exists (and its real id has been patched
// into later items) before anything referencing it is sent.
// Runs on mount (in case items were queued in a previous session) and on every 'online' event.
export default function useOfflineSync() {
  const dispatch = useDispatch()
  const store = useStore()
  const items = useSelector(selectQueueItems)
  const isSyncingRef = useRef(false)

  const syncQueue = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine) return
    isSyncingRef.current = true

    try {
      const attempted = new Set()
      for (;;) {
        // Re-read the queue each round: a synced group/placeholder rewrites the items after it.
        const queue = selectQueueItems(store.getState())
        const item = queue.find((entry) => entry.status === 'pending' && !attempted.has(entry.id))
        if (!item) break
        attempted.add(item.id)

        const unresolved = localIdsReferencedBy(item)
        if (unresolved.length > 0) {
          // Still waiting on the group/placeholder it refers to (which may have failed and be
          // waiting for a retry) - leave it pending, it goes out once that one has synced.
          const isBlocked = unresolved.some((localId) =>
            queue.some((entry) => entry.payload.local_id === localId),
          )
          if (!isBlocked) {
            dispatch(itemSyncFailed({ id: item.id, error: 'Refers to a person that was discarded.' }))
          }
          continue
        }

        try {
          await sendItem(dispatch, item)
          dispatch(itemSyncSucceeded({ id: item.id }))
        } catch (error) {
          if (error?.status === 'FETCH_ERROR' || error?.status === 'TIMEOUT_ERROR') {
            // Connection dropped again mid-sync - stop here, the next 'online' event retries.
            break
          }
          dispatch(
            itemSyncFailed({
              id: item.id,
              error: error?.data?.message ?? 'The server rejected this item.',
            }),
          )
        }
      }
    } finally {
      isSyncingRef.current = false
    }
  }, [dispatch, store])

  // Re-run whenever the queue changes, so newly queued or retried items go out right away.
  useEffect(() => {
    if (navigator.onLine) syncQueue()
  }, [syncQueue, items])

  useEffect(() => {
    window.addEventListener('online', syncQueue)
    return () => window.removeEventListener('online', syncQueue)
  }, [syncQueue])
}
