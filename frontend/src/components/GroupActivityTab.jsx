import { useGetActivityQuery } from '../api/groupsApi'
import ActivityFeed from './ActivityFeed'
import { isLocalId } from '../features/offline/offlineQueueSlice'

export default function GroupActivityTab({ hidden, groupId, currentUserId }) {
  const { data: activity = [] } = useGetActivityQuery(groupId, { skip: isLocalId(groupId) })

  return (
    <section hidden={hidden}>
      <ActivityFeed activity={activity} currentUserId={currentUserId} />
    </section>
  )
}
