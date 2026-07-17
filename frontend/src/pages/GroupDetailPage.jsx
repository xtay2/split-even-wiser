import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSelector } from 'react-redux'
import { useGetGroupQuery, useLeaveGroupMutation } from '../api/groupsApi'
import { selectCurrentUser } from '../features/auth/authSlice'
import useOnlineStatus from '../features/offline/useOnlineStatus'
import ConfirmDialog from '../components/ConfirmDialog'
import GroupPendingSyncBanner from '../components/GroupPendingSyncBanner'
import GroupBalancesTab from '../components/GroupBalancesTab'
import GroupExpensesTab from '../components/GroupExpensesTab'
import GroupMembersTab from '../components/GroupMembersTab'
import GroupActivityTab from '../components/GroupActivityTab'
import { LogoutIcon } from '../components/icons/LogoutIcon.tsx'
import './GroupDetailPage.css'

const TABS = [
  { key: 'balances', label: 'Balances' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'members', label: 'Members' },
  { key: 'activity', label: 'Activity' },
]

export default function GroupDetailPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const currentUser = useSelector(selectCurrentUser)
  const isOnline = useOnlineStatus()

  const { data: group } = useGetGroupQuery(groupId)
  const [leaveGroup, { isLoading: isLeaving, error: leaveError }] = useLeaveGroupMutation()

  const [activeTab, setActiveTab] = useState(null)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  if (!group) {
    return isOnline ? null : (
      <p className="friends-empty">This group isn't available offline yet. Open it once while online to use it here.</p>
    )
  }

  const membersById = Object.fromEntries(group.members.map((member) => [member.id, member]))
  const nameFor = (userId) => (userId === currentUser.id ? 'You' : `@${membersById[userId]?.username ?? '?'}`)

  // Nobody to split with yet — land on Members instead of an empty Expenses tab, until
  // the person picks a tab themselves.
  const hasOtherMembers = group.members.length > 1
  const effectiveTab = activeTab ?? (hasOtherMembers ? 'expenses' : 'members')

  async function handleLeave() {
    try {
      await leaveGroup({ groupId, userId: currentUser.id }).unwrap()
      navigate('/groups')
    } catch {
      setShowLeaveConfirm(false)
    }
  }

  return (
    <div className="group-detail-screen">
      <header className="group-detail-header">
        <div className="group-detail-header__row">
          <div className="group-detail-header__text">
            <h1 className="group-detail-title">{group.name}</h1>
            {group.description && <p className="group-detail-description">{group.description}</p>}
          </div>
          <button
            type="button"
            className="group-leave-icon-btn"
            onClick={() => setShowLeaveConfirm(true)}
            disabled={isLeaving || !isOnline}
            aria-label="Leave group"
            title="Leave group"
          >
            <LogoutIcon />
          </button>
        </div>
        {!isOnline && (
          <p className="friends-error group-leave-error">Leaving a group requires an internet connection.</p>
        )}
        {leaveError && (
          <p className="friends-error group-leave-error">
            {leaveError.data?.message ?? 'Could not leave the group.'}
          </p>
        )}
      </header>

      <ConfirmDialog
        open={showLeaveConfirm}
        title="Leave group?"
        message={`You'll lose access to "${group.name}" until someone adds you back.`}
        confirmLabel="Leave group"
        danger
        isConfirming={isLeaving}
        onConfirm={handleLeave}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      <nav className="group-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`group-tabs__item${effectiveTab === tab.key ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <GroupPendingSyncBanner groupId={groupId} />

      <GroupBalancesTab
        hidden={effectiveTab !== 'balances'}
        groupId={groupId}
        currentUser={currentUser}
        nameFor={nameFor}
      />
      <GroupExpensesTab
        hidden={effectiveTab !== 'expenses'}
        groupId={groupId}
        nameFor={nameFor}
        hasOtherMembers={hasOtherMembers}
      />
      <GroupMembersTab hidden={effectiveTab !== 'members'} groupId={groupId} group={group} isOnline={isOnline} />
      <GroupActivityTab hidden={effectiveTab !== 'activity'} groupId={groupId} currentUserId={currentUser.id} />
    </div>
  )
}
