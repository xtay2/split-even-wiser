import { configureStore } from '@reduxjs/toolkit'
import { apiSlice } from '../api/apiSlice'
import authReducer, { loggedOut } from '../features/auth/authSlice'
import offlineQueueReducer from '../features/offline/offlineQueueSlice'

const resetApiCacheOnLogout = (store) => (next) => (action) => {
  const result = next(action)
  if (action.type === loggedOut.type) {
    store.dispatch(apiSlice.util.resetApiState())
    // Also drop the service worker's cached API responses, so a different account logging in
    // on this device doesn't get served another user's cached data while offline.
    if (typeof caches !== 'undefined') caches.delete('api-cache')
  }
  return result
}

export const store = configureStore({
  reducer: {
    auth: authReducer,
    offlineQueue: offlineQueueReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware, resetApiCacheOnLogout),
})
