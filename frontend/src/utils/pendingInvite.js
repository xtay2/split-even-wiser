const STORAGE_KEY = 'split-even-wiser.pending-invite'

export function setPendingInvite(token) {
  localStorage.setItem(STORAGE_KEY, token)
}

export function consumePendingInvite() {
  const token = localStorage.getItem(STORAGE_KEY)
  if (token) localStorage.removeItem(STORAGE_KEY)
  return token
}
