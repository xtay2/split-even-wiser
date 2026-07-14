import { useParams } from 'react-router'

export default function GroupDetailPage() {
  const { groupId } = useParams()
  return <p>Group {groupId} detail — coming soon.</p>
}
