import {
  addMonthsToDate,
  formatMonthKey,
  getDateForMonth,
  getExpenseOccurrenceDate,
  getExpenseOccurrenceKey,
  getMonthKey,
  getMonthKeysBetween,
  getNextMonthKey,
  getSettlementStatus,
  getTodayDateString,
  isMonthInRange,
  isValidDateString,
} from '@/lib/finance-calculations';
import type {
  Budget,
  Card,
  Expense,
  ExpenseCategory,
  Goal,
  GoalContribution,
  Settlement,
} from '@/types/finance';

export type InvoiceItem = {
  expense: Expense;
  occurrenceDate: string;
  occurrenceKey: string;
  status: 'pending' | 'paid' | 'cancelled';
  overdue: boolean;
};

export type CardInvoice = {
  key: string;
  cardId: string;
  month: string;
  closingDate: string;
  dueDate: string;
  items: InvoiceItem[];
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  usedLimit?: number;
  availableLimit?: number;
};

export function getClosingDate(monthKey: string, closingDay: number) {
  return getDateForMonth(monthKey, closingDay);
}

export function getDueDate(closingDate: string, dueDay: number) {
  if (!isValidDateString(closingDate))
    throw new Error('Data de fechamento invalida');
  const monthKey = getMonthKey(closingDate);
  const closingDay = Number(closingDate.slice(8, 10));
  const dueMonth = dueDay > closingDay ? monthKey : getNextMonthKey(monthKey);
  const candidate = getDateForMonth(dueMonth, dueDay);
  return candidate > closingDate
    ? candidate
    : getDateForMonth(getNextMonthKey(monthKey), dueDay);
}

export function getInvoiceCycleForDate(card: Card, occurrenceDate: string) {
  if (!card.closingDay || !card.dueDay || !isValidDateString(occurrenceDate))
    return null;
  let month = getMonthKey(occurrenceDate);
  let closingDate = getClosingDate(month, card.closingDay);
  if (closingDate < occurrenceDate) {
    month = getNextMonthKey(month);
    closingDate = getClosingDate(month, card.closingDay);
  }
  return {
    key: `${card.id}:${month}`,
    month,
    closingDate,
    dueDate: getDueDate(closingDate, card.dueDay),
  };
}

export function getInvoiceMonthKey(card: Card, occurrenceDate: string) {
  return getInvoiceCycleForDate(card, occurrenceDate)?.month;
}

export function getInvoiceForOccurrence(
  card: Card,
  expense: Expense,
  monthKey?: string,
) {
  const occurrenceDate = getExpenseOccurrenceDate(expense, monthKey);
  return occurrenceDate ? getInvoiceCycleForDate(card, occurrenceDate) : null;
}

export function getInvoiceOccurrenceDate(card: Card, occurrenceDate: string) {
  return getInvoiceCycleForDate(card, occurrenceDate)?.closingDate;
}

function invoiceMonths(startMonth: string, endMonth: string) {
  return getMonthKeysBetween(startMonth, endMonth);
}

