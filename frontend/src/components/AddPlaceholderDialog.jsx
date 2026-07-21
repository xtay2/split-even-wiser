import { useEffect, useRef, useState } from 'react'
import { useAddPlaceholderMemberMutation } from '../api/groupsApi'
import './ConfirmDialog.css'
import './AddPlaceholderDialog.css'

export default function AddPlaceholderDialog({ open, groupId, onAdded, onCancel }) {
  const [addPlaceholder, { isLoading, error }] = useAddPlaceholderMemberMutation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const nameInputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setName('')
      setEmail('')
      nameInputRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  const canSubmit = Boolean(name.trim() || email.trim())

  async function handleSubmit() {
    if (!canSubmit) return
    try {
      const result = await addPlaceholder({
        groupId,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      }).unwrap()
      onAdded(result.placeholder)
    } catch {
      // error surfaced below
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
          {error && (
            <p className="add-placeholder-error">
              {error.data?.errors?.email?.[0] ?? error.data?.errors?.name?.[0] ?? error.data?.message ?? 'Could not add.'}
            </p>
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
