import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDashboardSeries,
  getMonthlyFinanceSummary,
} from '@/lib/finance-calculations';
import {
  budgetPeriodsOverlap,
  createInstallmentExpenses,
  getBudgetUsage,
  getCardInvoices,
  getDueDate,
  getGoalProgress,
  getInstallmentPlanProgress,
  getInvoiceCycleForDate,
  getPriorInvoices,
  splitAmountIntoCents,
} from '@/lib/finance-planning';
import type { Budget, Expense, Goal, Settlement } from '@/types/finance';

const card = {
  id: 'card-1',
  name: 'Cartao',
  limit: 1000,
  closingDay: 20,
  dueDay: 10,
};

test('invoice cycles clamp dates and move due dates strictly after closing', () => {
  assert.equal(getInvoiceCycleForDate(card, '2026-02-20')?.month, '2026-02');
  assert.equal(getInvoiceCycleForDate(card, '2026-02-21')?.month, '2026-03');
  assert.equal(
    getInvoiceCycleForDate(card, '2026-02-21')?.closingDate,
    '2026-03-20',
  );
  assert.equal(getDueDate('2026-02-20', 10), '2026-03-10');
  assert.equal(getDueDate('2028-02-20', 31), '2028-02-29');
  assert.deepEqual(
    getPriorInvoices(card, 2, '2026-01-05').map((invoice) => invoice.month),
    ['2025-12', '2025-11'],
  );
});

test('card invoice totals use linked occurrences and settlement states', () => {
  const expenses: Expense[] = [
    {
      id: 'before',
      name: 'Antes',
      amount: 100,
      category: 'outro',
      frequency: 'unica',
      cardId: card.id,
      date: '2026-04-10',
    },
    {
      id: 'after',
      name: 'Depois',
      amount: 50,
      category: 'outro',
      frequency: 'unica',
      cardId: card.id,
      date: '2026-04-21',
    },
    {
      id: 'unlinked',
      name: 'Sem cartao',
      amount: 999,
      category: 'outro',
      frequency: 'unica',
      date: '2026-04-10',
    },
  ];
  const settlements: Settlement[] = [
    {
      occurrenceKey: 'before',
      status: 'paid',
      settledAt: '2026-04-11T00:00:00.000Z',
    },
  ];
  const invoices = getCardInvoices(
    card,
    expenses,
    settlements,
    '2026-04',
    '2026-05',
    '2026-05-01',
  );
  assert.equal(
    invoices.find((invoice) => invoice.month === '2026-04')?.total,
    100,
  );
  assert.equal(
    invoices.find((invoice) => invoice.month === '2026-05')?.total,
    50,
  );
  assert.equal(
    invoices.find((invoice) => invoice.month === '2026-04')?.paid,
    100,
  );
  assert.equal(
    invoices.find((invoice) => invoice.month === '2026-04')?.items.length,
    1,
  );
});

test('installments split exact cents and expose remaining plan progress', () => {
  assert.deepEqual(splitAmountIntoCents(100, 3), [3334, 3333, 3333]);
  const expenses = createInstallmentExpenses(
    {
      name: 'Compra',
      total: 100,
      count: 3,
      purchaseDate: '2026-01-31',
      cardId: card.id,
      category: 'parcela',
    },
    'plan-1',
  );
  assert.equal(
    expenses.reduce((total, expense) => total + expense.amount, 0),
    100,
  );
  assert.deepEqual(
    expenses.map((expense) => expense.date),
    ['2026-01-31', '2026-02-28', '2026-03-31'],
  );
  const progress = getInstallmentPlanProgress(expenses, 'plan-1', [
    { occurrenceKey: expenses[0].id, status: 'paid' },
  ]);
  assert.equal(progress.completed, 1);
  assert.equal(progress.remainingInstallments, 2);
  assert.equal(progress.remainingAmount, 66.66);
  assert.equal(progress.nextInstallment?.installmentNumber, 2);
});

test('budgets distinguish planned and paid use and exclude cancellation', () => {
  const budget: Budget = {
    id: 'budget-1',
    category: 'outro',
    monthlyLimit: 100,
    startMonth: '2026-01',
    createdAt: '',
    updatedAt: '',
  };
  const expenses: Expense[] = [
    {
      id: 'paid',
      name: 'Pago',
      amount: 70,
      category: 'outro',
      frequency: 'unica',
      date: '2026-01-05',
    },
    {
      id: 'cancelled',
      name: 'Cancelado',
      amount: 50,
      category: 'outro',
      frequency: 'unica',
      date: '2026-01-06',
    },
  ];
  const usage = getBudgetUsage(
    budget,
    expenses,
    [
      { occurrenceKey: 'paid', status: 'paid' },
      { occurrenceKey: 'cancelled', status: 'cancelled' },
    ],
    '2026-01',
    '2026-01-31',
  );
  assert.deepEqual(usage, {
    planned: 70,
    paid: 70,
    remaining: 30,
    percentageUsed: 0.7,
    projected: 70,
    overBudget: false,
  });
  assert.equal(
    budgetPeriodsOverlap(
      { ...budget, endMonth: '2026-01' },
      {
        ...budget,
        id: 'budget-2',
        startMonth: '2026-02',
      },
    ),
    false,
  );
  assert.equal(
    budgetPeriodsOverlap(budget, {
      ...budget,
      id: 'budget-3',
      startMonth: '2026-01',
      endMonth: '2026-02',
    }),
    true,
  );
});

test('goal progress is contribution-derived and preserves excess amount', () => {
  const goal: Goal = {
    id: 'goal-1',
    name: 'Reserva',
    targetAmount: 100,
    status: 'active',
    createdAt: '',
    updatedAt: '',
  };
  const progress = getGoalProgress(goal, [
    { id: 'contribution-1', goalId: goal.id, amount: 125, date: '2026-01-01' },
  ]);
  assert.equal(progress.saved, 125);
  assert.equal(progress.remaining, 0);
  assert.equal(progress.percentage, 1.25);
  assert.equal(progress.displayPercentage, 1);
  assert.equal(progress.completed, true);
});

test('monthly summaries use explicit boundaries and computed history overrides legacy overlap', () => {
  const incomes = [
    {
      id: 'income',
      name: 'Salario',
      amount: 100,
      type: 'salario' as const,
      frequency: 'mensal' as const,
      startMonth: '2026-12',
    },
  ];
  const expenses: Expense[] = [
    {
      id: 'expense',
      name: 'Plano',
      amount: 40,
      category: 'outro',
      frequency: 'mensal',
      startMonth: '2027-01',
    },
  ];
  assert.equal(
    getMonthlyFinanceSummary(incomes, expenses, [], '2026-11').income,
    0,
  );
  assert.equal(
    getMonthlyFinanceSummary(incomes, expenses, [], '2026-12').income,
    100,
  );
  assert.equal(
    getMonthlyFinanceSummary(incomes, expenses, [], '2027-01').expense,
    40,
  );
  const series = buildDashboardSeries(
    [
      { month: '2026-12', income: 1, expense: 1 },
      { month: '2026-11', income: 9, expense: 9 },
    ],
    incomes,
    expenses,
    '2027-01',
  );
  assert.deepEqual(series, [
    { month: '2026-11', income: 9, expense: 9 },
    { month: '2026-12', income: 100, expense: 0 },
    { month: '2027-01', income: 100, expense: 40 },
  ]);
});