export function getCardInvoices(
  card: Card,
  expenses: Expense[],
  settlements: Settlement[],
  startMonth: string,
  endMonth: string,
  today = getTodayDateString(),
): CardInvoice[] {
  if (!card.closingDay || !card.dueDay) return [];
  const invoices = new Map<string, CardInvoice>();
  for (const month of invoiceMonths(startMonth, endMonth)) {
    const closingDate = getClosingDate(month, card.closingDay);
    const cycle: CardInvoice = {
      key: `${card.id}:${month}`,
      cardId: card.id,
      month,
      closingDate,
      dueDate: getDueDate(closingDate, card.dueDay),
      items: [],
      total: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
    };
    if (card.limit !== undefined) {
      cycle.usedLimit = 0;
      cycle.availableLimit = card.limit;
    }
    invoices.set(cycle.key, cycle);
  }

  for (const expense of expenses) {
    if (expense.cardId !== card.id) continue;
    if (expense.frequency === 'unica' && !isValidDateString(expense.date))
      continue;
    const occurrenceMonths =
      expense.frequency === 'unica'
        ? [getMonthKey(expense.date as string)]
        : invoiceMonths(startMonth, endMonth).filter((month) =>
            isMonthInRange(month, expense.startMonth, expense.endMonth),
          );
    for (const month of occurrenceMonths) {
      const occurrenceDate = getExpenseOccurrenceDate(expense, month);
      const cycle = occurrenceDate
        ? getInvoiceCycleForDate(card, occurrenceDate)
        : null;
      const invoice = cycle ? invoices.get(cycle.key) : undefined;
      if (!invoice || !occurrenceDate) continue;
      const occurrenceKey = getExpenseOccurrenceKey(expense, month);
      const status = getSettlementStatus(
        settlements,
        occurrenceKey,
        'expense',
        occurrenceDate,
        today,
      );
      if (status === 'received') continue;
      const item = {
        expense,
        occurrenceDate,
        occurrenceKey,
        status:
          status === 'cancelled'
            ? 'cancelled'
            : status === 'paid'
              ? 'paid'
              : 'pending',
        overdue: status === 'pending' && invoice.dueDate < today,
      } satisfies InvoiceItem;
      invoice.items.push(item);
      if (status !== 'cancelled') invoice.total += expense.amount;
      if (status === 'paid') invoice.paid += expense.amount;
      if (status === 'pending') {
        invoice.pending += expense.amount;
        if (item.overdue) invoice.overdue += expense.amount;
      }
    }
  }

  for (const invoice of invoices.values()) {
    invoice.items.sort(
      (left, right) =>
        left.occurrenceDate.localeCompare(right.occurrenceDate) ||
        left.expense.id.localeCompare(right.expense.id),
    );
    if (
      invoice.usedLimit !== undefined &&
      invoice.availableLimit !== undefined
    ) {
      invoice.usedLimit = invoice.total;
      invoice.availableLimit = invoice.availableLimit - invoice.usedLimit;
    }
  }
  return [...invoices.values()].sort((left, right) =>
    left.closingDate.localeCompare(right.closingDate),
  );
}

export function getCurrentOpenInvoice(
  card: Card,
  today = getTodayDateString(),
) {
  return getInvoiceCycleForDate(card, today);
}

export function getNextInvoice(card: Card, today = getTodayDateString()) {
  const current = getCurrentOpenInvoice(card, today);
  if (!current) return null;
  const month = getNextMonthKey(current.month);
  const closingDate = getClosingDate(month, card.closingDay ?? 1);
  return {
    ...current,
    key: `${card.id}:${month}`,
    month,
    closingDate,
    dueDate: getDueDate(closingDate, card.dueDay ?? 1),
  };
}

export function getPriorInvoices(
  card: Card,
  count: number,
  today = getTodayDateString(),
) {
  const current = getCurrentOpenInvoice(card, today);
  if (!current || count <= 0) return [];
  const invoices = [];
  let month = current.month;
  for (let index = 0; index < count; index += 1) {
    month = formatMonthKey(
      Number(month.slice(0, 4)),
      Number(month.slice(5, 7)) - 1,
    );
    if (month.endsWith('-00')) month = `${Number(month.slice(0, 4)) - 1}-12`;
    const closingDate = getClosingDate(month, card.closingDay ?? 1);
    invoices.push({
      key: `${card.id}:${month}`,
      month,
      closingDate,
      dueDate: getDueDate(closingDate, card.dueDay ?? 1),
    });
  }
  return invoices;
}

export type InstallmentInput = {
  name: string;
  total: number;
  count: number;
  purchaseDate: string;
  cardId: string;
  category: ExpenseCategory;
  notes?: string;
};

