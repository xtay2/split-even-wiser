import {useCallback, useLayoutEffect, useRef, useState} from 'react'
import {Navigate, useNavigate, useParams} from 'react-router'
import {useSelector} from 'react-redux'
import {useLeaveGroupMutation} from '../api/groupsApi'
import {selectCurrentUser} from '../features/auth/authSlice'
import useOnlineStatus from '../features/offline/useOnlineStatus'
import useOfflineAwareGroup from '../features/offline/useOfflineAwareGroup'
import ConfirmDialog from '../components/ConfirmDialog'
import LoadingIndicator from '../components/LoadingIndicator'
import GroupPendingSyncBanner from '../components/GroupPendingSyncBanner'
import GroupBalancesTab from '../components/GroupBalancesTab'
import GroupPaymentsTab from '../components/GroupPaymentsTab'
import GroupMembersTab from '../components/GroupMembersTab'
import GroupActivityTab from '../components/GroupActivityTab'
import {LogoutIcon} from '../components/icons/LogoutIcon.tsx'
import {CompareArrowsIcon} from '../components/icons/CompareArrowsIcon.tsx'
import {GroupIcon} from '../components/icons/GroupIcon.tsx'
import {HistoryIcon} from '../components/icons/HistoryIcon.tsx'
import {personName} from '../utils/personName'
import {WifiOffIcon} from '../components/icons/WifiOffIcon.tsx'
import './GroupDetailPage.css'
import {ReceiptIcon} from "../components/icons/ReceiptIcon.tsx";

const TABS = [
    {key: 'balances', label: 'Balances', icon: <CompareArrowsIcon/>},
    {key: 'payments', label: 'Payments', icon: <ReceiptIcon/>},
    {key: 'members', label: 'Members', icon: <GroupIcon/>},
    {key: 'activity', label: 'Activity', icon: <HistoryIcon/>},
]

// Collapses the tab labels to icons once they no longer fit side by side. The width the
// labels needed is remembered, so widening the screen past it brings them back.
function useCollapseOnOverflow() {
    const [node, setNode] = useState(null)
    const [collapsed, setCollapsed] = useState(false)
    const labelWidth = useRef(0)

    const check = useCallback(() => {
        if (!node) return
        if (!collapsed && node.scrollWidth > node.clientWidth) {
            labelWidth.current = node.scrollWidth
            setCollapsed(true)
        } else if (collapsed && node.clientWidth >= labelWidth.current) {
            setCollapsed(false)
        }
    }, [node, collapsed])

    useLayoutEffect(() => {
        if (!node) return
        check()
        const observer = new ResizeObserver(check)
        observer.observe(node)
        return () => observer.disconnect()
    }, [node, check])

    return [setNode, collapsed]
}

export default function GroupDetailPage() {
    const {groupId} = useParams()
    const navigate = useNavigate()
    const currentUser = useSelector(selectCurrentUser)
    const isOnline = useOnlineStatus()

    const {group, error: groupError, isLocal, resolvedId} = useOfflineAwareGroup(groupId)
    const [leaveGroup, {isLoading: isLeaving, error: leaveError}] = useLeaveGroupMutation()

    const [activeTab, setActiveTab] = useState(null)
    const [tabsRef, tabsCollapsed] = useCollapseOnOverflow()
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

    // A group created offline has synced - move over to its real id.
    if (resolvedId) {
        return <Navigate to={`/groups/${resolvedId}`} replace/>
    }

    if (groupError?.status === 403 || groupError?.status === 404 || (isLocal && !group)) {
        return <Navigate to="/groups" replace/>
    }

    if (!group) {
        return isOnline ? <LoadingIndicator label="Loading group…"/> : (
            <p className="friends-empty">This group isn't available offline yet. Open it once while online to use it here.</p>
        )
    }

    const membersById = Object.fromEntries(group.members.map((member) => [member.id, member]))
    const nameFor = (userId) => personName(membersById[userId], currentUser.id)

    // Nobody to split with yet - land on Members instead of an empty Payments tab, until
    // the person picks a tab themselves.
    const hasOtherMembers = group.members.length > 1
    const isLastMember = group.members.length === 1
    const effectiveTab = activeTab ?? (hasOtherMembers ? 'payments' : 'members')

    async function handleLeave() {
        try {
            await leaveGroup({groupId, userId: currentUser.id}).unwrap()
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
                        <button
                            type="button"
                            className="group-detail-title group-detail-title-btn"
                            onClick={() => navigate(`/groups/${groupId}/edit`)}
                            disabled={isLocal}
                            title={isLocal ? 'Waiting to sync' : 'Edit group'}
                        >
                            {group.name}
                        </button>
                        {group.description && <p className="group-detail-description">{group.description}</p>}
                    </div>
                    <button
                        type="button"
                        className="group-leave-icon-btn"
                        onClick={() => setShowLeaveConfirm(true)}
                        disabled={isLeaving || !isOnline || isLocal}
                        aria-label={isOnline ? 'Leave group' : 'Leave group (no internet connection)'}
                        title={isOnline ? (isLocal ? 'Waiting to sync' : 'Leave group') : 'No internet connection'}
                    >
                        {isOnline ? <LogoutIcon/> : <WifiOffIcon/>}
                    </button>
                </div>
                {leaveError && (
                    <p className="friends-error group-leave-error">
                        {leaveError.data?.message ?? 'Could not leave the group.'}
                    </p>
                )}
            </header>

            <ConfirmDialog
                open={showLeaveConfirm}
                title="Leave group?"
                message={
                    isLastMember
                        ? `You're the last member of "${group.name}". Leaving will permanently delete this group and its entire history.`
                        : `You'll lose access to "${group.name}" until someone adds you back.`
                }
                confirmLabel="Leave group"
                danger
                isConfirming={isLeaving}
                onConfirm={handleLeave}
                onCancel={() => setShowLeaveConfirm(false)}
            />

            <nav ref={tabsRef} className={`group-tabs${tabsCollapsed ? ' is-collapsed' : ''}`}>
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        className={`group-tabs__item${effectiveTab === tab.key ? ' is-active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                        aria-label={tab.label}
                        title={tabsCollapsed ? tab.label : undefined}
                    >
                        {tabsCollapsed ? tab.icon : tab.label}
                    </button>
                ))}
            </nav>

            <GroupPendingSyncBanner groupId={groupId}/>

            <GroupBalancesTab
                hidden={effectiveTab !== 'balances'}
                groupId={groupId}
                currentUser={currentUser}
                nameFor={nameFor}
                membersById={membersById}
            />
            <GroupPaymentsTab
                hidden={effectiveTab !== 'payments'}
                groupId={groupId}
                currentUser={currentUser}
                nameFor={nameFor}
            />
            <GroupMembersTab
                hidden={effectiveTab !== 'members'}
                groupId={groupId}
                group={group}
                currentUser={currentUser}
                isOnline={isOnline}
                isLocal={isLocal}
            />
            <GroupActivityTab hidden={effectiveTab !== 'activity'} groupId={groupId} currentUserId={currentUser.id}/>
        </div>
    )
}
