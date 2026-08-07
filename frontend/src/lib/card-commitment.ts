import {
  getExpenseOccurrenceDate,
  getExpenseOccurrenceKey,
  getSettlementStatus,
  isExpenseActive,
} from '@/lib/finance-calculations';
import type { Card, Expense, Settlement } from '@/types/finance';

export type CardCommitmentDatum = {
  id: string;
  name: string;
  percent: number;
  display: number;
  committed: number;
  limit: number;
};

export function buildCardCommitmentData(
  cards: Card[],
  expenses: Expense[],
  settlements: Settlement[],
  monthKey: string,
  today: string,
): CardCommitmentDatum[] {
  return cards
    .filter(
      (card): card is Card & { limit: number } =>
        card.limit != null && card.limit > 0,
    )
    .map((card) => {
      const committed = expenses
        .filter(
          (expense) =>
            expense.cardId === card.id && isExpenseActive(expense, monthKey),
        )
        .reduce((sum, expense) => {
          const occurrenceKey = getExpenseOccurrenceKey(expense, monthKey);
          const status = getSettlementStatus(
            settlements,
            occurrenceKey,
            'expense',
            getExpenseOccurrenceDate(expense, monthKey),
            today,
          );
          return status === 'cancelled' ? sum : sum + expense.amount;
        }, 0);
      const percent = (committed / card.limit) * 100;

      return {
        id: card.id,
        name: card.name,
        percent: Number(percent.toFixed(1)),
        display: Math.min(percent, 100),
        committed,
        limit: card.limit,
      };
    });
}

export function getWeightedCardCommitmentPercentage(
  data: CardCommitmentDatum[],
) {
  const totals = data.reduce(
    (result, item) => ({
      committed: result.committed + item.committed,
      limit: result.limit + item.limit,
    }),
    { committed: 0, limit: 0 },
  );

  return totals.limit === 0
    ? 0
    : Number(((totals.committed / totals.limit) * 100).toFixed(1));
}
