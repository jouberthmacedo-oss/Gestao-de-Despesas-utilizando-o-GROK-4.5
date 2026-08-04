import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createEntry,
  deleteEntry,
  type EntryPayload,
  listEntries,
  updateEntry,
} from '@/lib/entries-api';

export const ENTRIES_QUERY_KEY = ['entries'] as const;

export function useEntries() {
  return useQuery({
    queryKey: ENTRIES_QUERY_KEY,
    queryFn: listEntries,
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EntryPayload) => createEntry(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY });
    },
  });
}

export function useUpdateEntry() {
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
      void queryClient.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY });
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ENTRIES_QUERY_KEY });
    },
  });
}
