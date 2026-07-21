import { useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { groupsApi } from '../../api/groupsApi'
import { itemSyncFailed, itemSyncSucceeded, selectQueueItems } from './offlineQueueSlice'

// Replays queued offline expenses/settlements against the API once a connection is available.
// Runs on mount (in case items were queued in a previous session) and on every 'online' event.
export default function useOfflineSync() {
  const dispatch = useDispatch()
  const items = useSelector(selectQueueItems)
  const isSyncingRef = useRef(false)

  const syncQueue = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine) return
    isSyncingRef.current = true

    try {
      for (const item of items.filter((entry) => entry.status === 'pending')) {
        const endpoint =
          item.type === 'expense' ? groupsApi.endpoints.createExpense : groupsApi.endpoints.createSettlement

        try {
          await dispatch(endpoint.initiate({ groupId: item.groupId, ...item.payload })).unwrap()
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
  }, [dispatch, items])

  useEffect(() => {
    if (navigator.onLine) syncQueue()

    window.addEventListener('online', syncQueue)
    return () => window.removeEventListener('online', syncQueue)
  }, [syncQueue])
}
