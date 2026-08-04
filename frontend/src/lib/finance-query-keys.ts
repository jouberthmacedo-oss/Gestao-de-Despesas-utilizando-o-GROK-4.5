export const FINANCE_QUERY_ROOT_KEY = ['finance'] as const;

export type FinanceQueryResource = 'cards' | 'expenses' | 'entries';

export function getFinanceQueryKey(
  userId: string | null | undefined,
  resource: FinanceQueryResource,
) {
  return ['finance', userId ?? 'anonymous', resource] as const;
}
