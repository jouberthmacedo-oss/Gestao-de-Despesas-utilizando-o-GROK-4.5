import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CardPayload,
  createCard,
  deleteCard,
  listCards,
  updateCard,
} from '@/lib/cards-api';

export const CARDS_QUERY_KEY = ['cards'] as const;

export function useCards() {
  return useQuery({
    queryKey: CARDS_QUERY_KEY,
    queryFn: listCards,
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CardPayload) => createCard(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CARDS_QUERY_KEY });
    },
  });
}

export function useUpdateCard() {
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
      void queryClient.invalidateQueries({ queryKey: CARDS_QUERY_KEY });
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CARDS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
