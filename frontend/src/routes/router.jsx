import { createBrowserRouter, Navigate } from 'react-router'
import AppLayout from '../components/AppLayout'
import RequireAuth from '../components/RequireAuth'
import LoginPage from '../pages/LoginPage'
import LoginVerifyPage from '../pages/LoginVerifyPage'
import ProfilePage from '../pages/ProfilePage'
import EmailChangeVerifyPage from '../pages/EmailChangeVerifyPage'
import FriendsPage from '../pages/FriendsPage'
import AddFriendToGroupPage from '../pages/AddFriendToGroupPage'
import GroupsPage from '../pages/GroupsPage'
import GroupDetailPage from '../pages/GroupDetailPage'
import ExpenseFormPage from '../pages/ExpenseFormPage'
import SettlementFormPage from '../pages/SettlementFormPage.jsx'
import NotFoundPage from '../pages/NotFoundPage'
import ImprintPage from '../pages/ImprintPage'

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
    path: '/imprint',
    element: <ImprintPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/groups" replace /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'profile/email/verify', element: <EmailChangeVerifyPage /> },
          { path: 'friends', element: <FriendsPage /> },
          { path: 'friends/:friendshipId/add-to-group', element: <AddFriendToGroupPage /> },
          { path: 'groups', element: <GroupsPage /> },
          { path: 'groups/:groupId', element: <GroupDetailPage /> },
          { path: 'groups/:groupId/expenses/new', element: <ExpenseFormPage /> },
          { path: 'groups/:groupId/expenses/:expenseId', element: <ExpenseFormPage /> },
          { path: 'groups/:groupId/settlements/new', element: <SettlementFormPage /> },
          { path: 'groups/:groupId/settlements/:settlementId', element: <SettlementFormPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
