import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useAddPlaceholderMemberMutation } from '../api/groupsApi'
import useOnlineStatus from '../features/offline/useOnlineStatus'
import { placeholderMemberFromItem, queueOfflinePlaceholder } from '../features/offline/offlineQueueSlice'
import './ConfirmDialog.css'
import './AddPlaceholderDialog.css'

// Checks the server would otherwise do, so a placeholder queued offline isn't rejected on sync.
function offlineValidationError(members, name, email) {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address.'
  }
  const displayName = (name || email.split('@')[0]).toLowerCase()
  if (members.some((member) => member.is_placeholder && (member.display_name ?? '').toLowerCase() === displayName)) {
    return 'This group already has a placeholder with that name.'
  }
  return null
}

export default function AddPlaceholderDialog({ open, groupId, members = [], onAdded, onCancel }) {
  const dispatch = useDispatch()
  const isOnline = useOnlineStatus()
  const [addPlaceholder, { isLoading, error: serverError }] = useAddPlaceholderMemberMutation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [offlineError, setOfflineError] = useState(null)
  const nameInputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setName('')
      setEmail('')
      setOfflineError(null)
      nameInputRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  const canSubmit = Boolean(name.trim() || email.trim())

  // Offline the placeholder is queued and handed back with a local id; any expense/settlement
  // using it is synced after it, with the real id patched in.
  function queuePlaceholder(payload) {
    const validationError = offlineValidationError(members, payload.name, payload.email)
    if (validationError) {
      setOfflineError(validationError)
      return
    }
    const action = queueOfflinePlaceholder({ groupId, ...payload })
    dispatch(action)
    onAdded(placeholderMemberFromItem(action.payload))
  }

  async function handleSubmit() {
    if (!canSubmit) return
    const payload = { name: name.trim() || undefined, email: email.trim() || undefined }

    if (!isOnline) {
      queuePlaceholder(payload)
      return
    }

    try {
      const result = await addPlaceholder({ groupId, ...payload }).unwrap()
      onAdded(result.placeholder)
    } catch (submitError) {
      if (submitError?.status === 'FETCH_ERROR') {
        queuePlaceholder(payload)
      }
      // validation error surfaced below
    }
  }

  function handleKeyDown(event) {
    // This dialog is nested inside the expense/settlement <form>, so it can't be a <form>
    // itself (HTML forbids nested forms) - reproduce Enter-to-submit by hand instead.
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-placeholder-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="add-placeholder-title" className="confirm-dialog__title">Someone else</h2>
        <p className="confirm-dialog__message">
          Add a person who isn't in the group yet. They'll show up like any other member.
        </p>
        <div className="add-placeholder-form">
          <label className="add-placeholder-field">
            Name
            <input
              ref={nameInputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Jordan"
              className="add-placeholder-input"
            />
          </label>
          <label className="add-placeholder-field">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="jordan@example.com"
              className="add-placeholder-input"
            />
          </label>
          {offlineError ? (
            <p className="add-placeholder-error">{offlineError}</p>
          ) : (
            serverError && (
              <p className="add-placeholder-error">
                {serverError.data?.errors?.email?.[0] ?? serverError.data?.errors?.name?.[0] ?? serverError.data?.message ?? 'Could not add.'}
              </p>
            )
          )}
          <div className="confirm-dialog__actions">
            <button type="button" className="confirm-dialog__cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="confirm-dialog__confirm-btn"
              onClick={handleSubmit}
              disabled={isLoading || !canSubmit}
            >
              {isLoading ? '…' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
