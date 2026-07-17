import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useDispatch } from 'react-redux'
import { useConfirmEmailChangeMutation } from '../api/authApi'
import { userUpdated } from '../features/auth/authSlice'
import './LoginPage.css'

export default function EmailChangeVerifyPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const token = searchParams.get('token') ?? ''
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const attempted = useRef(false)

  const [confirmEmailChange, { error, isSuccess }] = useConfirmEmailChangeMutation()

  useEffect(() => {
    if (!email || !token || attempted.current) return
    attempted.current = true

    confirmEmailChange({ email, token })
      .unwrap()
      .then((user) => {
        dispatch(userUpdated({ user }))
        setTimeout(() => navigate('/profile', { replace: true }), 1500)
      })
      .catch(() => {})
  }, [email, token, confirmEmailChange, dispatch, navigate])

  if (!email || !token) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <p className="login-error">This confirmation link looks incomplete. Please request a new one.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <p className="login-eyebrow">Split Even Wiser</p>

        <h1 className="login-title">
          {isSuccess ? 'Email updated!' : error ? 'That link didn’t work.' : 'Confirming…'}
        </h1>

        {error && (
          <p className="login-error">
            {error.data?.errors?.token?.[0] ?? error.data?.errors?.email?.[0] ?? error.data?.message ?? 'Please request a new confirmation link.'}
          </p>
        )}
      </div>
    </div>
  )
}
