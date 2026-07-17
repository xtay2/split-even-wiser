import { useDispatch, useSelector } from 'react-redux'
import { itemRetried, itemDiscarded, selectQueueItems } from '../features/offline/offlineQueueSlice'

export default function GroupPendingSyncBanner({ groupId }) {
  const dispatch = useDispatch()
  const queueItems = useSelector(selectQueueItems)
  const pendingItems = queueItems.filter((item) => String(item.groupId) === String(groupId))

  if (pendingItems.length === 0) {
    return null
  }

  const pendingExpenses = pendingItems.filter((item) => item.type === 'expense')
  const pendingSettlements = pendingItems.filter((item) => item.type === 'settlement')

  return (
    <section>
      <h2 className="friends-section-title">Pending sync</h2>
      <ul className="pending-sync-list">
        {[...pendingExpenses, ...pendingSettlements].map((item) => (
          <li key={item.id} className="pending-sync-row">
            <span className="pending-sync-row__label">{item.label}</span>
            {item.status === 'error' ? (
              <span className="pending-sync-row__actions">
                <span className="pending-sync-row__error">{item.error}</span>
                <button type="button" onClick={() => dispatch(itemRetried({ id: item.id }))}>
                  Retry
                </button>
                <button type="button" onClick={() => dispatch(itemDiscarded({ id: item.id }))}>
                  Discard
                </button>
              </span>
            ) : (
              <span className="pending-sync-row__status">Waiting to sync…</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
