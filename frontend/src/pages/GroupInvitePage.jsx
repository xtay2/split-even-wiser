import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useSelector } from 'react-redux'
import { useGetInvitePreviewQuery, useAcceptInviteMutation } from '../api/groupsApi'
import { selectIsAuthenticated } from '../features/auth/authSlice'
import { setPendingInvite } from '../utils/pendingInvite'
import './LoginPage.css'

export default function GroupInvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const { data: preview, isLoading: isLoadingPreview, error: previewError } = useGetInvitePreviewQuery(token)
  const [acceptInvite, { isLoading: isAccepting, error: acceptError }] = useAcceptInviteMutation()
  const hasRequestedAccept = useRef(false)

  useEffect(() => {
    // Guards against firing twice - React StrictMode double-invokes effects in dev, and this one
    // triggers a real mutation rather than an idempotent read.
    if (isAuthenticated && preview && !hasRequestedAccept.current) {
      hasRequestedAccept.current = true
      acceptInvite(token)
        .unwrap()
        .then((group) => navigate(`/groups/${group.id}`, { replace: true }))
        .catch(() => {
          hasRequestedAccept.current = false
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, preview, token])

  function handleLogin() {
    setPendingInvite(token)
    navigate('/login')
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <p className="login-eyebrow">Split Even Wiser</p>

        {isLoadingPreview && <h1 className="login-title">Loading invite…</h1>}

        {previewError && (
          <>
            <h1 className="login-title">This link didn't work.</h1>
            <p className="login-error">This invite link is invalid or has expired.</p>
          </>
        )}

        {preview && (
          <>
            <h1 className="login-title">You've been invited to join "{preview.group.name}"</h1>
            {isAuthenticated ? (
              <>
                <p className="login-label">{isAccepting ? 'Joining…' : 'Taking you there…'}</p>
                {acceptError && (
                  <p className="login-error">Could not join this group. Please try again.</p>
                )}
              </>
            ) : (
              <button type="button" className="login-submit" onClick={handleLogin}>
                Log in or sign up to join
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
