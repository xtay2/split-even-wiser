import { useState } from 'react'
import { Link } from 'react-router'
import { useRequestLoginTokenMutation } from '../api/authApi'
import './LoginPage.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [requestLoginToken, { isLoading, error }] = useRequestLoginTokenMutation()

  async function handleSubmit(event) {
    event.preventDefault()
    await requestLoginToken(email).unwrap().catch(() => {})
    setSent(true)
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <p className="login-eyebrow">Split Even Wiser</p>
        <h1 className="login-title">No passwords.<br />Just your inbox.</h1>

        {sent ? (
          <div className="login-sent">
            <p>
              If <strong>{email}</strong> has an account (or doesn't yet - we'll help you make
              one), a login link is on its way.
            </p>
            <button type="button" className="login-link-btn" onClick={() => setSent(false)}>
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="email" className="login-label">Email address</label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="login-input"
            />
            {error && (
              <p className="login-error">
                {error.data?.message ?? 'Something went wrong. Please try again.'}
              </p>
            )}
            <button type="submit" className="login-submit" disabled={isLoading || !email}>
              {isLoading ? 'Sending…' : 'Send me a login link'}
            </button>
          </form>
        )}

        <Link to="/imprint" className="login-imprint-link">Imprint</Link>
      </div>
    </div>
  )
}
