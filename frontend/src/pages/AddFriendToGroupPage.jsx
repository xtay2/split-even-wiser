import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { useGetFriendsQuery } from '../api/friendsApi'
import { useGetGroupsQuery, useAddGroupMemberMutation } from '../api/groupsApi'
import './AddFriendToGroupPage.css'

export default function AddFriendToGroupPage() {
  const { friendshipId } = useParams()
  const { data: friends = [], isLoading: friendsLoading } = useGetFriendsQuery()
  const { data: groups = [], isLoading: groupsLoading } = useGetGroupsQuery()
  const [addMember] = useAddGroupMemberMutation()
  const [status, setStatus] = useState({}) // groupId -> 'adding' | 'added' | error message

  const friend = friends.find((entry) => String(entry.friendship_id) === friendshipId)

  async function handleAdd(groupId) {
    if (!friend) return
    setStatus((prev) => ({ ...prev, [groupId]: 'adding' }))
    try {
      await addMember({ groupId, identifier: friend.user.username }).unwrap()
      setStatus((prev) => ({ ...prev, [groupId]: 'added' }))
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        [groupId]: error.data?.errors?.identifier?.[0] ?? error.data?.message ?? 'Could not add.',
      }))
    }
  }

  if (friendsLoading || groupsLoading) {
    return <p className="friends-empty">Loading…</p>
  }

  if (!friend) {
    return <p className="friends-empty">This friend couldn't be found.</p>
  }

  return (
    <div className="add-to-group-screen">
      <Link to="/friends" className="add-to-group-back">
        ← Back to friends
      </Link>
      <h1 className="add-to-group-title">Add @{friend.user.username} to a group</h1>

      {groups.length === 0 ? (
        <p className="friends-empty">You're not in any groups yet.</p>
      ) : (
        <ul className="add-to-group-list">
          {groups.map((group) => {
            const state = status[group.id]
            const isAdded = state === 'added'
            const isAdding = state === 'adding'
            const errorMessage = state && !isAdded && !isAdding ? state : null

            return (
              <li key={group.id} className="add-to-group-item">
                <button
                  type="button"
                  className="add-to-group-card"
                  onClick={() => handleAdd(group.id)}
                  disabled={isAdding || isAdded}
                >
                  <span className="add-to-group-card__name">{group.name}</span>
                  <span className="add-to-group-card__status">
                    {isAdded ? 'Added ✓' : isAdding ? 'Adding…' : 'Add'}
                  </span>
                </button>
                {errorMessage && <p className="friends-error">{errorMessage}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
