import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useSelector } from 'react-redux'
import {
  useGetGroupQuery,
  useGetBalancesQuery,
  useGetActivityQuery,
  useGetExpensesQuery,
  useAddGroupMemberMutation,
  useLeaveGroupMutation,
  useCreateSettlementMutation,
} from '../api/groupsApi'
import { selectCurrentUser } from '../features/auth/authSlice'
import ActivityFeed from '../components/ActivityFeed'
import './GroupDetailPage.css'

export default function GroupDetailPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const currentUser = useSelector(selectCurrentUser)

  const { data: group } = useGetGroupQuery(groupId)
  const { data: balances = [] } = useGetBalancesQuery(groupId)
  const { data: activity = [] } = useGetActivityQuery(groupId)
  const { data: expenses = [] } = useGetExpensesQuery(groupId)

  const [addMember, { isLoading: isAdding, error: addError }] = useAddGroupMemberMutation()
  const [leaveGroup, { isLoading: isLeaving, error: leaveError }] = useLeaveGroupMutation()
  const [createSettlement] = useCreateSettlementMutation()

  const [memberIdentifier, setMemberIdentifier] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)

  if (!group) return null

  const membersById = Object.fromEntries(group.members.map((member) => [member.id, member]))
  const nameFor = (userId) => (userId === currentUser.id ? 'You' : `@${membersById[userId]?.username ?? '?'}`)

  const myBalances = balances.filter(
    (transaction) => transaction.from_user_id === currentUser.id || transaction.to_user_id === currentUser.id,
  )
  const otherBalances = balances.filter(
    (transaction) => transaction.from_user_id !== currentUser.id && transaction.to_user_id !== currentUser.id,
  )

  async function handleAddMember(event) {
    event.preventDefault()
    try {
      await addMember({ groupId, identifier: memberIdentifier }).unwrap()
      setMemberIdentifier('')
      setShowAddMember(false)
    } catch {
      // error surfaced below
    }
  }

  async function handleLeave() {
    try {
      await leaveGroup({ groupId, userId: currentUser.id }).unwrap()
      navigate('/groups')
    } catch {
      // error surfaced below
    }
  }

  async function handleSettle(transaction) {
    await createSettlement({
      groupId,
      to_user_id: transaction.to_user_id,
      amount: transaction.amount,
      currency: transaction.currency,
    }).unwrap()
  }

  return (
    <div className="group-detail-screen">
      <header className="group-detail-header">
        <h1 className="group-detail-title">{group.name}</h1>
        {group.description && <p className="group-detail-description">{group.description}</p>}
      </header>

      <section>
        <h2 className="friends-section-title">Balances</h2>
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
                    >
                      Mark settled
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

      <section>
        <div className="groups-header">
          <h2 className="friends-section-title">Expenses</h2>
          <Link to={`/groups/${groupId}/expenses/new`} className="groups-new-btn">
            + New expense
          </Link>
        </div>
        {expenses.length === 0 ? (
          <p className="friends-empty">No expenses yet.</p>
        ) : (
          <ul className="expense-list">
            {expenses.map((expense) => (
              <li key={expense.id}>
                <Link to={`/groups/${groupId}/expenses/${expense.id}`} className="expense-row">
                  <span className="expense-row__title">{expense.current_version.title}</span>
                  <span className="expense-row__leader" aria-hidden="true" />
                  <span className="amount">
                    {expense.current_version.amount} {expense.current_version.currency}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="groups-header">
          <h2 className="friends-section-title">Members</h2>
          <button type="button" className="groups-new-btn" onClick={() => setShowAddMember((v) => !v)}>
            {showAddMember ? 'Cancel' : '+ Add member'}
          </button>
        </div>
        {showAddMember && (
          <form onSubmit={handleAddMember} className="friends-add-form">
            <input
              value={memberIdentifier}
              onChange={(event) => setMemberIdentifier(event.target.value)}
              placeholder="username or email"
              className="friends-add-input"
              required
            />
            <button type="submit" className="friends-add-btn" disabled={isAdding || !memberIdentifier}>
              {isAdding ? '…' : 'Add'}
            </button>
          </form>
        )}
        {addError && <p className="friends-error">{addError.data?.errors?.identifier?.[0] ?? 'Could not add member.'}</p>}
        <ul className="member-list">
          {group.members.map((member) => (
            <li key={member.id} className="member-chip">@{member.username}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="friends-section-title">Activity</h2>
        <ActivityFeed activity={activity} currentUserId={currentUser.id} />
      </section>

      <button type="button" className="group-leave-btn" onClick={handleLeave} disabled={isLeaving}>
        Leave group
      </button>
      {leaveError && (
        <p className="friends-error group-leave-error">
          {leaveError.data?.message ?? 'Could not leave the group.'}
        </p>
      )}
    </div>
  )
}
