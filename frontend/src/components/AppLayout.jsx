import { NavLink, Outlet } from 'react-router'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '../features/auth/authSlice'
import './AppLayout.css'

const NAV_ITEMS = [
  { to: '/groups', label: 'Groups', icon: '👥' },
  { to: '/friends', label: 'Friends', icon: '🤝' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

export default function AppLayout() {
  const user = useSelector(selectCurrentUser)

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <span className="app-topbar__brand">Split Even Wiser</span>
        {user && <span className="app-topbar__user">@{user.username}</span>}
      </header>

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
