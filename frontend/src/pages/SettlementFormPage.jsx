import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { useGetGroupQuery, useCreateSettlementMutation } from '../api/groupsApi'
import { selectCurrentUser } from '../features/auth/authSlice'
import useOnlineStatus from '../features/offline/useOnlineStatus'
import { queueOfflineAction } from '../features/offline/offlineQueueSlice'
import { todayIsoDate } from '../utils/expenseDate'
import './ExpenseFormPage.css'

export default function SettlementFormPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const currentUser = useSelector(selectCurrentUser)
  const isOnline = useOnlineStatus()

  const { data: group } = useGetGroupQuery(groupId)
  const [createSettlement, { isLoading: isCreating, error: createError }] = useCreateSettlementMutation()

  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [date, setDate] = useState(todayIsoDate)
  const [toUserId, setToUserId] = useState('')

  const recipients = (group?.members ?? []).filter((member) => member.id !== currentUser?.id)

  useEffect(() => {
    if (!toUserId && recipients.length > 0) {
      setToUserId(recipients[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipients.length])

  if (!group) {
    return isOnline ? null : (
      <p className="expense-form-offline-note">
        This group isn't available offline yet. Open it once while online to use it here.
      </p>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const payload = {
      to_user_id: Number(toUserId),
      amount: Number(amount).toFixed(2),
      currency: currency.toUpperCase(),
      date,
    }

    if (!isOnline) {
      dispatch(queueOfflineAction({ type: 'settlement', groupId, payload }))
      navigate(`/groups/${groupId}`)
      return
    }

    try {
      await createSettlement({ groupId, ...payload }).unwrap()
      navigate(`/groups/${groupId}`)
    } catch (submitError) {
      if (submitError?.status === 'FETCH_ERROR') {
        dispatch(queueOfflineAction({ type: 'settlement', groupId, payload }))
        navigate(`/groups/${groupId}`)
      }
      // validation error surfaced below via createError
    }
  }

  return (
    <div className="expense-form-screen">
      <h1 className="expense-form-title">New settlement</h1>

      <form onSubmit={handleSubmit} className="expense-form">

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
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
            className="expense-form-input"
          />
        </label>

        <label className="expense-form-label">
          Paid to
          <select
            value={toUserId}
            onChange={(event) => setToUserId(event.target.value)}
            required
            className="expense-form-input"
          >
            {recipients.map((member) => (
              <option key={member.id} value={member.id}>
                @{member.username}
              </option>
            ))}
          </select>
        </label>

        {createError && (
          <p className="expense-form-error">
            {createError.data?.errors?.to_user_id?.[0] ?? createError.data?.message ?? 'Could not save settlement.'}
          </p>
        )}

        {!isOnline && (
          <p className="expense-form-offline-note">
            You're offline — this settlement will be saved and synced automatically once you're back online.
          </p>
        )}

        <button
          type="submit"
          className="expense-form-submit"
          disabled={isCreating || recipients.length === 0}
        >
          Add settlement
        </button>
      </form>
    </div>
  )
}
