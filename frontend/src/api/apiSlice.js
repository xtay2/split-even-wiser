import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { loggedOut } from '../features/auth/authSlice'

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token
    if (token) headers.set('Authorization', `Bearer ${token}`)
    headers.set('Accept', 'application/json')
    return headers
  },
})

const baseQueryWithAuthHandling = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions)

  if (result.error?.status === 401) {
    api.dispatch(loggedOut())
  }

  return result
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuthHandling,
  tagTypes: [
    'Me',
    'Friends',
    'FriendRequests',
    'Groups',
    'Group',
    'Expenses',
    'Expense',
    'ExpenseHistory',
    'Balances',
    'Activity',
  ],
  endpoints: () => ({}),
})
