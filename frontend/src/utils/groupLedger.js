import { formatMonthLabel, monthKey } from './expenseDate'

// Normalizes expenses and settlements into a single shape so they can be listed and
// sorted together, newest first, in the "Expenses" tab.
export function buildLedgerItems(expenses, settlements) {
  const expenseItems = expenses.map((expense) => ({
    key: `expense-${expense.id}`,
    kind: 'expense',
    date: expense.current_version.date,
    amount: expense.current_version.amount,
    currency: expense.current_version.currency,
    expense,
  }))

  const paymentItems = settlements.map((settlement) => ({
    key: `settlement-${settlement.id}`,
    kind: 'settlement',
    date: settlement.date,
    amount: settlement.amount,
    currency: settlement.currency,
    settlement,
  }))

  return [...expenseItems, ...paymentItems]
}

// Segments the list into contiguous month blocks, newest item date first.
export function groupItemsByMonth(items) {
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date))

  const groups = []
  let currentGroup = null

  for (const item of sorted) {
    const key = monthKey(item.date)
    if (!currentGroup || currentGroup.key !== key) {
      currentGroup = { key, label: formatMonthLabel(item.date), items: [] }
      groups.push(currentGroup)
    }
    currentGroup.items.push(item)
  }

  return groups
}
