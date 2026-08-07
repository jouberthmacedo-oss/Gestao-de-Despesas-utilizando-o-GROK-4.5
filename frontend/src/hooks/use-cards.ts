import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CardPayload,
  createCard,
  deleteCard,
  listCards,
  updateCard,
} from '@/lib/cards-api';
import { getFinanceQueryKey } from '@/lib/finance-query-keys';
import { useAuthStore } from '@/stores/auth-store';

export function useCards() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryKey = getFinanceQueryKey(userId, 'cards');

  return useQuery({
    queryKey,
    queryFn: listCards,
    enabled: Boolean(userId),
  });
}

export function useCreateCard() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CardPayload) => createCard(payload),
    onSuccess: () => {
      if (userId)
        void queryClient.invalidateQueries({
          queryKey: getFinanceQueryKey(userId, 'cards'),
        });
    },
  });
}

export function useUpdateCard() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<CardPayload>;
    }) => updateCard(id, payload),
    onSuccess: () => {
      if (userId)
        void queryClient.invalidateQueries({
          queryKey: getFinanceQueryKey(userId, 'cards'),
        });
    },
  });
}

export function useDeleteCard() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onSuccess: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({
        queryKey: getFinanceQueryKey(userId, 'cards'),
      });
      void queryClient.invalidateQueries({
        queryKey: getFinanceQueryKey(userId, 'expenses'),
      });
    },
  });
}
