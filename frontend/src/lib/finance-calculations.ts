import type {
  Expense,
  Income,
  MonthlySnapshot,
  Settlement,
  SettlementStatus,
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
    if (MONTH_KEY_PATTERN.test(value)) return value;
    if (isValidDateString(value)) return value.slice(0, 7);
    throw new Error('Data invalida para calcular o mes');
  }

  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function getTodayDateString(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function getPreviousMonthKey(monthKey: string) {
  if (!isMonthKey(monthKey)) throw new Error('Mes invalido');
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  return formatMonthKey(
    month === 1 ? year - 1 : year,
    month === 1 ? 12 : month - 1,
  );
}

export function getNextMonthKey(monthKey: string) {
  if (!isMonthKey(monthKey)) throw new Error('Mes invalido');
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  return formatMonthKey(
    month === 12 ? year + 1 : year,
    month === 12 ? 1 : month + 1,
  );
}

export function formatMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getMonthKeysBetween(startMonth: string, endMonth: string) {
  if (!isMonthKey(startMonth) || !isMonthKey(endMonth) || startMonth > endMonth)
    return [];
  const months: string[] = [];
  let current = startMonth;
  while (current <= endMonth) {
    months.push(current);
    current = getNextMonthKey(current);
  }
  return months;
}

export function getDaysInMonth(monthKey: string) {
  if (!isMonthKey(monthKey)) throw new Error('Mes invalido');
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getDateForMonth(monthKey: string, day = 1) {
  if (!isMonthKey(monthKey)) throw new Error('Mes invalido');
  const safeDay = Math.min(Math.max(day, 1), getDaysInMonth(monthKey));
  return `${monthKey}-${String(safeDay).padStart(2, '0')}`;
}

export function addMonthsToDate(dateString: string, months: number) {
  if (!isValidDateString(dateString)) throw new Error('Data invalida');
  let monthKey = getMonthKey(dateString);
  const step = months < 0 ? -1 : 1;
  for (let index = 0; index < Math.abs(months); index += 1) {
    monthKey =
      step > 0 ? getNextMonthKey(monthKey) : getPreviousMonthKey(monthKey);
  }
  return getDateForMonth(monthKey, Number(dateString.slice(8, 10)));
}

export function isMonthInRange(
  monthKey: string,
  startMonth?: string,
  endMonth?: string,
) {
  return (
    isMonthKey(monthKey) &&
    (!startMonth || monthKey >= startMonth) &&
    (!endMonth || monthKey <= endMonth)
  );
}

export function isExpenseActive(expense: Expense, monthKey: string) {
  if (expense.frequency === 'unica')
    return (
      isValidDateString(expense.date) && getMonthKey(expense.date) === monthKey
    );
  return isMonthInRange(monthKey, expense.startMonth, expense.endMonth);
}

export function isIncomeActive(income: Income, monthKey: string) {
  if (income.frequency === 'unica')
    return (
      isValidDateString(income.date) && getMonthKey(income.date) === monthKey
    );
  return isMonthInRange(monthKey, income.startMonth, income.endMonth);
}

export function getExpenseOccurrenceDate(expense: Expense, monthKey?: string) {
  if (expense.frequency === 'unica') return expense.date;
  if (!monthKey || !isExpenseActive(expense, monthKey)) return undefined;
  return getDateForMonth(monthKey, expense.dueDay ?? 1);
}

export function getIncomeOccurrenceDate(income: Income, monthKey?: string) {
  if (income.frequency === 'unica') return income.date;
  return monthKey && isIncomeActive(income, monthKey)
    ? getDateForMonth(monthKey, 1)
    : undefined;
}

export function getExpenseOccurrenceKey(expense: Expense, monthKey?: string) {
  return expense.frequency === 'mensal'
    ? `${expense.id}:${monthKey ?? ''}`
    : expense.id;
}

export function getIncomeOccurrenceKey(income: Income, monthKey?: string) {
  return income.frequency === 'mensal'
    ? `${income.id}:${monthKey ?? ''}`
    : income.id;
}

export function getSettlementStatus(
  settlements: Settlement[],
  occurrenceKey: string,
  kind: 'expense' | 'income',
  expectedDate?: string,
  today = getTodayDateString(),
): SettlementStatus {
  const stored = settlements.find(
    (item) => item.occurrenceKey === occurrenceKey,
  );
  if (stored) return stored.status;
  if (expectedDate && expectedDate < today) return 'pending';
  return kind === 'expense' ? 'pending' : 'pending';
}

export function getMonthlyIncome(incomes: Income[], monthKey = getMonthKey()) {
  return incomes.reduce(
    (total, income) =>
      isIncomeActive(income, monthKey) ? total + income.amount : total,
    0,
  );
}

export function getMonthlyExpenses(
  expenses: Expense[],
  monthKey = getMonthKey(),
) {
  return expenses.reduce(
    (total, expense) =>
      isExpenseActive(expense, monthKey) ? total + expense.amount : total,
    0,
  );
}

export type MonthlyFinanceSummary = {
  income: number;
  expense: number;
  paidExpense: number;
  receivedIncome: number;
  pendingExpense: number;
  pendingIncome: number;
  overdueExpense: number;
  overdueIncome: number;
  balance: number;
  remainingObligations: number;
};

export function getMonthlyFinanceSummary(
  incomes: Income[],
  expenses: Expense[],
  settlements: Settlement[],
  monthKey = getMonthKey(),
  today = getTodayDateString(),
): MonthlyFinanceSummary {
  const summary: MonthlyFinanceSummary = {
    income: 0,
    expense: 0,
    paidExpense: 0,
    receivedIncome: 0,
    pendingExpense: 0,
    pendingIncome: 0,
    overdueExpense: 0,
    overdueIncome: 0,
    balance: 0,
    remainingObligations: 0,
  };

  for (const income of incomes) {
    if (!isIncomeActive(income, monthKey)) continue;
    const date = getIncomeOccurrenceDate(income, monthKey);
    const status = getSettlementStatus(
      settlements,
      getIncomeOccurrenceKey(income, monthKey),
      'income',
      date,
      today,
    );
    if (status === 'cancelled') continue;
    summary.income += income.amount;
    if (status === 'received') summary.receivedIncome += income.amount;
    if (status === 'pending') {
      summary.pendingIncome += income.amount;
      if (date && date < today) summary.overdueIncome += income.amount;
    }
  }

  for (const expense of expenses) {
    if (!isExpenseActive(expense, monthKey)) continue;
    const date = getExpenseOccurrenceDate(expense, monthKey);
    const status = getSettlementStatus(
      settlements,
      getExpenseOccurrenceKey(expense, monthKey),
      'expense',
      date,
      today,
    );
    if (status === 'cancelled') continue;
    summary.expense += expense.amount;
    if (status === 'paid') summary.paidExpense += expense.amount;
    if (status === 'pending') {
      summary.pendingExpense += expense.amount;
      summary.remainingObligations += expense.amount;
      if (date && date < today) summary.overdueExpense += expense.amount;
    }
  }

  summary.balance = summary.income - summary.expense;
  return summary;
}

export function getCurrentSnapshot(
  incomes: Income[],
  expenses: Expense[],
  monthKey = getMonthKey(),
): MonthlySnapshot {
  return {
    month: monthKey,
    income: getMonthlyIncome(incomes, monthKey),
    expense: getMonthlyExpenses(expenses, monthKey),
  };
}

function hasDatedRecordForMonth(
  incomes: Income[],
  expenses: Expense[],
  monthKey: string,
) {
  return (
    incomes.some(
      (income) =>
        Boolean(income.startMonth || income.endMonth || income.date) &&
        isIncomeActive(income, monthKey),
    ) ||
    expenses.some(
      (expense) =>
        Boolean(expense.startMonth || expense.endMonth || expense.date) &&
        isExpenseActive(expense, monthKey),
    )
  );
}

export function buildDashboardSeries(
  history: MonthlySnapshot[],
  incomes: Income[],
  expenses: Expense[],
  monthKey = getMonthKey(),
) {
  const snapshots = new Map<string, MonthlySnapshot>();
  for (const snapshot of history) {
    if (isMonthKey(snapshot.month))
      snapshots.set(snapshot.month, { ...snapshot });
  }

  for (const month of snapshots.keys()) {
    if (hasDatedRecordForMonth(incomes, expenses, month))
      snapshots.set(month, getCurrentSnapshot(incomes, expenses, month));
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
  return history.find(
    (snapshot) => snapshot.month === getPreviousMonthKey(currentMonthKey),
  );
}

export function getAverageMonthlyExpense(
  history: MonthlySnapshot[],
  currentExpense: number,
  currentMonthKey = getMonthKey(),
) {
  const expenses = new Map<string, number>();
  for (const snapshot of history) {
    if (isMonthKey(snapshot.month))
      expenses.set(snapshot.month, snapshot.expense);
  }
  expenses.set(currentMonthKey, currentExpense);
  return expenses.size === 0
    ? 0
    : [...expenses.values()].reduce((total, expense) => total + expense, 0) /
        expenses.size;
}
