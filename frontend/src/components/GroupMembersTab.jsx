import { useState } from 'react'
import { useAddGroupMemberMutation } from '../api/groupsApi'
import { useGetFriendsQuery } from '../api/friendsApi'

export default function GroupMembersTab({ hidden, groupId, group, isOnline }) {
  const { data: friends = [] } = useGetFriendsQuery()
  const [addMember, { isLoading: isAdding, error: addError }] = useAddGroupMemberMutation()

  const [memberIdentifier, setMemberIdentifier] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const membersById = Object.fromEntries(group.members.map((member) => [member.id, member]))
  const memberQuery = memberIdentifier.trim().toLowerCase()
  const friendSuggestions = memberQuery
    ? friends
        .filter(({ user }) => !membersById[user.id])
        .filter(
          ({ user }) =>
            user.username.toLowerCase().includes(memberQuery) || user.email.toLowerCase().includes(memberQuery),
        )
        .slice(0, 5)
    : []

  async function handleAddMember(event) {
    event.preventDefault()
    try {
      await addMember({ groupId, identifier: memberIdentifier }).unwrap()
      setMemberIdentifier('')
      setShowAddMember(false)
    } catch {
      // error surfaced below
    }
  }

  return (
    <section hidden={hidden}>
      <div className="groups-header groups-header--end">
        <button
          type="button"
          className="groups-new-btn"
          onClick={() => setShowAddMember((v) => !v)}
          disabled={!isOnline}
        >
          {showAddMember ? 'Cancel' : '+ Add member'}
        </button>
      </div>
      {!isOnline && <p className="expense-form-offline-note">Adding members requires an internet connection.</p>}
      {showAddMember && (
        <form onSubmit={handleAddMember} className="friends-add-form">
          <div className="member-suggest">
            <input
              value={memberIdentifier}
              onChange={(event) => {
                setMemberIdentifier(event.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="username or email"
              className="friends-add-input"
              autoComplete="off"
              required
            />
            {showSuggestions && friendSuggestions.length > 0 && (
              <ul className="member-suggest-list">
                {friendSuggestions.map(({ friendship_id, user }) => (
                  <li key={friendship_id}>
                    <button
                      type="button"
                      className="member-suggest-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setMemberIdentifier(user.username)
                        setShowSuggestions(false)
                      }}
                    >
                      <span className="member-suggest-item__name">@{user.username}</span>
                      <span className="member-suggest-item__email">{user.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="submit" className="friends-add-btn" disabled={isAdding || !memberIdentifier}>
            {isAdding ? '…' : 'Add'}
          </button>
        </form>
      )}
      {addError && <p className="friends-error">{addError.data?.errors?.identifier?.[0] ?? 'Could not add member.'}</p>}
      <ul className="member-list">
        {group.members.map((member) => (
          <li key={member.id} className="member-chip">@{member.username}</li>
        ))}
      </ul>
    </section>
  )
}
