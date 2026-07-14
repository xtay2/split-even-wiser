import { useParams } from 'react-router'

export default function ExpenseFormPage() {
  const { groupId, expenseId } = useParams()
  return <p>{expenseId ? `Edit expense ${expenseId}` : 'New expense'} in group {groupId} — coming soon.</p>
}
