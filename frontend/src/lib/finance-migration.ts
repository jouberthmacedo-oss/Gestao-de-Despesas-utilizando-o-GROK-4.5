import { isMonthKey, isValidDateString } from '@/lib/finance-calculations';
import {
  isValidDay,
  isValidMoneyAmount,
  isValidName,
} from '@/lib/finance-validation';
import type {
  Card,
  FinanceState,
  Income,
  MonthlySnapshot,
  RecurringExpense,
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

function migrateCards(value: unknown) {
  if (!Array.isArray(value)) return [];

  const ids = new Set<string>();
  return value.flatMap((item, index): Card[] => {
    const record = asRecord(item);
    if (!isValidName(record.name)) return [];

    const candidateId =
      typeof record.id === 'string' && record.id.trim()
        ? record.id.trim()
        : `card-migrated-${index}`;
    if (ids.has(candidateId)) return [];
    ids.add(candidateId);

    const card: Card = {
      id: candidateId,
      name: record.name.trim(),
    };

    if (isValidMoneyAmount(record.limit)) card.limit = record.limit;
    if (isValidDay(record.closingDay)) card.closingDay = record.closingDay;
    if (isValidDay(record.dueDay)) card.dueDay = record.dueDay;

    return [card];
  });
}

function migrateExpenses(value: unknown, cardIds: Set<string>) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index): RecurringExpense[] => {
    const record = asRecord(item);
    if (
      !isValidName(record.name) ||
      !isValidMoneyAmount(record.amount) ||
      !['assinatura', 'parcela', 'divida', 'outro'].includes(
        String(record.category),
      )
    ) {
      return [];
    }

    const expense: RecurringExpense = {
      id:
        typeof record.id === 'string' && record.id.trim()
          ? record.id.trim()
          : `exp-migrated-${index}`,
      name: record.name.trim(),
      amount: record.amount,
      category: record.category as RecurringExpense['category'],
      frequency: 'mensal',
    };

    if (typeof record.cardId === 'string' && cardIds.has(record.cardId)) {
      expense.cardId = record.cardId;
    }
    if (isValidDay(record.dueDay)) expense.dueDay = record.dueDay;
    if (typeof record.notes === 'string' && record.notes.trim()) {
      expense.notes = record.notes.trim();
    }

    return [expense];
  });
}

function migrateIncomes(value: unknown) {
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
    ) {
      return [];
    }

    const income: Income = {
      id:
        typeof record.id === 'string' && record.id.trim()
          ? record.id.trim()
          : `inc-migrated-${index}`,
      name: record.name.trim(),
      amount: record.amount,
      type: type as Income['type'],
      frequency: frequency as Income['frequency'],
    };

    if (frequency === 'unica') {
      if (!isValidDateString(record.date)) return [];
      income.date = record.date;
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
    ) {
      continue;
    }

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

export function cloneFinanceState(state: FinanceState): FinanceState {
  return {
    profile: {
      ...state.profile,
      cards: state.profile.cards.map((card) => ({ ...card })),
    },
    expenses: state.expenses.map((expense) => ({ ...expense })),
    incomes: state.incomes.map((income) => ({ ...income })),
    history: state.history.map((snapshot) => ({ ...snapshot })),
  };
}

export function migrateFinanceState(
  persistedState: unknown,
  _version = 0,
): FinanceState {
  const root = getPersistedState(persistedState);
  const persistedProfile = asRecord(root.profile);
  const cards = migrateCards(persistedProfile.cards);
  const cardIds = new Set(cards.map((card) => card.id));
  const expenses = migrateExpenses(root.expenses, cardIds);
  const incomes = migrateIncomes(root.incomes);
  const legacySalary = persistedProfile.salary;
  const hasRecurringSalary = incomes.some(
    (income) => income.type === 'salario' && income.frequency === 'mensal',
  );

  if (isValidMoneyAmount(legacySalary) && !hasRecurringSalary) {
    incomes.push({
      id: 'inc-legacy-salary',
      name: 'Salário',
      amount: legacySalary,
      type: 'salario',
      frequency: 'mensal',
    });
  }

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
      'history' in state
    );
  } catch {
    return false;
  }
}
