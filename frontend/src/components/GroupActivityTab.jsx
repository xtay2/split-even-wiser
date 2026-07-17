import { useGetActivityQuery } from '../api/groupsApi'
import ActivityFeed from './ActivityFeed'

export default function GroupActivityTab({ hidden, groupId, currentUserId }) {
  const { data: activity = [] } = useGetActivityQuery(groupId)

  return (
    <section hidden={hidden}>
      <ActivityFeed activity={activity} currentUserId={currentUserId} />
    </section>
  )
}
