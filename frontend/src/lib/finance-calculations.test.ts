import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDashboardSeries,
  getAverageMonthlyExpense,
  getMonthKey,
  getMonthlyIncome,
  getPreviousSnapshot,
} from '@/lib/finance-calculations';
import type {
  Income,
  MonthlySnapshot,
  RecurringExpense,
} from '@/types/finance';

const expenses: RecurringExpense[] = [
  {
    id: 'expense-1',
    name: 'Internet',
    amount: 100,
    category: 'assinatura',
    frequency: 'mensal',
  },
];

test('month keys are deterministic and recurring income applies to any month', () => {
  assert.equal(getMonthKey('2026-04-15'), '2026-04');
  assert.equal(
    getMonthlyIncome(
      [
        {
          id: 'salary',
          name: 'Salário',
          amount: 7500,
          type: 'salario',
          frequency: 'mensal',
        },
      ],
      '2027-02',
    ),
    7500,
  );
});

test('one-time income is included only in its calendar month', () => {
  const incomes: Income[] = [
    {
      id: 'recurring',
      name: 'Salário',
      amount: 7500,
      type: 'salario',
      frequency: 'mensal',
    },
    {
      id: 'one-time',
      name: 'Bônus',
      amount: 500,
      type: 'outro',
      frequency: 'unica',
      date: '2026-04-15',
    },
  ];

  assert.equal(getMonthlyIncome(incomes, '2026-04'), 8000);
  assert.equal(getMonthlyIncome(incomes, '2026-05'), 7500);
});

test('dashboard series is immutable, unique, and chronological', () => {
  const history: MonthlySnapshot[] = [
    { month: '2026-03', income: 1200, expense: 500 },
    { month: '2026-01', income: 1000, expense: 400 },
  ];
  const originalHistory = history.map((snapshot) => ({ ...snapshot }));
  const incomes: Income[] = [
    {
      id: 'income-1',
      name: 'Mensal',
      amount: 2000,
      type: 'salario',
      frequency: 'mensal',
    },
  ];

  const inserted = buildDashboardSeries(history, incomes, expenses, '2026-02');
  assert.deepEqual(
    inserted.map((snapshot) => snapshot.month),
    ['2026-01', '2026-02', '2026-03'],
  );
  assert.deepEqual(history, originalHistory);

  const replaced = buildDashboardSeries(
    [...history, { month: '2026-02', income: 1, expense: 1 }],
    incomes,
    expenses,
    '2026-02',
  );
  assert.equal(
    replaced.filter((snapshot) => snapshot.month === '2026-02').length,
    1,
  );
  assert.deepEqual(replaced[1], {
    month: '2026-02',
    income: 2000,
    expense: 100,
  });
});

test('previous month lookup is calendar-based and missing data stays unavailable', () => {
  const history: MonthlySnapshot[] = [
    { month: '2026-01', income: 1000, expense: 400 },
    { month: '2026-03', income: 1200, expense: 500 },
  ];

  assert.equal(getPreviousSnapshot(history, '2026-04')?.month, '2026-03');
  assert.equal(getPreviousSnapshot(history, '2026-05'), undefined);
});

test('average expense replaces the current historical snapshot', () => {
  const history: MonthlySnapshot[] = [
    { month: '2026-01', income: 1000, expense: 400 },
    { month: '2026-02', income: 1000, expense: 600 },
  ];

  assert.equal(getAverageMonthlyExpense(history, 800, '2026-02'), 600);
  assert.equal(getAverageMonthlyExpense(history, 800, '2026-03'), 600);
});
