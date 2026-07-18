import { formatMonthLabel, monthKey } from './expenseDate'

// Normalizes expenses and settlements into a single shape so they can be listed and
// sorted together, newest first, in the "Payments" tab.
export function buildLedgerItems(expenses, settlements) {
  const expenseItems = expenses.map((expense) => ({
    key: `expense-${expense.id}`,
    kind: 'expense',
    created_at: expense.created_at,
    date: expense.current_version.date,
    amount: expense.current_version.amount,
    currency: expense.current_version.currency,
    expense,
  }))

  const paymentItems = settlements.map((settlement) => ({
    key: `settlement-${settlement.id}`,
    kind: 'settlement',
    created_at: settlement.created_at,
    date: settlement.date,
    amount: settlement.amount,
    currency: settlement.currency,
    settlement,
  }))

  return [...expenseItems, ...paymentItems]
}

function toCents(decimalString) {
  return Math.round(Number(decimalString) * 100)
}

// The current user's net position on an expense: positive means others owe them,
// negative means they owe money, null means they aren't part of the expense at all.
export function getMyExpenseNet(expense, currentUserId) {
  const version = expense.current_version
  const myShare = version.shares.find((share) => share.user_id === currentUserId)
  const paidByMe = version.paid_by === currentUserId

  if (!paidByMe && !myShare) {
    return null
  }

  const paidCents = paidByMe ? toCents(version.amount) : 0
  const owedCents = myShare ? toCents(myShare.share_amount) : 0
  return (paidCents - owedCents) / 100
}

// Segments the list into contiguous month blocks, newest item date first.
export function groupItemsByMonth(items) {
  const sorted = [...items].sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date)
    return dateComp === 0
      ? b.created_at.localeCompare(a.created_at)
      : dateComp;
  });

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
