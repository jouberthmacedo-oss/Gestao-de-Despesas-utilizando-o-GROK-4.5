import {
  getMonthKey,
  isMonthKey,
  isValidDateString,
} from '@/lib/finance-calculations';
import {
  isValidDay,
  isValidMoneyAmount,
  isValidMonth,
  isValidName,
  isValidPositiveInteger,
} from '@/lib/finance-validation';
import type {
  Budget,
  Card,
  Expense,
  FinanceState,
  Goal,
  GoalContribution,
  Income,
  MonthlySnapshot,
  Settlement,
} from '@/types/finance';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null
    ? (value as UnknownRecord)
    : {};
}

function getPersistedState(value: unknown) {
  const root = asRecord(value);
  return 'state' in root ? asRecord(root.state) : root;
}

function getId(record: UnknownRecord, prefix: string, index: number) {
  return typeof record.id === 'string' && record.id.trim()
    ? record.id.trim()
    : `${prefix}-migrated-${index}`;
}

function migrateCards(value: unknown) {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap((item, index): Card[] => {
    const record = asRecord(item);
    const id = getId(record, 'card', index);
    if (!isValidName(record.name) || ids.has(id)) return [];
    ids.add(id);
    const card: Card = { id, name: record.name.trim() };
    if (isValidMoneyAmount(record.limit)) card.limit = record.limit;
    if (isValidDay(record.closingDay)) card.closingDay = record.closingDay;
    if (isValidDay(record.dueDay)) card.dueDay = record.dueDay;
    return [card];
  });
}

function migrateExpenses(
  value: unknown,
  cardIds: Set<string>,
  fallbackMonth: string,
) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index): Expense[] => {
    const record = asRecord(item);
    const frequency = record.frequency === 'unica' ? 'unica' : 'mensal';
    if (
      !isValidName(record.name) ||
      !isValidMoneyAmount(record.amount) ||
      !['assinatura', 'parcela', 'divida', 'outro'].includes(
        String(record.category),
      )
    )
      return [];
    if (frequency === 'unica' && !isValidDateString(record.date)) return [];
    const expense: Expense = {
      id: getId(record, 'exp', index),
      name: record.name.trim(),
      amount: record.amount,
      category: record.category as Expense['category'],
      frequency,
    };
    if (frequency === 'unica') expense.date = record.date as string;
    if (frequency === 'mensal') {
      expense.startMonth = isValidMonth(record.startMonth)
        ? (record.startMonth as string)
        : fallbackMonth;
      if (
        isValidMonth(record.endMonth) &&
        record.endMonth >= expense.startMonth
      )
        expense.endMonth = record.endMonth as string;
    }
    if (typeof record.cardId === 'string' && cardIds.has(record.cardId))
      expense.cardId = record.cardId;
    if (isValidDay(record.dueDay)) expense.dueDay = record.dueDay;
    if (typeof record.notes === 'string' && record.notes.trim())
      expense.notes = record.notes.trim();
    if (
      typeof record.installmentGroupId === 'string' &&
      record.installmentGroupId.trim()
    )
      expense.installmentGroupId = record.installmentGroupId.trim();
    if (isValidPositiveInteger(record.installmentNumber))
      expense.installmentNumber = record.installmentNumber as number;
    if (isValidPositiveInteger(record.installmentCount))
      expense.installmentCount = record.installmentCount as number;
    if (isValidMoneyAmount(record.originalTotal))
      expense.originalTotal = record.originalTotal as number;
    if (isValidDateString(record.purchaseDate))
      expense.purchaseDate = record.purchaseDate;
    return [expense];
  });
}

function migrateIncomes(value: unknown, fallbackMonth: string) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index): Income[] => {
    const record = asRecord(item);
    const frequency = record.frequency;
    const type = record.type;
    if (
      !isValidName(record.name) ||
      !isValidMoneyAmount(record.amount) ||
      !['salario', 'freelance', 'outro'].includes(String(type)) ||
      !['mensal', 'unica'].includes(String(frequency))
    )
      return [];
    if (frequency === 'unica' && !isValidDateString(record.date)) return [];
    const income: Income = {
      id: getId(record, 'inc', index),
      name: record.name.trim(),
      amount: record.amount,
      type: type as Income['type'],
      frequency: frequency as Income['frequency'],
    };
    if (frequency === 'unica') income.date = record.date as string;
    if (frequency === 'mensal') {
      income.startMonth = isValidMonth(record.startMonth)
        ? (record.startMonth as string)
        : fallbackMonth;
      if (isValidMonth(record.endMonth) && record.endMonth >= income.startMonth)
        income.endMonth = record.endMonth as string;
    }
    return [income];
  });
}

function migrateHistory(value: unknown) {
  if (!Array.isArray(value)) return [];
  const snapshots = new Map<string, MonthlySnapshot>();
  for (const item of value) {
    const record = asRecord(item);
    if (
      !isMonthKey(record.month) ||
      typeof record.income !== 'number' ||
      !Number.isFinite(record.income) ||
      record.income < 0 ||
      typeof record.expense !== 'number' ||
      !Number.isFinite(record.expense) ||
      record.expense < 0
    )
      continue;
    snapshots.set(record.month, {
      month: record.month,
      income: record.income,
      expense: record.expense,
    });
  }
  return [...snapshots.values()].sort((left, right) =>
    left.month.localeCompare(right.month),
  );
}

