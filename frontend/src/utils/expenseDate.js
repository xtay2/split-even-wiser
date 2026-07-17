const MONTH_ABBREVIATIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Expense dates are plain "YYYY-MM-DD" strings; parsing them with new Date() directly
// would interpret them as UTC midnight and can shift the displayed day in local time zones.
function parseIsoDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function todayIsoDate() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// Renders as "12. Aug".
export function formatExpenseDate(isoDate) {
  const date = parseIsoDate(isoDate)
  return `${date.getDate()}. ${MONTH_ABBREVIATIONS[date.getMonth()]}`
}

// Renders as "August 2026".
export function formatMonthLabel(isoDate) {
  const date = parseIsoDate(isoDate)
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
}

export function monthKey(isoDate) {
  return isoDate.slice(0, 7)
}
