import './ActivityFeed.css'

function describe(entry, currentUserId) {
  const who = (user) => (user?.id === currentUserId ? 'You' : `@${user?.username}`)

  switch (entry.type) {
    case 'expense_version':
      return `${who(entry.created_by)} ${entry.version_no === 1 ? 'added' : 'edited'} "${entry.title}", paid by ${who(entry.paid_by)}`
    case 'expense_deleted':
      return `"${entry.title ?? 'An expense'}" was deleted`
    case 'settlement':
      return `${who(entry.from_user)} settled up with ${who(entry.to_user)}`
    default:
      return null
  }
}

export default function ActivityFeed({ activity, currentUserId }) {
  if (activity.length === 0) {
    return <p className="friends-empty">No activity yet.</p>
  }

  return (
    <ul className="activity-feed">
      {activity.map((entry, index) => (
        <li key={index} className="activity-entry">
          <span className="activity-entry__text">{describe(entry, currentUserId)}</span>
          {entry.amount !== undefined && (
            <span className="amount activity-entry__amount">{entry.amount} {entry.currency}</span>
          )}
          <time className="activity-entry__date">
            {new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </time>
        </li>
      ))}
    </ul>
  )
}
