import { useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { groupsApi } from '../../api/groupsApi'
import {
  itemSyncFailed,
  itemSyncSucceeded,
  localIdResolved,
  localIdsReferencedBy,
  retryableItemsRequeued,
  selectQueueItems,
} from './offlineQueueSlice'

// A request that never settles (e.g. a half-open connection right after coming back online)
// would otherwise block every later sync. Giving up on it is safe: each item carries a
// client_uuid, so if the request did reach the server, the retry returns the same record.
const SEND_TIMEOUT_MS = 20_000

// After a network failure, retry on this schedule (doubling, capped) - the 'online' event alone
// isn't enough, as it often fires before the connection actually works.
const RETRY_BASE_DELAY_MS = 5_000
const RETRY_MAX_DELAY_MS = 60_000

function isNetworkError(error) {
  return error?.status === 'FETCH_ERROR' || error?.status === 'TIMEOUT_ERROR'
}

function withTimeout(promise) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject({ status: 'TIMEOUT_ERROR' }), SEND_TIMEOUT_MS)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// The server rejected the item itself (validation, permissions, ...) - as opposed to a server
// error, which may well be gone on the next attempt.
function isClientError(error) {
  return typeof error?.status === 'number' && error.status >= 400 && error.status < 500
}

// A placeholder whose first attempt reached the server but whose retry didn't carry the same
// client_uuid (queued before it was sent) is rejected as a duplicate name. The group can only
// hold one placeholder with that name, so that one is the person meant - adopt it.
async function findExistingPlaceholder(dispatch, item) {
  const { name, email } = item.payload
  const displayName = (name || email?.split('@')[0] || '').trim().toLowerCase()
  const request = dispatch(groupsApi.endpoints.getGroup.initiate(item.groupId, { forceRefetch: true }))
  try {
    const group = await request.unwrap()
    return group.members.find(
      (member) => member.is_placeholder && (member.display_name ?? '').trim().toLowerCase() === displayName,
    )
  } catch {
    return undefined
  } finally {
    request.unsubscribe()
  }
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
      let placeholder
      try {
        const result = await dispatch(
          groupsApi.endpoints.addPlaceholderMember.initiate({ groupId: item.groupId, ...payload }),
        ).unwrap()
        placeholder = result.placeholder
      } catch (error) {
        placeholder = error?.data?.errors?.name ? await findExistingPlaceholder(dispatch, item) : undefined
        if (!placeholder) throw error
      }
      dispatch(localIdResolved({ localId, realId: placeholder.id }))
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
// Runs on mount (in case items were queued in a previous session), whenever the queue changes, on
// every 'online' event and when the app comes back to the foreground - and keeps retrying with
// backoff while the network or server keeps failing. Items the server rejected outright stay
// failed until the user retries or discards them.
export default function useOfflineSync() {
  const dispatch = useDispatch()
  const store = useStore()
  const items = useSelector(selectQueueItems)
  const isSyncingRef = useRef(false)
  const retryTimerRef = useRef(null)
  const retryDelayRef = useRef(RETRY_BASE_DELAY_MS)
  // Set when sync was asked for mid-run: the options for the run to do once this one is done.
  const rerunRef = useRef(null)
  // A failure that wants a retry later - kept across runs, so an immediate re-run (which may well
  // find nothing to send) doesn't swallow it.
  const retryLaterRef = useRef(false)
  // Lets the timers below call syncQueue without it referencing itself.
  const syncQueueRef = useRef(null)

  // `requeueFailed` also puts items that failed for a possibly passing reason back in line - only
  // on the triggers that aren't caused by the queue changing, so a failing item can't loop.
  const syncQueue = useCallback(async ({ requeueFailed = false } = {}) => {
    if (!navigator.onLine) return
    if (isSyncingRef.current) {
      // Something changed mid-run (e.g. an item retried by hand) - go again once this run is done.
      rerunRef.current = { requeueFailed: requeueFailed || Boolean(rerunRef.current?.requeueFailed) }
      return
    }
    isSyncingRef.current = true
    rerunRef.current = null

    if (requeueFailed) {
      // This run is the retry - a scheduled one would only repeat it.
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
      retryLaterRef.current = false
      dispatch(retryableItemsRequeued())
    }

    try {
      const attempted = new Set()
      const blocked = new Set()
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
          if (isBlocked) {
            blocked.add(item.id)
          } else {
            dispatch(
              itemSyncFailed({ id: item.id, error: 'Refers to a person that was discarded.', retryable: false }),
            )
          }
          continue
        }

        try {
          await withTimeout(sendItem(dispatch, item))
          dispatch(itemSyncSucceeded({ id: item.id }))
          retryDelayRef.current = RETRY_BASE_DELAY_MS
          // This may have been what the blocked items were waiting for - give them another go.
          for (const id of blocked) attempted.delete(id)
          blocked.clear()
        } catch (error) {
          if (isNetworkError(error)) {
            // Connection isn't (or no longer) working - stop here and retry later.
            retryLaterRef.current = true
            break
          }
          const retryable = !isClientError(error)
          if (retryable) retryLaterRef.current = true
          dispatch(
            itemSyncFailed({
              id: item.id,
              error: error?.data?.message ?? 'The server rejected this item.',
              retryable,
            }),
          )
        }
      }
    } finally {
      isSyncingRef.current = false
    }

    if (rerunRef.current) {
      const options = rerunRef.current
      setTimeout(() => syncQueueRef.current(options), 0)
    } else if (retryLaterRef.current && !retryTimerRef.current) {
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null
        syncQueueRef.current({ requeueFailed: true })
      }, retryDelayRef.current)
      retryDelayRef.current = Math.min(retryDelayRef.current * 2, RETRY_MAX_DELAY_MS)
    }
  }, [dispatch, store])

  useEffect(() => {
    syncQueueRef.current = syncQueue
  }, [syncQueue])

  // On start, also retry what failed in an earlier session.
  useEffect(() => {
    syncQueue({ requeueFailed: true })
  }, [syncQueue])

  // Re-run whenever the queue changes, so newly queued or retried items go out right away.
  useEffect(() => {
    syncQueue()
  }, [syncQueue, items])

  useEffect(() => {
    const syncAndRetryFailed = () => syncQueue({ requeueFailed: true })
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') syncAndRetryFailed()
    }
    window.addEventListener('online', syncAndRetryFailed)
    document.addEventListener('visibilitychange', syncWhenVisible)
    return () => {
      window.removeEventListener('online', syncAndRetryFailed)
      document.removeEventListener('visibilitychange', syncWhenVisible)
      clearTimeout(retryTimerRef.current)
    }
  }, [syncQueue])
}
