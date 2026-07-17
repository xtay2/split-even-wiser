import { apiSlice } from './apiSlice'

export const groupsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGroups: builder.query({
      query: () => '/groups',
      providesTags: ['Groups'],
    }),
    createGroup: builder.mutation({
      query: (body) => ({ url: '/groups', method: 'POST', body }),
      invalidatesTags: ['Groups'],
    }),
    getGroup: builder.query({
      query: (groupId) => `/groups/${groupId}`,
      providesTags: (result, error, groupId) => [{ type: 'Group', id: groupId }],
    }),
    updateGroup: builder.mutation({
      query: ({ groupId, ...body }) => ({ url: `/groups/${groupId}`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { groupId }) => [{ type: 'Group', id: groupId }, 'Groups'],
    }),
    addGroupMember: builder.mutation({
      query: ({ groupId, identifier }) => ({
        url: `/groups/${groupId}/members`,
        method: 'POST',
        body: { identifier },
      }),
      invalidatesTags: (result, error, { groupId }) => [{ type: 'Group', id: groupId }],
    }),
    leaveGroup: builder.mutation({
      query: ({ groupId, userId }) => ({
        url: `/groups/${groupId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Groups'],
    }),
    getBalances: builder.query({
      query: (groupId) => `/groups/${groupId}/balances`,
      providesTags: (result, error, groupId) => [{ type: 'Balances', id: groupId }],
    }),
    getActivity: builder.query({
      query: (groupId) => `/groups/${groupId}/activity`,
      providesTags: (result, error, groupId) => [{ type: 'Activity', id: groupId }],
    }),
    getExpenses: builder.query({
      query: (groupId) => `/groups/${groupId}/expenses`,
      providesTags: (result, error, groupId) => [{ type: 'Expenses', id: groupId }],
    }),
    getExpense: builder.query({
      query: ({ groupId, expenseId }) => `/groups/${groupId}/expenses/${expenseId}`,
      providesTags: (result, error, { expenseId }) => [{ type: 'Expense', id: expenseId }],
    }),
    getExpenseHistory: builder.query({
      query: ({ groupId, expenseId }) => `/groups/${groupId}/expenses/${expenseId}/history`,
      providesTags: (result, error, { expenseId }) => [{ type: 'ExpenseHistory', id: expenseId }],
    }),
    createExpense: builder.mutation({
      query: ({ groupId, ...body }) => ({
        url: `/groups/${groupId}/expenses`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { groupId }) => [
        { type: 'Expenses', id: groupId },
        { type: 'Balances', id: groupId },
        { type: 'Activity', id: groupId },
      ],
    }),
    updateExpense: builder.mutation({
      query: ({ groupId, expenseId, ...body }) => ({
        url: `/groups/${groupId}/expenses/${expenseId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { groupId, expenseId }) => [
        { type: 'Expenses', id: groupId },
        { type: 'Expense', id: expenseId },
        { type: 'ExpenseHistory', id: expenseId },
        { type: 'Balances', id: groupId },
        { type: 'Activity', id: groupId },
      ],
    }),
    deleteExpense: builder.mutation({
      query: ({ groupId, expenseId }) => ({
        url: `/groups/${groupId}/expenses/${expenseId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { groupId, expenseId }) => [
        { type: 'Expenses', id: groupId },
        { type: 'Expense', id: expenseId },
        { type: 'Balances', id: groupId },
        { type: 'Activity', id: groupId },
      ],
    }),
    getSettlements: builder.query({
      query: (groupId) => `/groups/${groupId}/settlements`,
      providesTags: (result, error, groupId) => [{ type: 'Settlements', id: groupId }],
    }),
    getSettlement: builder.query({
      query: ({ groupId, settlementId }) => `/groups/${groupId}/settlements/${settlementId}`,
      providesTags: (result, error, { settlementId }) => [{ type: 'Settlement', id: settlementId }],
    }),
    createSettlement: builder.mutation({
      query: ({ groupId, ...body }) => ({
        url: `/groups/${groupId}/settlements`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { groupId }) => [
        { type: 'Settlements', id: groupId },
        { type: 'Balances', id: groupId },
        { type: 'Activity', id: groupId },
      ],
    }),
    updateSettlement: builder.mutation({
      query: ({ groupId, settlementId, ...body }) => ({
        url: `/groups/${groupId}/settlements/${settlementId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { groupId, settlementId }) => [
        { type: 'Settlements', id: groupId },
        { type: 'Settlement', id: settlementId },
        { type: 'Balances', id: groupId },
        { type: 'Activity', id: groupId },
      ],
    }),
    deleteSettlement: builder.mutation({
      query: ({ groupId, settlementId }) => ({
        url: `/groups/${groupId}/settlements/${settlementId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { groupId, settlementId }) => [
        { type: 'Settlements', id: groupId },
        { type: 'Settlement', id: settlementId },
        { type: 'Balances', id: groupId },
        { type: 'Activity', id: groupId },
      ],
    }),
  }),
})

export const {
  useGetGroupsQuery,
  useCreateGroupMutation,
  useGetGroupQuery,
  useUpdateGroupMutation,
  useAddGroupMemberMutation,
  useLeaveGroupMutation,
  useGetBalancesQuery,
  useGetActivityQuery,
  useGetExpensesQuery,
  useGetExpenseQuery,
  useGetExpenseHistoryQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetSettlementsQuery,
  useGetSettlementQuery,
  useCreateSettlementMutation,
  useUpdateSettlementMutation,
  useDeleteSettlementMutation,
} = groupsApi
