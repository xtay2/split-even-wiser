import './EditFieldDialog.css'

export default function EditFieldDialog({
  open,
  title,
  label,
  value,
  onChange,
  onSubmit,
  onCancel,
  error,
  hint,
  isSaving = false,
  submitLabel = 'Save',
  inputProps = {},
}) {
  if (!open) return null

  return (
    <div className="edit-field-dialog-overlay" onClick={onCancel}>
      <div
        className="edit-field-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-field-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="edit-field-dialog-title" className="edit-field-dialog__title">{title}</h2>
        <form onSubmit={onSubmit} className="edit-field-dialog__form">
          <label className="edit-field-dialog__label" htmlFor="edit-field-dialog-input">{label}</label>
          <input
            id="edit-field-dialog-input"
            value={value}
            onChange={onChange}
            autoFocus
            className="edit-field-dialog__input"
            {...inputProps}
          />
          {error && <p className="edit-field-dialog__error">{error}</p>}
          {hint && <p className="edit-field-dialog__hint">{hint}</p>}
          <div className="edit-field-dialog__actions">
            <button type="button" className="edit-field-dialog__cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="edit-field-dialog__save-btn" disabled={isSaving}>
              {isSaving ? '…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