export function splitAmountIntoCents(total: number, count: number) {
  const totalCents = Math.round(total * 100);
  if (
    !Number.isInteger(totalCents) ||
    totalCents <= 0 ||
    !Number.isInteger(count) ||
    count <= 0
  )
    return [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  return Array.from(
    { length: count },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}

export function createInstallmentExpenses(
  input: InstallmentInput,
  groupId: string,
): Expense[] {
  const cents = splitAmountIntoCents(input.total, input.count);
  if (!isValidDateString(input.purchaseDate) || cents.length === 0) return [];
  return cents.map((amountCents, index) => {
    const date = addMonthsToDate(input.purchaseDate, index);
    return {
      id: `${groupId}-${index + 1}`,
      name: input.name.trim(),
      amount: amountCents / 100,
      category: input.category,
      frequency: 'unica',
      cardId: input.cardId,
      date,
      notes: input.notes?.trim() || undefined,
      installmentGroupId: groupId,
      installmentNumber: index + 1,
      installmentCount: input.count,
      originalTotal: input.total,
      purchaseDate: input.purchaseDate,
    };
  });
}

export function getInstallmentPlanProgress(
  expenses: Expense[],
  groupId: string,
  settlements: Settlement[],
) {
  const items = expenses
    .filter((expense) => expense.installmentGroupId === groupId)
    .sort(
      (left, right) =>
        (left.installmentNumber ?? 0) - (right.installmentNumber ?? 0),
    );
  const completed = items.filter(
    (expense) =>
      getSettlementStatus(settlements, expense.id, 'expense', expense.date) ===
      'paid',
  ).length;
  const remainingItems = items.filter(
    (expense) =>
      getSettlementStatus(settlements, expense.id, 'expense', expense.date) !==
        'paid' &&
      getSettlementStatus(settlements, expense.id, 'expense', expense.date) !==
        'cancelled',
  );
  return {
    groupId,
    items,
    completed,
    remainingInstallments: remainingItems.length,
    remainingAmount: remainingItems.reduce(
      (total, expense) => total + expense.amount,
      0,
    ),
    nextInstallment: remainingItems[0],
    complete: remainingItems.length === 0 && items.length > 0,
  };
}

export function budgetIsActive(budget: Budget, monthKey: string) {
  return isMonthInRange(monthKey, budget.startMonth, budget.endMonth);
}

export function budgetPeriodsOverlap(left: Budget, right: Budget) {
  const leftStart = left.startMonth ?? '0000-01';
  const rightStart = right.startMonth ?? '0000-01';
  const leftEnd = left.endMonth ?? '9999-12';
  const rightEnd = right.endMonth ?? '9999-12';
  return (
    left.category === right.category &&
    leftStart <= rightEnd &&
    rightStart <= leftEnd
  );
}

export function getBudgetUsage(
  budget: Budget,
  expenses: Expense[],
  settlements: Settlement[],
  monthKey: string,
  today = getTodayDateString(),
) {
  const relevant = expenses.filter(
    (expense) =>
      expense.category === budget.category &&
      isMonthInRange(monthKey, expense.startMonth, expense.endMonth) &&
      (expense.frequency === 'unica'
        ? isValidDateString(expense.date) &&
          getMonthKey(expense.date) === monthKey
        : true),
  );
  let planned = 0;
  let paid = 0;
  for (const expense of relevant) {
    const date = getExpenseOccurrenceDate(expense, monthKey);
    const status = getSettlementStatus(
      settlements,
      getExpenseOccurrenceKey(expense, monthKey),
      'expense',
      date,
      today,
    );
    if (status === 'cancelled') continue;
    planned += expense.amount;
    if (status === 'paid') paid += expense.amount;
  }
  return {
    planned,
    paid,
    remaining: budget.monthlyLimit - planned,
    percentageUsed: budget.monthlyLimit > 0 ? planned / budget.monthlyLimit : 0,
    projected: planned,
    overBudget: planned > budget.monthlyLimit,
  };
}

export function getGoalProgress(goal: Goal, contributions: GoalContribution[]) {
  const saved = contributions
    .filter((contribution) => contribution.goalId === goal.id)
    .reduce((total, contribution) => total + contribution.amount, 0);
  return {
    saved,
    remaining: Math.max(0, goal.targetAmount - saved),
    percentage: goal.targetAmount > 0 ? saved / goal.targetAmount : 0,
    displayPercentage:
      goal.targetAmount > 0 ? Math.min(1, saved / goal.targetAmount) : 0,
    completed: saved >= goal.targetAmount,
  };
}

export function getActiveGoals(goals: Goal[]) {
  return goals.filter((goal) => goal.status !== 'archived');
}
