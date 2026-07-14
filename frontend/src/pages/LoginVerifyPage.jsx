import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useDispatch } from 'react-redux'
import { useVerifyLoginTokenMutation } from '../api/authApi'
import { credentialsReceived } from '../features/auth/authSlice'
import './LoginPage.css'

export default function LoginVerifyPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const token = searchParams.get('token') ?? ''
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [verify, { isLoading, error }] = useVerifyLoginTokenMutation()
  const [needsUsername, setNeedsUsername] = useState(false)
  const [username, setUsername] = useState('')

  async function attemptVerify(withUsername) {
    try {
      const result = await verify({ email, token, username: withUsername }).unwrap()
      dispatch(credentialsReceived(result))
      navigate('/groups', { replace: true })
    } catch (err) {
      if (err.data?.errors?.username) {
        setNeedsUsername(true)
      }
    }
  }

  useEffect(() => {
    if (email && token) {
      attemptVerify(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, token])

  if (!email || !token) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <p className="login-error">This login link looks incomplete. Please request a new one.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <p className="login-eyebrow">Split Even Wiser</p>

        {needsUsername ? (
          <>
            <h1 className="login-title">Pick a username</h1>
            <form
              className="login-form"
              onSubmit={(event) => {
                event.preventDefault()
                attemptVerify(username)
              }}
            >
              <label htmlFor="username" className="login-label">Username</label>
              <input
                id="username"
                autoFocus
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_.]+"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="login-input"
              />
              {error && (
                <p className="login-error">
                  {error.data?.errors?.username?.[0] ?? error.data?.message}
                </p>
              )}
              <button type="submit" className="login-submit" disabled={isLoading || !username}>
                {isLoading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          </>
        ) : (
          <h1 className="login-title">
            {error ? 'That link didn’t work.' : 'Logging you in…'}
          </h1>
        )}

        {error && !needsUsername && (
          <p className="login-error">
            {error.data?.errors?.token?.[0] ?? error.data?.message ?? 'Please request a new login link.'}
          </p>
        )}
      </div>
    </div>
  )
}
