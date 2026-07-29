import { useEffect, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router'
import { useGetGroupQuery, useUpdateGroupMutation } from '../api/groupsApi'
import useOnlineStatus from '../features/offline/useOnlineStatus'
import './GroupEditPage.css'

export default function GroupEditPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()

  const { data: group, error: groupError } = useGetGroupQuery(groupId)
  const [updateGroup, { isLoading: isSaving, error: saveError }] = useUpdateGroupMutation()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (group) {
      setName(group.name)
      setDescription(group.description ?? '')
    }
  }, [group])

  if (groupError?.status === 403 || groupError?.status === 404) {
    return <Navigate to="/groups" replace />
  }

  if (!group) {
    return isOnline ? null : (
      <p className="expense-form-offline-note">
        This group isn't available offline yet. Open it once while online to use it here.
      </p>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      await updateGroup({ groupId, name, description: description || null }).unwrap()
      navigate(`/groups/${groupId}`)
    } catch {
      // error surfaced below
    }
  }

  return (
    <div className="expense-form-screen">
      <h1 className="expense-form-title">Edit group</h1>

      <form onSubmit={handleSubmit} className="expense-form">
        <label className="expense-form-label">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoFocus
            className="expense-form-input"
          />
        </label>

        <label className="expense-form-label">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description (optional)"
            className="expense-form-input group-edit-textarea"
            rows={4}
          />
        </label>

        {saveError && (
          <p className="expense-form-error">{saveError.data?.message ?? 'Could not save group.'}</p>
        )}

        {!isOnline && (
          <p className="expense-form-offline-note">
            You're offline - editing a group requires an internet connection.
          </p>
        )}

        <button
          type="submit"
          className="expense-form-submit"
          disabled={isSaving || !name || !isOnline}
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>

        <button type="button" className="group-edit-cancel" onClick={() => navigate(`/groups/${groupId}`)}>
          Cancel
        </button>
      </form>
    </div>
  )
}
