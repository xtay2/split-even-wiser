import {useState} from 'react'
import {NavLink, Outlet} from 'react-router'
import {useSelector} from 'react-redux'
import {selectCurrentUser} from '../features/auth/authSlice'
import useOnlineStatus from '../features/offline/useOnlineStatus'
import useOfflineSync from '../features/offline/useOfflineSync'
import {selectPendingQueueCount} from '../features/offline/offlineQueueSlice'
import './AppLayout.css'
import {GroupIcon} from "./icons/GroupIcon.tsx";
import {AccountBoxIcon} from "./icons/AccountBoxIcon.tsx";
import {HandshakeIcon} from "./icons/HandshakeIcon.tsx";
import {cls} from "../utils/css.ts";

const NAV_ITEMS = [
    {to: '/groups', label: 'Groups', icon: <GroupIcon/>},
    {to: '/friends', label: 'Friends', icon: <HandshakeIcon/>},
    {to: '/profile', label: 'Profile', icon: <AccountBoxIcon/>},
]

export default function AppLayout() {
    const user = useSelector(selectCurrentUser)
    const isOnline = useOnlineStatus()
    const pendingCount = useSelector(selectPendingQueueCount)
    useOfflineSync()

    const [copied, setCopied] = useState(null)

    async function copyToClipboard(value, key) {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(key)
            setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500)
        } catch {
            // clipboard access denied; nothing to fall back to
        }
    }

    return (
        <div className="app-shell">
            <header className="app-topbar">
                <button
                    type="button"
                    className={cls(copied === 'brand' && 'app-topbar__copied', 'app-topbar__brand', 'app-topbar__copy-btn')}
                    onClick={() => copyToClipboard(window.location.origin, 'brand')}
                    title="Copy app link"
                >
                    <b>Split Even Wiser</b>
                </button>
                {user && (
                    <button
                        type="button"
                        className={cls(copied === 'user' && 'app-topbar__copied', 'app-topbar__user', 'app-topbar__copy-btn')}
                        onClick={() => copyToClipboard(user.username, 'user')}
                        title="Copy username"
                    >
                        {`@${user.username}`}
                    </button>
                )}
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
                <Outlet/>
            </main>

            <nav className="app-bottomnav">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({isActive}) => `app-bottomnav__item${isActive ? ' is-active' : ''}`}
                    >
                        <span className="app-bottomnav__icon" aria-hidden="true">{item.icon}</span>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}
