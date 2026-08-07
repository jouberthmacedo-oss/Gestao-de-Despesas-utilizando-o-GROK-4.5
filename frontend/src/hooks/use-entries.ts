import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createEntry,
  deleteEntry,
  type EntryPayload,
  listEntries,
  updateEntry,
} from '@/lib/entries-api';
import { getFinanceQueryKey } from '@/lib/finance-query-keys';
import { useAuthStore } from '@/stores/auth-store';

export function useEntries() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryKey = getFinanceQueryKey(userId, 'entries');

  return useQuery({
    queryKey,
    queryFn: listEntries,
    enabled: Boolean(userId),
  });
}

export function useCreateEntry() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EntryPayload) => createEntry(payload),
    onSuccess: () => {
      if (userId)
        void queryClient.invalidateQueries({
          queryKey: getFinanceQueryKey(userId, 'entries'),
        });
    },
  });
}

export function useUpdateEntry() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<EntryPayload>;
    }) => updateEntry(id, payload),
    onSuccess: () => {
      if (userId)
        void queryClient.invalidateQueries({
          queryKey: getFinanceQueryKey(userId, 'entries'),
        });
    },
  });
}

export function useDeleteEntry() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      if (userId)
        void queryClient.invalidateQueries({
          queryKey: getFinanceQueryKey(userId, 'entries'),
        });
    },
  });
}
