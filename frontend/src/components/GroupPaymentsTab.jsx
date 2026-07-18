import { Link, useNavigate } from 'react-router'
import { useGetExpensesQuery, useGetSettlementsQuery } from '../api/groupsApi'
import { formatExpenseDate } from '../utils/expenseDate'
import { buildLedgerItems, groupItemsByMonth, getMyExpenseNet } from '../utils/groupLedger'
import { PaymentsIcon } from './icons/PaymentsIcon.tsx'
import { ReceiptLongIcon } from './icons/ReceiptLongIcon.tsx'

export default function GroupPaymentsTab({ hidden, groupId, currentUser, nameFor, hasOtherMembers }) {
  const navigate = useNavigate()
  const { data: expenses = [] } = useGetExpensesQuery(groupId)
  const { data: settlements = [] } = useGetSettlementsQuery(groupId)

  return (
    <section hidden={hidden} className="payments-section">
      {expenses.length === 0 && settlements.length === 0 ? (
        <p className="friends-empty">No expenses yet.</p>
      ) : (
        groupItemsByMonth(buildLedgerItems(expenses, settlements)).map((group) => (
          <div key={group.key} className="expense-month-group">
            <h3 className="expense-month-heading">{group.label}</h3>
            <ul className="expense-list">
              {group.items.map((item) => {
                if (item.kind === 'settlement') {
                  const editPath = `/groups/${groupId}/settlements/${item.settlement.id}`
                  return (
                    <li
                      key={item.key}
                      className="expense-row expense-row--settlement"
                      onClick={() => navigate(editPath)}
                    >
                      <div className="expense-row__main">
                        <span className="expense-row__date">{formatExpenseDate(item.date)}</span>
                        <span className="expense-row__title">
                          <span className="settlement-badge">Settlement</span>
                          {nameFor(item.settlement.from_user.id)} to {nameFor(item.settlement.to_user.id)}
                        </span>
                        <span className="expense-row__leader" aria-hidden="true" />
                        <span className="amount expense-row__amount amount--credit">
                          {item.amount} {item.currency}
                        </span>
                      </div>
                    </li>
                  )
                }

                const expense = item.expense
                const editPath = `/groups/${groupId}/expenses/${expense.id}`
                const myNet = getMyExpenseNet(expense, currentUser.id)
                const shareClass =
                  myNet === null ? '' : myNet > 0 ? ' expense-row__share--credit' : myNet < 0 ? ' expense-row__share--owed' : ''
                const shareLabel =
                  myNet === null
                    ? 'Not involved'
                    : myNet > 0
                      ? `You get back ${myNet.toFixed(2)} ${expense.current_version.currency}`
                      : myNet < 0
                        ? `You owe ${Math.abs(myNet).toFixed(2)} ${expense.current_version.currency}`
                        : 'You paid your share'
                return (
                  <li key={item.key} className="expense-row" onClick={() => navigate(editPath)}>
                    <div className="expense-row__main">
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
                    </div>
                    <div className={`expense-row__share${shareClass}`}>{shareLabel}</div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}

      <div className="group-fab-column">
        {hasOtherMembers ? (
          <Link to={`/groups/${groupId}/expenses/new`} className="group-fab group-fab--right">
            <ReceiptLongIcon />
            New expense
          </Link>
        ) : (
          <button type="button" className="group-fab group-fab--right" disabled title="Invite other people to add expenses">
            <ReceiptLongIcon />
            New expense
          </button>
        )}
        {hasOtherMembers ? (
          <Link to={`/groups/${groupId}/settlements/new`} className="group-fab group-fab--right">
            <PaymentsIcon />
            New settlement
          </Link>
        ) : (
          <button type="button" className="group-fab group-fab--right" disabled title="Invite other people to add settlements">
            <PaymentsIcon />
            New settlement
          </button>
        )}
      </div>
    </section>
  )
}
