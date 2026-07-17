import { apiSlice } from './apiSlice'

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    requestLoginToken: builder.mutation({
      query: (email) => ({
        url: '/auth/request-token',
        method: 'POST',
        body: { email },
      }),
    }),
    verifyLoginToken: builder.mutation({
      query: ({ email, token, username }) => ({
        url: '/auth/verify',
        method: 'POST',
        body: { email, token, username },
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    getMe: builder.query({
      query: () => '/me',
      providesTags: ['Me'],
    }),
    updateMe: builder.mutation({
      query: (body) => ({
        url: '/me',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Me'],
    }),
    uploadAvatar: builder.mutation({
      query: (formData) => ({
        url: '/me/avatar',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Me'],
    }),
    requestEmailChange: builder.mutation({
      query: (email) => ({
        url: '/me/email',
        method: 'POST',
        body: { email },
      }),
    }),
    confirmEmailChange: builder.mutation({
      query: ({ email, token }) => ({
        url: '/me/email/confirm',
        method: 'POST',
        body: { email, token },
      }),
      invalidatesTags: ['Me'],
    }),
  }),
})

export const {
  useRequestLoginTokenMutation,
  useVerifyLoginTokenMutation,
  useLogoutMutation,
  useGetMeQuery,
  useUpdateMeMutation,
  useUploadAvatarMutation,
  useRequestEmailChangeMutation,
  useConfirmEmailChangeMutation,
} = authApi
