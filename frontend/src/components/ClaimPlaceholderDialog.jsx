import { useEffect, useState } from 'react'
import ConfirmDialog from './ConfirmDialog'
import { useClaimPlaceholderMutation } from '../api/groupsApi'
import { personName } from '../utils/personName'

export default function ClaimPlaceholderDialog({ member, groupId, onClose }) {
  const [claimPlaceholder, { isLoading }] = useClaimPlaceholderMutation()
  const [error, setError] = useState(null)

  useEffect(() => {
    setError(null)
  }, [member])

  async function handleConfirm() {
    try {
      await claimPlaceholder({ groupId, userId: member.id }).unwrap()
      onClose()
    } catch (err) {
      setError(err.data?.message ?? 'Could not link this account.')
    }
  }

  return (
    <ConfirmDialog
      open={member !== null}
      title="Is this you?"
      message={
        member ? (
          <>
            Link "{personName(member)}" - and everything they paid for or split - to your own account. This can't
            be undone.
            {error && (
              <>
                <br />
                {error}
              </>
            )}
          </>
        ) : (
          ''
        )
      }
      confirmLabel="Yes, that's me"
      isConfirming={isLoading}
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  )
}
