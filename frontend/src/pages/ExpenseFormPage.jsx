import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import {
  useGetGroupQuery,
  useGetExpenseQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} from '../api/groupsApi'
import { selectCurrentUser } from '../features/auth/authSlice'
import useOnlineStatus from '../features/offline/useOnlineStatus'
import { queueOfflineAction } from '../features/offline/offlineQueueSlice'
import './ExpenseFormPage.css'

// Distributes `totalCents` evenly across `count` shares, handing any remainder cent(s)
// to the first shares so the parts always sum exactly back to the total.
function splitEvenly(totalCents, count) {
  const base = Math.floor(totalCents / count)
  const remainder = totalCents % count
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0))
}

export default function ExpenseFormPage() {
  const { groupId, expenseId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const currentUser = useSelector(selectCurrentUser)
  const isOnline = useOnlineStatus()
  const isEditing = Boolean(expenseId)

  const { data: group } = useGetGroupQuery(groupId)
  const { data: expense } = useGetExpenseQuery({ groupId, expenseId }, { skip: !isEditing })
  const [createExpense, { isLoading: isCreating, error: createError }] = useCreateExpenseMutation()
  const [updateExpense, { isLoading: isUpdating, error: updateError }] = useUpdateExpenseMutation()
  const [deleteExpense] = useDeleteExpenseMutation()

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [paidBy, setPaidBy] = useState(currentUser?.id)
  const [splitMode, setSplitMode] = useState('equal')
  const [participants, setParticipants] = useState({}) // user_id -> { included, amount }

  useEffect(() => {
    if (group && Object.keys(participants).length === 0) {
      setParticipants(
        Object.fromEntries(group.members.map((member) => [member.id, { included: true, amount: '' }])),
      )
    }
  }, [group, participants])

  useEffect(() => {
    if (expense) {
      const version = expense.current_version
      setTitle(version.title)
      setAmount(String(version.amount))
      setCurrency(version.currency)
      setPaidBy(version.paid_by)
      setSplitMode('custom')
      setParticipants((prev) => ({
        ...prev,
        ...Object.fromEntries(
          version.shares.map((share) => [share.user_id, { included: true, amount: String(share.share_amount) }]),
        ),
      }))
    }
  }, [expense])

  if (!group) {
    return isOnline ? null : (
      <p className="expense-form-offline-note">
        This group isn't available offline yet. Open it once while online to use it here.
      </p>
    )
  }

  const included = group.members.filter((member) => participants[member.id]?.included)

  function toggleParticipant(userId) {
    setParticipants((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], included: !prev[userId].included },
    }))
  }

  function setCustomAmount(userId, value) {
    setParticipants((prev) => ({ ...prev, [userId]: { ...prev[userId], amount: value } }))
  }

  function buildShares() {
    if (splitMode === 'equal') {
      const totalCents = Math.round(Number(amount) * 100)
      const cents = splitEvenly(totalCents, included.length)
      return included.map((member, index) => ({
        user_id: member.id,
        amount: (cents[index] / 100).toFixed(2),
      }))
    }

    return included.map((member) => ({
      user_id: member.id,
      amount: Number(participants[member.id].amount || 0).toFixed(2),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const payload = {
      title,
      amount: Number(amount).toFixed(2),
      currency: currency.toUpperCase(),
      paid_by: paidBy,
      shares: buildShares(),
    }

    if (isEditing) {
      try {
        await updateExpense({ groupId, expenseId, ...payload }).unwrap()
        navigate(`/groups/${groupId}`)
      } catch {
        // error surfaced below
      }
      return
    }

    if (!isOnline) {
      dispatch(queueOfflineAction({ type: 'expense', groupId, payload, label: title }))
      navigate(`/groups/${groupId}`)
      return
    }

    try {
      await createExpense({ groupId, ...payload }).unwrap()
      navigate(`/groups/${groupId}`)
    } catch (submitError) {
      if (submitError?.status === 'FETCH_ERROR') {
        // The browser thought it was online but the request didn't make it — fall back to
        // queueing rather than losing what the user entered.
        dispatch(queueOfflineAction({ type: 'expense', groupId, payload, label: title }))
        navigate(`/groups/${groupId}`)
        return
      }
      // validation error surfaced below via createError
    }
  }

  async function handleDelete() {
    if (!isOnline) return
    await deleteExpense({ groupId, expenseId }).unwrap()
    navigate(`/groups/${groupId}`)
  }

  const error = createError ?? updateError
  const customTotal = included.reduce((sum, m) => sum + Number(participants[m.id]?.amount || 0), 0)

  return (
    <div className="expense-form-screen">
      <h1 className="expense-form-title">{isEditing ? 'Edit expense' : 'New expense'}</h1>

      <form onSubmit={handleSubmit} className="expense-form">
        <label className="expense-form-label">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="expense-form-input"
            autoFocus
          />
        </label>

        <div className="expense-form-row">
          <label className="expense-form-label">
            Amount
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              className="expense-form-input amount"
            />
          </label>
          <label className="expense-form-label">
            Currency
            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              maxLength={3}
              required
              className="expense-form-input expense-form-input--currency amount"
            />
          </label>
        </div>

        <label className="expense-form-label">
          Paid by
          <select
            value={paidBy}
            onChange={(event) => setPaidBy(Number(event.target.value))}
            className="expense-form-input"
          >
            {group.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.id === currentUser.id ? 'You' : `@${member.username}`}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="expense-form-fieldset">
          <legend>Split between</legend>
          <div className="expense-form-split-toggle">
            <button
              type="button"
              className={splitMode === 'equal' ? 'is-active' : ''}
              onClick={() => setSplitMode('equal')}
            >
              Equally
            </button>
            <button
              type="button"
              className={splitMode === 'custom' ? 'is-active' : ''}
              onClick={() => setSplitMode('custom')}
            >
              Custom amounts
            </button>
          </div>

          {group.members.map((member) => (
            <div key={member.id} className="expense-form-participant">
              <label className="expense-form-participant__check">
                <input
                  type="checkbox"
                  checked={participants[member.id]?.included ?? false}
                  onChange={() => toggleParticipant(member.id)}
                />
                {member.id === currentUser.id ? 'You' : `@${member.username}`}
              </label>
              {splitMode === 'custom' && participants[member.id]?.included && (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={participants[member.id]?.amount ?? ''}
                  onChange={(event) => setCustomAmount(member.id, event.target.value)}
                  className="expense-form-input expense-form-input--share amount"
                />
              )}
            </div>
          ))}

          {splitMode === 'custom' && amount && (
            <p className={`expense-form-split-total ${customTotal.toFixed(2) === Number(amount).toFixed(2) ? '' : 'is-mismatched'}`}>
              {customTotal.toFixed(2)} / {Number(amount).toFixed(2)} {currency}
            </p>
          )}
        </fieldset>

        {error && (
          <p className="expense-form-error">
            {error.data?.errors?.shares?.[0] ?? error.data?.message ?? 'Could not save expense.'}
          </p>
        )}

        {!isOnline && (
          <p className="expense-form-offline-note">
            {isEditing
              ? "You're offline — editing requires an internet connection."
              : "You're offline — this expense will be saved and synced automatically once you're back online."}
          </p>
        )}

        <button
          type="submit"
          className="expense-form-submit"
          disabled={isCreating || isUpdating || included.length === 0 || (isEditing && !isOnline)}
        >
          {isEditing ? 'Save changes' : 'Add expense'}
        </button>

        {isEditing && (
          <button type="button" className="expense-form-delete" onClick={handleDelete} disabled={!isOnline}>
            Delete expense
          </button>
        )}
      </form>
    </div>
  )
}
