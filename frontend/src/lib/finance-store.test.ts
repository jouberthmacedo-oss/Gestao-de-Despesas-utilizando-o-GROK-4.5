import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getExpenseOccurrenceKey,
  getIncomeOccurrenceKey,
  getMonthKey,
} from '@/lib/finance-calculations';
import { switchFinanceUser, useFinanceStore } from '@/stores/finance-store';

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

test('settlements are per occurrence and timestamps clear when reverted', () => {
  useFinanceStore.getState().clearAll();
  useFinanceStore.getState().addIncome({
    name: 'Salario',
    amount: 100,
    type: 'salario',
    frequency: 'mensal',
  });
  const income = useFinanceStore.getState().incomes[0];
  assert.ok(income);
  const month = getMonthKey();
  const occurrenceKey = getIncomeOccurrenceKey(income, month);
  useFinanceStore.getState().setIncomeStatus(occurrenceKey, 'received');
  assert.equal(useFinanceStore.getState().settlements[0]?.status, 'received');
  assert.ok(useFinanceStore.getState().settlements[0]?.settledAt);
  useFinanceStore.getState().setIncomeStatus(occurrenceKey, 'pending');
  assert.equal(useFinanceStore.getState().settlements[0]?.settledAt, undefined);
  useFinanceStore.getState().clearAll();
});

test('installment edits are blocked after settlement and goals recalculate', () => {
  useFinanceStore.getState().clearAll();
  useFinanceStore.getState().addCard({ name: 'Cartao' });
  const card = useFinanceStore.getState().profile.cards[0];
  assert.ok(card);
  useFinanceStore.getState().addInstallmentPlan({
    name: 'Compra',
    total: 100,
    count: 2,
    purchaseDate: '2026-01-01',
    cardId: card.id,
    category: 'parcela',
  });
  const installment = useFinanceStore.getState().expenses[0];
  assert.ok(installment);
  useFinanceStore
    .getState()
    .setExpenseStatus(getExpenseOccurrenceKey(installment), 'paid');
  useFinanceStore.getState().updateExpense(installment.id, { amount: 99 });
  assert.equal(
    useFinanceStore.getState().expenses[0]?.amount,
    installment.amount,
  );
  useFinanceStore.getState().addGoal({ name: 'Reserva', targetAmount: 100 });
  const goal = useFinanceStore.getState().goals[0];
  assert.ok(goal);
  useFinanceStore
    .getState()
    .addContribution({ goalId: goal.id, amount: 100, date: '2026-01-01' });
  assert.equal(useFinanceStore.getState().goals[0]?.status, 'completed');
  const contribution = useFinanceStore.getState().contributions[0];
  assert.ok(contribution);
  useFinanceStore.getState().removeContribution(contribution.id);
  assert.equal(useFinanceStore.getState().goals[0]?.status, 'active');
  useFinanceStore.getState().clearAll();
});

test('finance state is unloaded on logout and isolated by user id', () => {
  switchFinanceUser('user-a');
  useFinanceStore.getState().clearAll();
  useFinanceStore.getState().addCard({ name: 'Cartão A' });

  switchFinanceUser(null);
  assert.deepEqual(useFinanceStore.getState().profile.cards, []);

  switchFinanceUser('user-b');
  assert.deepEqual(useFinanceStore.getState().profile.cards, []);

  switchFinanceUser('user-a');
  assert.equal(useFinanceStore.getState().profile.cards[0]?.name, 'Cartão A');
  switchFinanceUser(null);
});
