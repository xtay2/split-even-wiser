import { useState } from 'react'
import { Link } from 'react-router'
import {
  useGetFriendsQuery,
  useGetFriendRequestsQuery,
  useSendFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useRemoveFriendMutation,
} from '../api/friendsApi'
import PersonRow from '../components/PersonRow'
import { GroupAddIcon } from '../components/icons/GroupAddIcon'
import './FriendsPage.css'

export default function FriendsPage() {
  const { data: friends = [], isLoading: friendsLoading } = useGetFriendsQuery()
  const { data: requests = { incoming: [], outgoing: [] } } = useGetFriendRequestsQuery()
  const [sendRequest, { isLoading: isSending, error: sendError }] = useSendFriendRequestMutation()
  const [acceptRequest] = useAcceptFriendRequestMutation()
  const [declineRequest] = useDeclineFriendRequestMutation()
  const [removeFriend] = useRemoveFriendMutation()

  const [identifier, setIdentifier] = useState('')
  const [sent, setSent] = useState(false)

  async function handleAddFriend(event) {
    event.preventDefault()
    try {
      await sendRequest(identifier).unwrap()
      setIdentifier('')
      setSent(true)
      setTimeout(() => setSent(false), 2500)
    } catch {
      // error is surfaced via sendError below
    }
  }

  return (
    <div className="friends-screen">
      <section>
        <h2 className="friends-section-title">Add a friend</h2>
        <form onSubmit={handleAddFriend} className="friends-add-form">
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="username or email"
            className="friends-add-input"
            required
          />
          <button type="submit" className="friends-add-btn" disabled={isSending || !identifier}>
            {isSending ? '…' : 'Send'}
          </button>
        </form>
        {sendError && (
          <p className="friends-error">
            {sendError.data?.errors?.identifier?.[0] ?? 'Could not send request.'}
          </p>
        )}
        {sent && <p className="friends-success">Friend request sent.</p>}
      </section>

      {requests.incoming.length > 0 && (
        <section>
          <h2 className="friends-section-title">Requests for you</h2>
          <ul className="friends-list">
            {requests.incoming.map((request) => (
              <PersonRow key={request.id} person={request.requester}>
                <button
                  type="button"
                  className="friends-accept-btn"
                  onClick={() => acceptRequest(request.id)}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="friends-decline-btn"
                  onClick={() => declineRequest(request.id)}
                >
                  Decline
                </button>
              </PersonRow>
            ))}
          </ul>
        </section>
      )}

      {requests.outgoing.length > 0 && (
        <section>
          <h2 className="friends-section-title">Awaiting response</h2>
          <ul className="friends-list">
            {requests.outgoing.map((request) => (
              <PersonRow key={request.id} person={request.addressee}>
                <span className="friends-pending-label">Pending</span>
              </PersonRow>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="friends-section-title">Your friends</h2>
        {friendsLoading ? (
          <p className="friends-empty">Loading…</p>
        ) : friends.length === 0 ? (
          <p className="friends-empty">No friends yet — add one above to get started.</p>
        ) : (
          <ul className="friends-list">
            {friends.map((friend) => (
              <PersonRow key={friend.friendship_id} person={friend.user}>
                <Link
                  to={`/friends/${friend.friendship_id}/add-to-group`}
                  className="friends-addgroup-btn"
                  aria-label={`Add @${friend.user.username} to a group`}
                  title="Add to group"
                >
                  <GroupAddIcon fontSizePx={18}/>
                </Link>
                <button
                  type="button"
                  className="friends-remove-btn"
                  onClick={() => removeFriend(friend.friendship_id)}
                >
                  Remove
                </button>
              </PersonRow>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