function migrateSettlements(value: unknown) {
  if (!Array.isArray(value)) return [];
  const keys = new Set<string>();
  return value.flatMap((item): Settlement[] => {
    const record = asRecord(item);
    if (
      typeof record.occurrenceKey !== 'string' ||
      keys.has(record.occurrenceKey) ||
      !['pending', 'paid', 'received', 'cancelled'].includes(
        String(record.status),
      )
    )
      return [];
    keys.add(record.occurrenceKey);
    const settlement: Settlement = {
      occurrenceKey: record.occurrenceKey,
      status: record.status as Settlement['status'],
    };
    if (
      typeof record.settledAt === 'string' &&
      Number.isFinite(Date.parse(record.settledAt))
    )
      settlement.settledAt = record.settledAt;
    if (
      typeof record.cancelledAt === 'string' &&
      Number.isFinite(Date.parse(record.cancelledAt))
    )
      settlement.cancelledAt = record.cancelledAt;
    if (typeof record.reason === 'string' && record.reason.trim())
      settlement.reason = record.reason.trim();
    return [settlement];
  });
}

function migrateBudgets(value: unknown, now: string) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index): Budget[] => {
    const record = asRecord(item);
    if (
      !isValidName(record.category) ||
      !isValidMoneyAmount(record.monthlyLimit) ||
      !['assinatura', 'parcela', 'divida', 'outro'].includes(
        String(record.category),
      )
    )
      return [];
    const budget: Budget = {
      id: getId(record, 'budget', index),
      category: record.category as Budget['category'],
      monthlyLimit: record.monthlyLimit,
      createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now,
    };
    if (isValidMonth(record.startMonth)) budget.startMonth = record.startMonth;
    if (
      isValidMonth(record.endMonth) &&
      (!budget.startMonth || record.endMonth >= budget.startMonth)
    )
      budget.endMonth = record.endMonth;
    return [budget];
  });
}

function migrateGoals(value: unknown, now: string) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index): Goal[] => {
    const record = asRecord(item);
    if (
      !isValidName(record.name) ||
      !isValidMoneyAmount(record.targetAmount) ||
      !['active', 'completed', 'archived'].includes(
        String(record.status ?? 'active'),
      )
    )
      return [];
    const goal: Goal = {
      id: getId(record, 'goal', index),
      name: record.name.trim(),
      targetAmount: record.targetAmount,
      status: (record.status ?? 'active') as Goal['status'],
      createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now,
    };
    if (isValidDateString(record.targetDate))
      goal.targetDate = record.targetDate;
    return [goal];
  });
}

function migrateContributions(value: unknown, goalIds: Set<string>) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index): GoalContribution[] => {
    const record = asRecord(item);
    if (
      typeof record.goalId !== 'string' ||
      !goalIds.has(record.goalId) ||
      !isValidMoneyAmount(record.amount) ||
      !isValidDateString(record.date)
    )
      return [];
    return [
      {
        id: getId(record, 'contribution', index),
        goalId: record.goalId,
        amount: record.amount,
        date: record.date,
        ...(typeof record.note === 'string' && record.note.trim()
          ? { note: record.note.trim() }
          : {}),
      },
    ];
  });
}

export function cloneFinanceState(state: FinanceState): FinanceState {
  return {
    profile: {
      ...state.profile,
      cards: state.profile.cards.map((card) => ({ ...card })),
    },
    expenses: state.expenses.map((expense) => ({ ...expense })),
    incomes: state.incomes.map((income) => ({ ...income })),
    history: state.history.map((snapshot) => ({ ...snapshot })),
    settlements: state.settlements.map((settlement) => ({ ...settlement })),
    budgets: state.budgets.map((budget) => ({ ...budget })),
    goals: state.goals.map((goal) => ({ ...goal })),
    contributions: state.contributions.map((contribution) => ({
      ...contribution,
    })),
  };
}

export function migrateFinanceState(
  persistedState: unknown,
  _version = 0,
  fallbackMonth = getMonthKey(),
  now = new Date().toISOString(),
): FinanceState {
  const root = getPersistedState(persistedState);
  const persistedProfile = asRecord(root.profile);
  const cards = migrateCards(persistedProfile.cards);
  const expenses = migrateExpenses(
    root.expenses,
    new Set(cards.map((card) => card.id)),
    fallbackMonth,
  );
  const incomes = migrateIncomes(root.incomes, fallbackMonth);
  const legacySalary = persistedProfile.salary;
  if (
    isValidMoneyAmount(legacySalary) &&
    !incomes.some(
      (income) => income.type === 'salario' && income.frequency === 'mensal',
    )
  ) {
    incomes.push({
      id: 'inc-legacy-salary',
      name: 'Salario',
      amount: legacySalary,
      type: 'salario',
      frequency: 'mensal',
      startMonth: fallbackMonth,
    });
  }
  const goals = migrateGoals(root.goals, now);
  return {
    profile: {
      name: isValidName(persistedProfile.name)
        ? persistedProfile.name.trim()
        : '',
      notes:
        typeof persistedProfile.notes === 'string' &&
        persistedProfile.notes.trim()
          ? persistedProfile.notes.trim()
          : undefined,
      cards,
    },
    expenses,
    incomes,
    history: migrateHistory(root.history),
    settlements: migrateSettlements(root.settlements),
    budgets: migrateBudgets(root.budgets, now),
    goals,
    contributions: migrateContributions(
      root.contributions,
      new Set(goals.map((goal) => goal.id)),
    ),
  };
}

export function hasUsablePersistedState(raw: string | null) {
  if (!raw) return false;
  try {
    const state = getPersistedState(JSON.parse(raw));
    return (
      'profile' in state ||
      'expenses' in state ||
      'incomes' in state ||
      'history' in state ||
      'budgets' in state ||
      'goals' in state
    );
  } catch {
    return false;
  }
}
