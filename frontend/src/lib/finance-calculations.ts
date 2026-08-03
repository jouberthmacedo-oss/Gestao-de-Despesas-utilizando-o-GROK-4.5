import type {
  Income,
  MonthlySnapshot,
  RecurringExpense,
} from '@/types/finance';

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isMonthKey(value: unknown): value is string {
  return typeof value === 'string' && MONTH_KEY_PATTERN.test(value);
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function getMonthKey(value: Date | string = new Date()) {
  if (typeof value === 'string') {
    if (isMonthKey(value)) return value;
    const dateValue: string = value;
    if (isValidDateString(dateValue)) return dateValue.slice(0, 7);
    throw new Error('Data inválida para calcular o mês');
  }

  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

export function getPreviousMonthKey(monthKey: string) {
  if (!isMonthKey(monthKey)) throw new Error('Mês inválido');

  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;

  return `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
}

export function getMonthlyIncome(incomes: Income[], monthKey = getMonthKey()) {
  return incomes.reduce((total, income) => {
    if (income.frequency === 'mensal') return total + income.amount;
    if (
      isValidDateString(income.date) &&
      getMonthKey(income.date) === monthKey
    ) {
      return total + income.amount;
    }
    return total;
  }, 0);
}

export function getMonthlyExpenses(expenses: RecurringExpense[]) {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

export function getCurrentSnapshot(
  incomes: Income[],
  expenses: RecurringExpense[],
  monthKey = getMonthKey(),
): MonthlySnapshot {
  return {
    month: monthKey,
    income: getMonthlyIncome(incomes, monthKey),
    expense: getMonthlyExpenses(expenses),
  };
}

export function buildDashboardSeries(
  history: MonthlySnapshot[],
  incomes: Income[],
  expenses: RecurringExpense[],
  monthKey = getMonthKey(),
) {
  const snapshots = new Map<string, MonthlySnapshot>();

  for (const snapshot of history) {
    if (isMonthKey(snapshot.month)) {
      snapshots.set(snapshot.month, { ...snapshot });
    }
  }

  snapshots.set(monthKey, getCurrentSnapshot(incomes, expenses, monthKey));

  return [...snapshots.values()].sort((left, right) =>
    left.month.localeCompare(right.month),
  );
}

export function getPreviousSnapshot(
  history: MonthlySnapshot[],
  currentMonthKey = getMonthKey(),
) {
  const previousMonthKey = getPreviousMonthKey(currentMonthKey);
  return history.find((snapshot) => snapshot.month === previousMonthKey);
}

export function getAverageMonthlyExpense(
  history: MonthlySnapshot[],
  currentExpense: number,
  currentMonthKey = getMonthKey(),
) {
  const expenses = new Map<string, number>();

  for (const snapshot of history) {
    if (isMonthKey(snapshot.month)) {
      expenses.set(snapshot.month, snapshot.expense);
    }
  }

  expenses.set(currentMonthKey, currentExpense);

  return (
    [...expenses.values()].reduce((total, expense) => total + expense, 0) /
    expenses.size
  );
}
