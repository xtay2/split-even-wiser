import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useDispatch } from 'react-redux'
import { useRequestLoginTokenMutation, useVerifyLoginTokenMutation } from '../api/authApi'
import { credentialsReceived } from '../features/auth/authSlice'
import { consumePendingInvite } from '../utils/pendingInvite'
import './LoginPage.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [requestLoginToken, { isLoading, error }] = useRequestLoginTokenMutation()

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [verify, { isLoading: verifying, error: codeError }] = useVerifyLoginTokenMutation()
  const [code, setCode] = useState('')
  const [needsUsername, setNeedsUsername] = useState(false)
  const [username, setUsername] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    await requestLoginToken(email).unwrap().catch(() => {})
    setSent(true)
  }

  async function handleCodeSubmit(event) {
    event.preventDefault()
    try {
      const result = await verify({ email, code, username: needsUsername ? username : undefined }).unwrap()
      dispatch(credentialsReceived(result))
      const pendingInvite = consumePendingInvite()
      navigate(pendingInvite ? `/invite/${pendingInvite}` : '/groups', { replace: true })
    } catch (err) {
      if (err.data?.errors?.username) {
        setNeedsUsername(true)
      }
    }
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

            <form onSubmit={handleCodeSubmit} className="login-form login-code-form">
              <label htmlFor="code" className="login-label">
                The login link opens in your browser instead of this app? Enter the code from the email instead:
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="login-input login-code-input"
              />
              {needsUsername && (
                <>
                  <label htmlFor="code-username" className="login-label">Pick a username</label>
                  <input
                    id="code-username"
                    autoFocus
                    required
                    minLength={3}
                    maxLength={30}
                    pattern="[a-zA-Z0-9_.]+"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="login-input"
                  />
                </>
              )}
              {codeError && (
                <p className="login-error">
                  {codeError.data?.errors?.username?.[0]
                    ?? codeError.data?.errors?.token?.[0]
                    ?? codeError.data?.message}
                </p>
              )}
              <button
                type="submit"
                className="login-submit"
                disabled={verifying || code.length !== 6 || (needsUsername && !username)}
              >
                {verifying ? 'Logging in…' : 'Log in with code'}
              </button>
            </form>

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
