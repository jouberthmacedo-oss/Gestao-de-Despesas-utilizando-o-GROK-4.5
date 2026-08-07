import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createExpense,
  deleteExpense,
  type ExpensePayload,
  listExpenses,
  updateExpense,
} from '@/lib/expenses-api';
import { getFinanceQueryKey } from '@/lib/finance-query-keys';
import { useAuthStore } from '@/stores/auth-store';

export function useExpenses() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryKey = getFinanceQueryKey(userId, 'expenses');

  return useQuery({
    queryKey,
    queryFn: listExpenses,
    enabled: Boolean(userId),
  });
}

export function useCreateExpense() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ExpensePayload) => createExpense(payload),
    onSuccess: () => {
      if (userId)
        void queryClient.invalidateQueries({
          queryKey: getFinanceQueryKey(userId, 'expenses'),
        });
    },
  });
}

export function useUpdateExpense() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<ExpensePayload>;
    }) => updateExpense(id, payload),
    onSuccess: () => {
      if (userId)
        void queryClient.invalidateQueries({
          queryKey: getFinanceQueryKey(userId, 'expenses'),
        });
    },
  });
}

export function useDeleteExpense() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      if (userId)
        void queryClient.invalidateQueries({
          queryKey: getFinanceQueryKey(userId, 'expenses'),
        });
    },
  });
}
