import { useEffect, useState } from 'react'
import { useCreateInviteLinkMutation } from '../api/groupsApi'
import { cls } from '../utils/css.ts'
import './ConfirmDialog.css'
import './GroupInviteLinkDialog.css'

const EXPIRY_OPTIONS = [
  { value: 'never', label: 'Never' },
  { value: '15_minutes', label: '15 Minutes' },
  { value: '1_day', label: '1 Day' },
  { value: '1_week', label: '1 Week' },
  { value: '3_months', label: '3 Months' },
  { value: '1_year', label: '1 Year' },
]

export default function GroupInviteLinkDialog({ open, groupId, groupName, onClose }) {
  const [createInviteLink, { data, isLoading, error }] = useCreateInviteLinkMutation()
  const [expiresIn, setExpiresIn] = useState('never')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      setExpiresIn('never')
      setCopied(false)
      createInviteLink({ groupId, expiresIn: 'never' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groupId])

  if (!open) return null

  function handleExpiryChange(event) {
    const value = event.target.value
    setExpiresIn(value)
    setCopied(false)
    createInviteLink({ groupId, expiresIn: value })
  }

  async function handleCopy() {
    if (!data?.url) return
    try {
      await navigator.clipboard.writeText(data.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard access denied; nothing to fall back to
    }
  }

  async function handleShare() {
    if (!data?.url) return
    try {
      await navigator.share({ title: `Join ${groupName}`, url: data.url })
    } catch {
      // share sheet dismissed or unsupported mid-call; nothing to do
    }
  }

  return (
    <div className="confirm-dialog-overlay" onClick={onClose}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-link-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="invite-link-title" className="confirm-dialog__title">Invitation Link</h2>
        <p className="confirm-dialog__message">
          Anyone with this link can join "{groupName}". People without an account will be guided
          through creating one first.
        </p>

        <label className="invite-link-field">
          Expires
          <select
            value={expiresIn}
            onChange={handleExpiryChange}
            className="invite-link-select"
            disabled={isLoading}
          >
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        {error && <p className="add-placeholder-error">Could not generate an invite link.</p>}

        <input
          type="text"
          readOnly
          value={isLoading ? 'Generating…' : (data?.url ?? '')}
          className="invite-link-input"
          onFocus={(event) => event.target.select()}
        />

        <div className="invite-link-actions">
          <button
            type="button"
            className={cls('invite-link-copy-btn', copied && 'invite-link-copy-btn--copied')}
            onClick={handleCopy}
            disabled={!data?.url}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          {typeof navigator.share === 'function' && (
            <button
              type="button"
              className="invite-link-share-btn"
              onClick={handleShare}
              disabled={!data?.url}
            >
              Share
            </button>
          )}
        </div>

        <div className="confirm-dialog__actions">
          <button type="button" className="confirm-dialog__cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
