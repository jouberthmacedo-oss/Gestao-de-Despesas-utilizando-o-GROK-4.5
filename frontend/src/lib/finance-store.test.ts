import assert from 'node:assert/strict';
import test from 'node:test';

import { useFinanceStore } from '@/stores/finance-store';

test('finance store starts empty and rejects invalid active state', () => {
  useFinanceStore.getState().clearAll();
  assert.deepEqual(useFinanceStore.getState().profile.cards, []);
  assert.deepEqual(useFinanceStore.getState().expenses, []);
  assert.deepEqual(useFinanceStore.getState().incomes, []);

  useFinanceStore.getState().addIncome({
    name: 'Sem data',
    amount: 100,
    type: 'outro',
    frequency: 'unica',
  });
  useFinanceStore.getState().addCard({ name: '  ' });

  assert.equal(useFinanceStore.getState().incomes.length, 0);
  assert.equal(useFinanceStore.getState().profile.cards.length, 0);
});

test('card deletion preserves expenses and unlinks the card', () => {
  useFinanceStore.getState().clearAll();
  useFinanceStore.getState().addCard({ name: 'Nubank' });
  const card = useFinanceStore.getState().profile.cards[0];
  assert.ok(card);

  useFinanceStore.getState().addExpense({
    name: 'Internet',
    amount: 100,
    category: 'assinatura',
    frequency: 'mensal',
    cardId: card.id,
  });
  useFinanceStore.getState().removeCard(card.id);

  assert.equal(useFinanceStore.getState().profile.cards.length, 0);
  assert.equal(useFinanceStore.getState().expenses.length, 1);
  assert.equal('cardId' in useFinanceStore.getState().expenses[0], false);
  useFinanceStore.getState().clearAll();
});
