import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router'
import {
  useGetMeQuery,
  useUpdateMeMutation,
  useUploadAvatarMutation,
  useRequestEmailChangeMutation,
  useLogoutMutation,
} from '../api/authApi'
import { loggedOut, selectCurrentUser, userUpdated } from '../features/auth/authSlice'
import { isPushSupported, usePushSubscription } from '../features/push/usePushSubscription'
import EditFieldDialog from '../components/EditFieldDialog'
import './ProfilePage.css'

const PUSH_STATUS_LABEL = {
  checking: 'Checking…',
  idle: 'Enable push notifications',
  subscribing: 'Enabling…',
  subscribed: 'Notifications enabled',
  denied: 'Notifications blocked - check your browser settings',
  error: 'Could not enable notifications',
}

export default function ProfilePage() {
  const cachedUser = useSelector(selectCurrentUser)
  const { data: user = cachedUser } = useGetMeQuery()
  const [updateMe, { isLoading: isSaving }] = useUpdateMeMutation()
  const [uploadAvatar, { isLoading: isUploading }] = useUploadAvatarMutation()
  const [requestEmailChange, { isLoading: isSendingEmailChange }] = useRequestEmailChangeMutation()
  const [logout] = useLogoutMutation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false)
  const [username, setUsername] = useState(user?.username ?? '')
  const [usernameError, setUsernameError] = useState(null)

  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [email, setEmail] = useState(user?.email ?? '')
  const [emailError, setEmailError] = useState(null)
  const [pendingEmail, setPendingEmail] = useState(null)

  const [avatarError, setAvatarError] = useState(null)

  const { status: pushStatus, enable: enablePush } = usePushSubscription()

  if (!user) return null

  function openUsernameDialog() {
    setUsername(user.username)
    setUsernameError(null)
    setUsernameDialogOpen(true)
  }

  function openEmailDialog() {
    setEmail(user.email)
    setEmailError(null)
    setEmailDialogOpen(true)
  }

  async function handleSaveUsername(event) {
    event.preventDefault()
    setUsernameError(null)
    try {
      const updated = await updateMe({ username }).unwrap()
      dispatch(userUpdated({ user: updated }))
      setUsernameDialogOpen(false)
    } catch (err) {
      setUsernameError(err.data?.errors?.username?.[0] ?? 'Could not save username.')
    }
  }

  async function handleRequestEmailChange(event) {
    event.preventDefault()
    setEmailError(null)
    try {
      await requestEmailChange(email).unwrap()
      setPendingEmail(email)
      setEmailDialogOpen(false)
    } catch (err) {
      setEmailError(err.data?.errors?.email?.[0] ?? 'Could not send confirmation email.')
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setAvatarError(null)
    const formData = new FormData()
    formData.append('avatar', file)
    try {
      const updated = await uploadAvatar(formData).unwrap()
      dispatch(userUpdated({ user: updated }))
    } catch (err) {
      setAvatarError(err.data?.errors?.avatar?.[0] ?? 'Could not upload photo.')
    } finally {
      event.target.value = ''
    }
  }

  async function handleLogout() {
    await logout().catch(() => {})
    dispatch(loggedOut())
    navigate('/login', { replace: true })
  }

  return (
    <div className="profile-screen">
      <div className="profile-avatar-block">
        <button
          type="button"
          className="profile-avatar"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-label="Change avatar"
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" />
          ) : (
            <span>{user.username.slice(0, 2).toUpperCase()}</span>
          )}
          <span className="profile-avatar__edit">{isUploading ? '…' : 'Edit'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          hidden
        />
        {avatarError && <p className="profile-error">{avatarError}</p>}
      </div>

      <dl className="profile-fields">
        <div className="profile-field">
          <dt>Username</dt>
          <dd>
            <button type="button" className="profile-edit-btn" onClick={openUsernameDialog}>
              @{user.username}
            </button>
          </dd>
        </div>

        <div className="profile-field">
          <dt>Email</dt>
          <dd>
            <button type="button" className="profile-edit-btn amount" onClick={openEmailDialog}>
              {user.email}
            </button>
            {pendingEmail && (
              <p className="profile-hint">
                Confirmation link sent to {pendingEmail} - check your inbox to finish the change.
              </p>
            )}
          </dd>
        </div>
      </dl>

      {isPushSupported() && (
        <button
          type="button"
          className="profile-push-btn"
          onClick={enablePush}
          disabled={
            pushStatus === 'checking' || pushStatus === 'subscribing' || pushStatus === 'subscribed'
          }
        >
          {PUSH_STATUS_LABEL[pushStatus]}
        </button>
      )}

      <button type="button" className="profile-logout-btn" onClick={handleLogout}>
        Log out
      </button>

      <Link to="/imprint" className="profile-imprint-link">Imprint</Link>

      <EditFieldDialog
        open={usernameDialogOpen}
        title="Change username"
        label="Username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        onSubmit={handleSaveUsername}
        onCancel={() => setUsernameDialogOpen(false)}
        error={usernameError}
        isSaving={isSaving}
        inputProps={{ minLength: 3, maxLength: 30, pattern: '[a-zA-Z0-9_.]+' }}
      />

      <EditFieldDialog
        open={emailDialogOpen}
        title="Change email"
        label="Email address"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        onSubmit={handleRequestEmailChange}
        onCancel={() => setEmailDialogOpen(false)}
        error={emailError}
        hint="We'll send a confirmation link to the new address before it takes effect."
        isSaving={isSendingEmailChange}
        submitLabel="Send link"
        inputProps={{ type: 'email' }}
      />
    </div>
  )
}
