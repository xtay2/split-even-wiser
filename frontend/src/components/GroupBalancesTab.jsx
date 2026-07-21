import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useGetBalancesQuery, useCreateSettlementMutation } from '../api/groupsApi'
import useOnlineStatus from '../features/offline/useOnlineStatus'
import { queueOfflineAction, selectQueueItems } from '../features/offline/offlineQueueSlice'
import ConfirmDialog from './ConfirmDialog'
import ClaimPlaceholderDialog from './ClaimPlaceholderDialog'
import { todayIsoDate } from '../utils/expenseDate'

export default function GroupBalancesTab({ hidden, groupId, currentUser, nameFor, membersById }) {
  const dispatch = useDispatch()
  const isOnline = useOnlineStatus()
  const queueItems = useSelector(selectQueueItems)

  const { data: balances = [] } = useGetBalancesQuery(groupId)
  const [createSettlement] = useCreateSettlementMutation()

  const [showSettleAllConfirm, setShowSettleAllConfirm] = useState(false)
  const [isSettlingAll, setIsSettlingAll] = useState(false)
  const [confirmingTransaction, setConfirmingTransaction] = useState(null)
  const [isSettlingOne, setIsSettlingOne] = useState(false)
  const [claimingMember, setClaimingMember] = useState(null)

  function renderName(userId) {
    const member = membersById[userId]
    if (member?.is_placeholder) {
      return (
        <button type="button" className="balance-person-link" onClick={() => setClaimingMember(member)}>
          {nameFor(userId)}
        </button>
      )
    }
    return nameFor(userId)
  }

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

  const settleableDebts = myBalances.filter(
    (transaction) =>
      transaction.from_user_id === currentUser.id && !pendingSettlementTargets.has(transaction.to_user_id),
  )

  async function settleTransaction(transaction) {
    const payload = {
      to_user_id: transaction.to_user_id,
      amount: transaction.amount,
      currency: transaction.currency,
      date: todayIsoDate(),
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

  async function handleSettle() {
    setIsSettlingOne(true)
    try {
      await settleTransaction(confirmingTransaction)
    } finally {
      setIsSettlingOne(false)
      setConfirmingTransaction(null)
    }
  }

  async function handleSettleAll() {
    setIsSettlingAll(true)
    try {
      for (const transaction of settleableDebts) {
        await settleTransaction(transaction)
      }
    } finally {
      setIsSettlingAll(false)
      setShowSettleAllConfirm(false)
    }
  }

  return (
    <section hidden={hidden}>
      <ConfirmDialog
        open={showSettleAllConfirm}
        title="Mark all debts as settled?"
        message={`This records ${settleableDebts.length} payment${settleableDebts.length === 1 ? '' : 's'} to clear everything you owe in this group.`}
        confirmLabel="Mark all settled"
        isConfirming={isSettlingAll}
        onConfirm={handleSettleAll}
        onCancel={() => setShowSettleAllConfirm(false)}
      />

      <ConfirmDialog
        open={confirmingTransaction !== null}
        title="Mark debt as settled?"
        message={
          confirmingTransaction
            ? `This records a payment of ${confirmingTransaction.amount} ${confirmingTransaction.currency} to ${nameFor(confirmingTransaction.to_user_id)}.`
            : ''
        }
        confirmLabel="Mark settled"
        isConfirming={isSettlingOne}
        onConfirm={handleSettle}
        onCancel={() => setConfirmingTransaction(null)}
      />

      <ClaimPlaceholderDialog
        member={claimingMember}
        groupId={groupId}
        onClose={() => setClaimingMember(null)}
      />

      {myBalances.length === 0 && otherBalances.length === 0 ? (
        <p className="friends-empty">Everyone's settled up.</p>
      ) : (
        <>
          {settleableDebts.length > 1 && (
            <button
              type="button"
              className="balance-settle-all-btn"
              onClick={() => setShowSettleAllConfirm(true)}
            >
              Mark all as settled
            </button>
          )}
          <ul className="balance-list">
            {myBalances.map((transaction, index) => {
              const youOwe = transaction.from_user_id === currentUser.id
              return (
                <li key={index} className="balance-row">
                  <span>
                    {youOwe ? (
                      <>You owe <strong>{renderName(transaction.to_user_id)}</strong></>
                    ) : (
                      <><strong>{renderName(transaction.from_user_id)}</strong> owes you</>
                    )}
                  </span>
                  <span className={`amount ${youOwe ? 'amount--owed' : 'amount--credit'}`}>
                    {transaction.amount} {transaction.currency}
                  </span>
                  {youOwe && (
                    <button
                      type="button"
                      className="balance-settle-btn"
                      onClick={() => setConfirmingTransaction(transaction)}
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
                  {renderName(transaction.from_user_id)} owes {renderName(transaction.to_user_id)}
                </span>
                <span className="amount">{transaction.amount} {transaction.currency}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
