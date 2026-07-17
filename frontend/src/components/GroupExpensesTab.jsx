import { Link, useNavigate } from 'react-router'
import { useGetExpensesQuery, useGetSettlementsQuery } from '../api/groupsApi'
import { formatExpenseDate } from '../utils/expenseDate'
import { buildLedgerItems, groupItemsByMonth } from '../utils/groupLedger'
import { PaymentsIcon } from './icons/PaymentsIcon.tsx'
import { ReceiptLongIcon } from './icons/ReceiptLongIcon.tsx'

export default function GroupExpensesTab({ hidden, groupId, nameFor }) {
  const navigate = useNavigate()
  const { data: expenses = [] } = useGetExpensesQuery(groupId)
  const { data: settlements = [] } = useGetSettlementsQuery(groupId)

  return (
    <section hidden={hidden} className="expenses-section">
      {expenses.length === 0 && settlements.length === 0 ? (
        <p className="friends-empty">No expenses yet.</p>
      ) : (
        groupItemsByMonth(buildLedgerItems(expenses, settlements)).map((group) => (
          <div key={group.key} className="expense-month-group">
            <h3 className="expense-month-heading">{group.label}</h3>
            <ul className="expense-list">
              {group.items.map((item) => {
                if (item.kind === 'settlement') {
                  return (
                    <li key={item.key} className="expense-row expense-row--settlement">
                      <span className="expense-row__date">{formatExpenseDate(item.date)}</span>
                      <span className="expense-row__title">
                        <span className="settlement-badge">Settlement</span>
                        {nameFor(item.settlement.from_user.id)} to {nameFor(item.settlement.to_user.id)}
                      </span>
                      <span className="expense-row__leader" aria-hidden="true" />
                      <span className="amount expense-row__amount amount--credit">
                        {item.amount} {item.currency}
                      </span>
                    </li>
                  )
                }

                const expense = item.expense
                const editPath = `/groups/${groupId}/expenses/${expense.id}`
                return (
                  <li key={item.key} className="expense-row" onClick={() => navigate(editPath)}>
                    <button
                      type="button"
                      className="expense-row__date"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`${editPath}?focus=date`)
                      }}
                    >
                      {formatExpenseDate(expense.current_version.date)}
                    </button>
                    <button
                      type="button"
                      className="expense-row__title"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`${editPath}?focus=title`)
                      }}
                    >
                      {expense.current_version.title}
                    </button>
                    <span className="expense-row__leader" aria-hidden="true" />
                    <button
                      type="button"
                      className="amount expense-row__amount"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`${editPath}?focus=amount`)
                      }}
                    >
                      {expense.current_version.amount} {expense.current_version.currency}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}

      <div className="group-fab-column">
        <Link to={`/groups/${groupId}/expenses/new`} className="group-fab group-fab--right">
          <ReceiptLongIcon />
          New expense
        </Link>
        <Link to={`/groups/${groupId}/settlements/new`} className="group-fab group-fab--right">
          <PaymentsIcon />
          New settlement
        </Link>
      </div>
    </section>
  )
}
