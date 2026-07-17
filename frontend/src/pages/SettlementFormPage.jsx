import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import {
  useGetGroupQuery,
  useGetSettlementQuery,
  useCreateSettlementMutation,
  useUpdateSettlementMutation,
  useDeleteSettlementMutation,
} from '../api/groupsApi'
import { selectCurrentUser } from '../features/auth/authSlice'
import useOnlineStatus from '../features/offline/useOnlineStatus'
import { queueOfflineAction } from '../features/offline/offlineQueueSlice'
import { todayIsoDate } from '../utils/expenseDate'
import './ExpenseFormPage.css'

export default function SettlementFormPage() {
  const { groupId, settlementId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const currentUser = useSelector(selectCurrentUser)
  const isOnline = useOnlineStatus()
  const isEditing = Boolean(settlementId)

  const { data: group } = useGetGroupQuery(groupId)
  const { data: settlement } = useGetSettlementQuery({ groupId, settlementId }, { skip: !isEditing })
  const [createSettlement, { isLoading: isCreating, error: createError }] = useCreateSettlementMutation()
  const [updateSettlement, { isLoading: isUpdating, error: updateError }] = useUpdateSettlementMutation()
  const [deleteSettlement] = useDeleteSettlementMutation()

  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [date, setDate] = useState(todayIsoDate)
  const [toUserId, setToUserId] = useState('')

  const fromUserId = isEditing ? settlement?.from_user.id : currentUser?.id
  const recipients = (group?.members ?? []).filter((member) => member.id !== fromUserId)

  useEffect(() => {
    if (!isEditing && !toUserId && recipients.length > 0) {
      setToUserId(recipients[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipients.length, isEditing])

  useEffect(() => {
    if (settlement) {
      setAmount(String(settlement.amount))
      setCurrency(settlement.currency)
      setDate(settlement.date)
      setToUserId(settlement.to_user.id)
    }
  }, [settlement])

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

    if (isEditing) {
      try {
        await updateSettlement({ groupId, settlementId, ...payload }).unwrap()
        navigate(`/groups/${groupId}`)
      } catch {
        // error surfaced below
      }
      return
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

  async function handleDelete() {
    if (!isOnline) return
    await deleteSettlement({ groupId, settlementId }).unwrap()
    navigate(`/groups/${groupId}`)
  }

  const error = createError ?? updateError

  return (
    <div className="expense-form-screen">
      <h1 className="expense-form-title">{isEditing ? 'Edit settlement' : 'New settlement'}</h1>

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

        {error && (
          <p className="expense-form-error">
            {error.data?.errors?.to_user_id?.[0] ?? error.data?.message ?? 'Could not save settlement.'}
          </p>
        )}

        {!isOnline && (
          <p className="expense-form-offline-note">
            {isEditing
              ? "You're offline — editing requires an internet connection."
              : "You're offline — this settlement will be saved and synced automatically once you're back online."}
          </p>
        )}

        <button
          type="submit"
          className="expense-form-submit"
          disabled={isCreating || isUpdating || recipients.length === 0 || (isEditing && !isOnline)}
        >
          {isEditing ? 'Save changes' : 'Add settlement'}
        </button>

        {isEditing && (
          <button type="button" className="expense-form-delete" onClick={handleDelete} disabled={!isOnline}>
            Delete settlement
          </button>
        )}
      </form>
    </div>
  )
}
