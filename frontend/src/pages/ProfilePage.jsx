import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router'
import {
  useGetMeQuery,
  useUpdateMeMutation,
  useUploadAvatarMutation,
  useLogoutMutation,
} from '../api/authApi'
import { loggedOut, selectCurrentUser, userUpdated } from '../features/auth/authSlice'
import { isPushSupported, usePushSubscription } from '../features/push/usePushSubscription'
import './ProfilePage.css'

const PUSH_STATUS_LABEL = {
  idle: 'Enable push notifications',
  subscribing: 'Enabling…',
  subscribed: 'Notifications enabled',
  denied: 'Notifications blocked — check your browser settings',
  error: 'Could not enable notifications',
}

export default function ProfilePage() {
  const cachedUser = useSelector(selectCurrentUser)
  const { data: user = cachedUser } = useGetMeQuery()
  const [updateMe, { isLoading: isSaving }] = useUpdateMeMutation()
  const [uploadAvatar, { isLoading: isUploading }] = useUploadAvatarMutation()
  const [logout] = useLogoutMutation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [username, setUsername] = useState(user?.username ?? '')
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)
  const { status: pushStatus, enable: enablePush } = usePushSubscription()

  if (!user) return null

  async function handleSaveUsername(event) {
    event.preventDefault()
    setError(null)
    try {
      const updated = await updateMe({ username }).unwrap()
      dispatch(userUpdated({ user: updated }))
      setEditing(false)
    } catch (err) {
      setError(err.data?.errors?.username?.[0] ?? 'Could not save username.')
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    const formData = new FormData()
    formData.append('avatar', file)
    try {
      const updated = await uploadAvatar(formData).unwrap()
      dispatch(userUpdated({ user: updated }))
    } catch (err) {
      setError(err.data?.errors?.avatar?.[0] ?? 'Could not upload photo.')
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
      </div>

      <dl className="profile-fields">
        <div className="profile-field">
          <dt>Username</dt>
          <dd>
            {editing ? (
              <form onSubmit={handleSaveUsername} className="profile-username-form">
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_.]+"
                  autoFocus
                  className="profile-input"
                />
                <button type="submit" disabled={isSaving} className="profile-save-btn">
                  Save
                </button>
                <button
                  type="button"
                  className="profile-cancel-btn"
                  onClick={() => {
                    setEditing(false)
                    setUsername(user.username)
                    setError(null)
                  }}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button type="button" className="profile-edit-btn" onClick={() => setEditing(true)}>
                @{user.username}
              </button>
            )}
            {error && <p className="profile-error">{error}</p>}
          </dd>
        </div>

        <div className="profile-field">
          <dt>Email</dt>
          <dd className="amount">{user.email}</dd>
        </div>
      </dl>

      {isPushSupported() && (
        <button
          type="button"
          className="profile-push-btn"
          onClick={enablePush}
          disabled={pushStatus === 'subscribing' || pushStatus === 'subscribed'}
        >
          {PUSH_STATUS_LABEL[pushStatus]}
        </button>
      )}

      <button type="button" className="profile-logout-btn" onClick={handleLogout}>
        Log out
      </button>
    </div>
  )
}
