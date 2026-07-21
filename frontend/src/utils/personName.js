export function personName(person, currentUserId) {
  if (!person) return '?'
  if (person.id === currentUserId) return 'You'
  return person.display_name || `@${person.username}`
}
