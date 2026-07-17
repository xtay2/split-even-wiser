import { useDispatch, useSelector } from 'react-redux'
import { useGetBalancesQuery, useCreateSettlementMutation } from '../api/groupsApi'
import useOnlineStatus from '../features/offline/useOnlineStatus'
import { queueOfflineAction, selectQueueItems } from '../features/offline/offlineQueueSlice'

export default function GroupBalancesTab({ hidden, groupId, currentUser, nameFor }) {
  const dispatch = useDispatch()
  const isOnline = useOnlineStatus()
  const queueItems = useSelector(selectQueueItems)

  const { data: balances = [] } = useGetBalancesQuery(groupId)
  const [createSettlement] = useCreateSettlementMutation()

  const myBalances = balances.filter(
    (transaction) => transaction.from_user_id === currentUser.id || transaction.to_user_id === currentUser.id,
  )
  const otherBalances = balances.filter(
    (transaction) => transaction.from_user_id !== currentUser.id && transaction.to_user_id !== currentUser.id,
  )

  const pendingSettlementTargets = new Set(
    queueItems
      .filter(
        (item) =>
          String(item.groupId) === String(groupId) && item.type === 'settlement' && item.status === 'pending',
      )
      .map((item) => item.payload.to_user_id),
  )

  async function handleSettle(transaction) {
    const payload = {
      to_user_id: transaction.to_user_id,
      amount: transaction.amount,
      currency: transaction.currency,
    }

    if (!isOnline) {
      dispatch(
        queueOfflineAction({
          type: 'settlement',
          groupId,
          payload,
          label: `Settle up with ${nameFor(transaction.to_user_id)}`,
        }),
      )
      return
    }

    try {
      await createSettlement({ groupId, ...payload }).unwrap()
    } catch (settleError) {
      if (settleError?.status === 'FETCH_ERROR') {
        dispatch(
          queueOfflineAction({
            type: 'settlement',
            groupId,
            payload,
            label: `Settle up with ${nameFor(transaction.to_user_id)}`,
          }),
        )
      }
    }
  }

  return (
    <section hidden={hidden}>
      {myBalances.length === 0 && otherBalances.length === 0 ? (
        <p className="friends-empty">Everyone's settled up.</p>
      ) : (
        <ul className="balance-list">
          {myBalances.map((transaction, index) => {
            const youOwe = transaction.from_user_id === currentUser.id
            return (
              <li key={index} className="balance-row">
                <span>
                  {youOwe ? (
                    <>You owe <strong>{nameFor(transaction.to_user_id)}</strong></>
                  ) : (
                    <><strong>{nameFor(transaction.from_user_id)}</strong> owes you</>
                  )}
                </span>
                <span className={`amount ${youOwe ? 'amount--owed' : 'amount--credit'}`}>
                  {transaction.amount} {transaction.currency}
                </span>
                {youOwe && (
                  <button
                    type="button"
                    className="balance-settle-btn"
                    onClick={() => handleSettle(transaction)}
                    disabled={pendingSettlementTargets.has(transaction.to_user_id)}
                  >
                    {pendingSettlementTargets.has(transaction.to_user_id) ? 'Queued' : 'Mark settled'}
                  </button>
                )}
              </li>
            )
          })}
          {otherBalances.map((transaction, index) => (
            <li key={`other-${index}`} className="balance-row balance-row--muted">
              <span>
                {nameFor(transaction.from_user_id)} owes {nameFor(transaction.to_user_id)}
              </span>
              <span className="amount">{transaction.amount} {transaction.currency}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
