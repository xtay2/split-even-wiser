import { personName } from '../utils/personName'
import './PersonRow.css'

export default function PersonRow({ person, children }) {
  return (
    <li className="person-row">
      <span className="person-row__avatar">
        {person.avatar_url ? (
          <img src={person.avatar_url} alt="" />
        ) : (
          (person.display_name || person.username).slice(0, 2).toUpperCase()
        )}
      </span>
      <span className="person-row__name">{personName(person)}</span>
      <span className="person-row__actions">{children}</span>
    </li>
  )
}
