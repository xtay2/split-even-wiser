import { createBrowserRouter, Navigate } from 'react-router'
import AppLayout from '../components/AppLayout'
import RequireAuth from '../components/RequireAuth'
import LoginPage from '../pages/LoginPage'
import LoginVerifyPage from '../pages/LoginVerifyPage'
import ProfilePage from '../pages/ProfilePage'
import FriendsPage from '../pages/FriendsPage'
import GroupsPage from '../pages/GroupsPage'
import GroupDetailPage from '../pages/GroupDetailPage'
import ExpenseFormPage from '../pages/ExpenseFormPage'
import NotFoundPage from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/login/verify',
    element: <LoginVerifyPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/groups" replace /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'friends', element: <FriendsPage /> },
          { path: 'groups', element: <GroupsPage /> },
          { path: 'groups/:groupId', element: <GroupDetailPage /> },
          { path: 'groups/:groupId/expenses/new', element: <ExpenseFormPage /> },
          { path: 'groups/:groupId/expenses/:expenseId', element: <ExpenseFormPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
