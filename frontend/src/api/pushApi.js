import { apiSlice } from './apiSlice'

export const pushApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getVapidPublicKey: builder.query({
      query: () => '/push/vapid-public-key',
    }),
    subscribeToPush: builder.mutation({
      query: (subscription) => ({
        url: '/push/subscription',
        method: 'POST',
        body: subscription,
      }),
    }),
    unsubscribeFromPush: builder.mutation({
      query: (endpoint) => ({
        url: '/push/subscription',
        method: 'DELETE',
        body: { endpoint },
      }),
    }),
  }),
})

export const {
  useGetVapidPublicKeyQuery,
  useLazyGetVapidPublicKeyQuery,
  useSubscribeToPushMutation,
} = pushApi
