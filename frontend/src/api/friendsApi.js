import { apiSlice } from './apiSlice'

export const friendsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFriends: builder.query({
      query: () => '/friends',
      providesTags: ['Friends'],
    }),
    getFriendRequests: builder.query({
      query: () => '/friends/requests',
      providesTags: ['FriendRequests'],
    }),
    sendFriendRequest: builder.mutation({
      query: (identifier) => ({
        url: '/friends/requests',
        method: 'POST',
        body: { identifier },
      }),
      invalidatesTags: ['FriendRequests', 'Friends'],
    }),
    acceptFriendRequest: builder.mutation({
      query: (friendshipId) => ({
        url: `/friends/requests/${friendshipId}/accept`,
        method: 'POST',
      }),
      invalidatesTags: ['FriendRequests', 'Friends'],
    }),
    declineFriendRequest: builder.mutation({
      query: (friendshipId) => ({
        url: `/friends/requests/${friendshipId}/decline`,
        method: 'POST',
      }),
      invalidatesTags: ['FriendRequests'],
    }),
    removeFriend: builder.mutation({
      query: (friendshipId) => ({
        url: `/friends/${friendshipId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FriendRequests', 'Friends'],
    }),
  }),
})

export const {
  useGetFriendsQuery,
  useGetFriendRequestsQuery,
  useSendFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useRemoveFriendMutation,
} = friendsApi
