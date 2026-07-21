import {useEffect, useRef, useState} from 'react'
import { useAddGroupMemberMutation } from '../api/groupsApi'
import { useGetFriendsQuery } from '../api/friendsApi'
import { GroupAddIcon } from './icons/GroupAddIcon'
import { personName } from '../utils/personName'
import ClaimPlaceholderDialog from './ClaimPlaceholderDialog'

export default function GroupMembersTab({ hidden, groupId, group, currentUser, isOnline }) {
  const { data: friends = [] } = useGetFriendsQuery()
  const [addMember, { isLoading: isAdding, error: addError }] = useAddGroupMemberMutation()
  const [claimingMember, setClaimingMember] = useState(null)
  const memberInputRef = useRef(null);
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
            user.username.toLowerCase().includes(memberQuery) ||
            (user.email ?? '').toLowerCase().includes(memberQuery),
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

  useEffect(() => {
    if(showAddMember)
      memberInputRef.current?.focus();
  }, [memberInputRef, showAddMember]);

  return (
    <section hidden={hidden} className="members-section">
      {!isOnline && <p className="expense-form-offline-note">Adding members requires an internet connection.</p>}
      {showAddMember && (
        <form onSubmit={handleAddMember} className="friends-add-form">
          <div className="member-suggest">
            <input
              ref={memberInputRef}
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
                      <span className="member-suggest-item__name">{personName(user)}</span>
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
          <li key={member.id} className={`member-row${member.is_placeholder ? ' member-row--placeholder' : ''}`}>
            <span className="member-row__avatar">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" />
              ) : (
                (member.display_name || member.username).slice(0, 2).toUpperCase()
              )}
            </span>
            <span className="member-row__name">
              {personName(member, currentUser.id)}
              {member.is_placeholder && <span className="member-badge">Placeholder</span>}
            </span>
            {member.is_placeholder && member.id !== currentUser.id && (
              <button
                type="button"
                className="member-row__claim-btn"
                onClick={() => setClaimingMember(member)}
                disabled={!isOnline}
              >
                That's me
              </button>
            )}
          </li>
        ))}
      </ul>

      <ClaimPlaceholderDialog
        member={claimingMember}
        groupId={groupId}
        onClose={() => setClaimingMember(null)}
      />

      <div className="group-fab-column">
        <button
          type="button"
          className="group-fab group-fab--right"
          onClick={() => {
            setShowAddMember((v) => !v);
          }}
          disabled={!isOnline}
        >
          {showAddMember ? (
            'Cancel'
          ) : (
            <>
              <GroupAddIcon fontSizePx={20} />
              Add member
            </>
          )}
        </button>
      </div>
    </section>
  )
}
