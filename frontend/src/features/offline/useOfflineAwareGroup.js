import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useGetGroupQuery } from '../../api/groupsApi'
import { selectCurrentUser } from '../auth/authSlice'
import {
  isLocalId,
  placeholderMemberFromItem,
  resolveId,
  selectQueueItems,
  selectResolvedIds,
} from './offlineQueueSlice'

// Returns the group as the server knows it, plus whatever was queued for it offline: a group
// that was created offline is built entirely from its queue item, and placeholders added offline
// are appended to the member list. Once a locally created group has synced, the server's version
// is returned and `resolvedId` is set, so screens still addressed by the local id can redirect.
export default function useOfflineAwareGroup(localOrRealGroupId) {
  const currentUser = useSelector(selectCurrentUser)
  const queueItems = useSelector(selectQueueItems)
  const resolvedIds = useSelector(selectResolvedIds)
  const groupId = resolveId(resolvedIds, localOrRealGroupId)
  const isLocal = isLocalId(groupId)

  const { data: serverGroup, error } = useGetGroupQuery(groupId, { skip: isLocal })

  const group = useMemo(() => {
    const groupItems = queueItems.filter((item) => String(item.groupId) === String(groupId))
    const localPlaceholders = groupItems
      .filter((item) => item.type === 'placeholder')
      .map(placeholderMemberFromItem)

    if (isLocal) {
      const groupItem = groupItems.find((item) => item.type === 'group')
      if (!groupItem) return undefined
      return {
        id: groupId,
        name: groupItem.payload.name,
        description: groupItem.payload.description ?? null,
        members: [currentUser, ...localPlaceholders],
      }
    }

    if (!serverGroup || localPlaceholders.length === 0) return serverGroup
    return { ...serverGroup, members: [...serverGroup.members, ...localPlaceholders] }
  }, [queueItems, groupId, isLocal, serverGroup, currentUser])

  return { group, error, groupId, isLocal, resolvedId: groupId !== localOrRealGroupId ? groupId : undefined }
}
