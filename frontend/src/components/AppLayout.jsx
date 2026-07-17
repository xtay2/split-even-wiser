import { NavLink, Outlet } from 'react-router'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '../features/auth/authSlice'
import useOnlineStatus from '../features/offline/useOnlineStatus'
import useOfflineSync from '../features/offline/useOfflineSync'
import { selectPendingQueueCount } from '../features/offline/offlineQueueSlice'
import './AppLayout.css'
import {GroupIcon} from "./icons/GroupIcon.tsx";
import {AccountBoxIcon} from "./icons/AccountBoxIcon.tsx";
import {HandshakeIcon} from "./icons/HandshakeIcon.tsx";

const NAV_ITEMS = [
  { to: '/groups', label: 'Groups', icon: <GroupIcon/> },
  { to: '/friends', label: 'Friends', icon: <HandshakeIcon/> },
  { to: '/profile', label: 'Profile', icon: <AccountBoxIcon/> },
]

export default function AppLayout() {
  const user = useSelector(selectCurrentUser)
  const isOnline = useOnlineStatus()
  const pendingCount = useSelector(selectPendingQueueCount)
  useOfflineSync()

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <span className="app-topbar__brand">Split Even Wiser</span>
        {user && <span className="app-topbar__user">@{user.username}</span>}
      </header>

      {!isOnline && (
        <div className="app-offline-banner">
          You're offline. Payments you add now will sync automatically once you're back online.
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="app-offline-banner app-offline-banner--syncing">
          Syncing {pendingCount} pending {pendingCount === 1 ? 'item' : 'items'}…
        </div>
      )}

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="app-bottomnav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `app-bottomnav__item${isActive ? ' is-active' : ''}`}
          >
            <span className="app-bottomnav__icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
