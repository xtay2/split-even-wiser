import { useState } from 'react'
import { Link } from 'react-router'
import { useGetGroupsQuery, useCreateGroupMutation } from '../api/groupsApi'
import './GroupsPage.css'

export default function GroupsPage() {
  const { data: groups = [], isLoading } = useGetGroupsQuery()
  const [createGroup, { isLoading: isCreating, error }] = useCreateGroupMutation()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  async function handleCreate(event) {
    event.preventDefault()
    try {
      await createGroup({ name, description: description || undefined }).unwrap()
      setName('')
      setDescription('')
      setShowForm(false)
    } catch {
      // error surfaced below
    }
  }

  return (
    <div className="groups-screen">
      <div className="groups-header">
        <h2 className="friends-section-title">Your groups</h2>
        <button type="button" className="groups-new-btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ New group'}
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

      {isLoading ? (
        <p className="friends-empty">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="friends-empty">No groups yet — create one to start splitting costs.</p>
      ) : (
        <ul className="groups-list">
          {groups.map((group) => (
            <li key={group.id}>
              <Link to={`/groups/${group.id}`} className="groups-card">
                <span className="groups-card__name">{group.name}</span>
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
