import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { useGetGroupsQuery, useCreateGroupMutation } from '../api/groupsApi'
import useOnlineStatus from '../features/offline/useOnlineStatus'
import { queueOfflineGroup, selectQueueItems } from '../features/offline/offlineQueueSlice'
import LoadingIndicator from '../components/LoadingIndicator'
import { GroupIcon } from '../components/icons/GroupIcon.tsx'
import './GroupsPage.css'

export default function GroupsPage() {
  const { data: serverGroups = [], isLoading } = useGetGroupsQuery()
  const [createGroup, { isLoading: isCreating, error }] = useCreateGroupMutation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const isOnline = useOnlineStatus()
  const queueItems = useSelector(selectQueueItems)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Groups created offline are listed until they've synced and show up in the server's list.
  const localGroups = queueItems
    .filter((item) => item.type === 'group')
    .map((item) => ({
      id: item.groupId,
      name: item.payload.name,
      description: item.payload.description,
      isLocal: true,
      syncFailed: item.status === 'error',
    }))
  const groups = [...serverGroups, ...localGroups]

  function queueGroup(payload) {
    const action = queueOfflineGroup(payload)
    dispatch(action)
    navigate(`/groups/${action.payload.groupId}`)
  }

  async function handleCreate(event) {
    event.preventDefault()
    const payload = { name, description: description || undefined }

    if (!isOnline) {
      queueGroup(payload)
      return
    }

    try {
      const group = await createGroup(payload).unwrap()
      navigate(`/groups/${group.id}`)
    } catch (createError) {
      if (createError?.status === 'FETCH_ERROR') {
        // The browser thought it was online but the request didn't make it - fall back to
        // queueing rather than losing what the user entered.
        queueGroup(payload)
      }
      // validation error surfaced below
    }
  }

  return (
    <div className="groups-screen">
      <div className="groups-header">
        <h2 className="friends-section-title">Your groups</h2>
      </div>

      <div className="group-fab-column">
        <button type="button" className="group-fab" onClick={() => setShowForm((v) => !v)}>
          {showForm ? (
            'Cancel'
          ) : (
            <>
              <GroupIcon />
              New group
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="groups-new-form">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Group name"
            className="groups-new-input"
            required
            autoFocus
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description (optional)"
            className="groups-new-textarea"
            rows={2}
          />
          {error && <p className="friends-error">{error.data?.message ?? 'Could not create group.'}</p>}
          <button type="submit" className="groups-new-submit" disabled={isCreating || !name}>
            {isCreating ? 'Creating…' : 'Create group'}
          </button>
        </form>
      )}

      {isLoading && localGroups.length === 0 ? (
        <LoadingIndicator label="Loading groups…" />
      ) : groups.length === 0 ? (
        <p className="friends-empty">No groups yet - create one to start splitting costs.</p>
      ) : (
        <ul className="groups-list">
          {groups.map((group) => (
            <li key={group.id}>
              <Link to={`/groups/${group.id}`} className="groups-card">
                <span className="groups-card__name">{group.name}</span>
                {group.isLocal && (
                  <span className="groups-card__pending">
                    {group.syncFailed ? "Couldn't sync - open to retry" : 'Waiting to sync…'}
                  </span>
                )}
                {group.description && (
                  <span className="groups-card__description">{group.description}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
