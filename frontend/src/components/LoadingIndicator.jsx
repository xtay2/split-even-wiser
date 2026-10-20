import './LoadingIndicator.css'

export default function LoadingIndicator({ label = 'Loading…' }) {
  return (
    <div className="loading-indicator" role="status">
      <span className="spinner-border spinner-border-sm loading-indicator__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
