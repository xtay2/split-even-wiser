import { createSlice } from '@reduxjs/toolkit'

const STORAGE_KEY = 'split-even-wiser.auth'

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { token: null, user: null }
  } catch {
    return { token: null, user: null }
  }
}

const initialState = loadPersisted()

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsReceived(state, action) {
      state.token = action.payload.token
      state.user = action.payload.user
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    },
    userUpdated(state, action) {
      state.user = action.payload.user
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    },
    loggedOut(state) {
      state.token = null
      state.user = null
      localStorage.removeItem(STORAGE_KEY)
    },
  },
})

export const { credentialsReceived, userUpdated, loggedOut } = authSlice.actions
export default authSlice.reducer

export const selectCurrentUser = (state) => state.auth.user
export const selectAuthToken = (state) => state.auth.token
export const selectIsAuthenticated = (state) => Boolean(state.auth.token)
