import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  buildDashboardSeries,
  getAverageMonthlyExpense,
  getCurrentSnapshot,
  getMonthKey,
  getMonthlyExpenses,
  getMonthlyIncome,
  getPreviousSnapshot,
} from '@/lib/finance-calculations';
import {
  cloneFinanceState,
  migrateFinanceState,
} from '@/lib/finance-migration';
import {
  createFinanceStorage,
  FINANCE_STORAGE_KEY,
} from '@/lib/finance-storage';
import {
  isValidIncomeDate,
  isValidMoneyAmount,
  isValidName,
  isValidOptionalDay,
  isValidOptionalMoneyAmount,
} from '@/lib/finance-validation';
import { createId } from '@/lib/format';
import type {
  Card,
  FinanceState,
  Income,
  Profile,
  RecurringExpense,
} from '@/types/finance';

type FinanceActions = {
  updateProfile: (patch: Partial<Omit<Profile, 'cards'>>) => void;
  addCard: (card: Omit<Card, 'id'>) => void;
  updateCard: (id: string, patch: Partial<Omit<Card, 'id'>>) => void;
  removeCard: (id: string) => void;
  addExpense: (expense: Omit<RecurringExpense, 'id'>) => void;
  updateExpense: (
    id: string,
    patch: Partial<Omit<RecurringExpense, 'id'>>,
  ) => void;
  removeExpense: (id: string) => void;
  addIncome: (income: Omit<Income, 'id'>) => void;
  updateIncome: (id: string, patch: Partial<Omit<Income, 'id'>>) => void;
  removeIncome: (id: string) => void;
  clearAll: () => void;
};

export type FinanceStore = FinanceState & FinanceActions;

const emptyFinanceState: FinanceState = {
  profile: {
    name: '',
    notes: undefined,
    cards: [],
  },
  expenses: [],
  incomes: [],
  history: [],
};

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, value: string) => values.set(name, value),
    removeItem: (name: string) => values.delete(name),
  };
}

function getRawStorage() {
  if (typeof window === 'undefined') return createMemoryStorage();
  return window.localStorage;
}

function normalizeCard(card: Card): Card | null {
  if (
    !isValidName(card.name) ||
    !isValidOptionalMoneyAmount(card.limit) ||
    !isValidOptionalDay(card.closingDay) ||
    !isValidOptionalDay(card.dueDay)
  ) {
    return null;
  }

  return { ...card, name: card.name.trim() };
}

function normalizeExpense(
  expense: RecurringExpense,
  cardIds: Set<string>,
): RecurringExpense | null {
  if (
    !isValidName(expense.name) ||
    !isValidMoneyAmount(expense.amount) ||
    expense.frequency !== 'mensal' ||
    !['assinatura', 'parcela', 'divida', 'outro'].includes(expense.category) ||
    !isValidOptionalDay(expense.dueDay)
  ) {
    return null;
  }

  return {
    ...expense,
    name: expense.name.trim(),
    cardId:
      expense.cardId && cardIds.has(expense.cardId)
        ? expense.cardId
        : undefined,
  };
}

function normalizeIncome(income: Income): Income | null {
  if (
    !isValidName(income.name) ||
    !isValidMoneyAmount(income.amount) ||
    !['salario', 'freelance', 'outro'].includes(income.type) ||
    !['mensal', 'unica'].includes(income.frequency) ||
    !isValidIncomeDate(income.frequency, income.date)
  ) {
    return null;
  }

  return {
    ...income,
    name: income.name.trim(),
    date: income.frequency === 'unica' ? income.date : undefined,
  };
}

const storage = createJSONStorage<FinanceState>(() =>
  createFinanceStorage(getRawStorage()),
);

export const FINANCE_STORAGE_VERSION = 3;

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set) => ({
      ...cloneFinanceState(emptyFinanceState),

      updateProfile: (patch) =>
        set((state) => {
          if (patch.name !== undefined && !isValidName(patch.name)) {
            return state;
          }

          return {
            profile: {
              ...state.profile,
              name: patch.name?.trim() ?? state.profile.name,
              notes:
                patch.notes === undefined
                  ? state.profile.notes
                  : typeof patch.notes === 'string'
                    ? patch.notes.trim() || undefined
                    : state.profile.notes,
            },
          };
        }),

      addCard: (card) =>
        set((state) => {
          const nextCard = normalizeCard({ ...card, id: createId('card') });
          if (!nextCard) return state;

          return {
            profile: {
              ...state.profile,
              cards: [...state.profile.cards, nextCard],
            },
          };
        }),

      updateCard: (id, patch) =>
        set((state) => {
          const current = state.profile.cards.find((card) => card.id === id);
          if (!current) return state;
          const nextCard = normalizeCard({ ...current, ...patch });
          if (!nextCard) return state;

          return {
            profile: {
              ...state.profile,
              cards: state.profile.cards.map((card) =>
                card.id === id ? nextCard : card,
              ),
            },
          };
        }),

      removeCard: (id) =>
        set((state) => ({
          profile: {
            ...state.profile,
            cards: state.profile.cards.filter((card) => card.id !== id),
          },
          expenses: state.expenses.map((expense) => {
            if (expense.cardId !== id) return expense;
            const { cardId: _cardId, ...unlinkedExpense } = expense;
            return unlinkedExpense;
          }),
        })),

      addExpense: (expense) =>
        set((state) => {
          const cardIds = new Set(state.profile.cards.map((card) => card.id));
          const nextExpense = normalizeExpense(
            { ...expense, id: createId('exp') },
            cardIds,
          );
          if (!nextExpense) return state;

          return { expenses: [...state.expenses, nextExpense] };
        }),

      updateExpense: (id, patch) =>
        set((state) => {
          const current = state.expenses.find((expense) => expense.id === id);
          if (!current) return state;
          const cardIds = new Set(state.profile.cards.map((card) => card.id));
          const nextExpense = normalizeExpense(
            { ...current, ...patch },
            cardIds,
          );
          if (!nextExpense) return state;

          return {
            expenses: state.expenses.map((expense) =>
              expense.id === id ? nextExpense : expense,
            ),
          };
        }),

      removeExpense: (id) =>
        set((state) => ({
          expenses: state.expenses.filter((expense) => expense.id !== id),
        })),

      addIncome: (income) =>
        set((state) => {
          const nextIncome = normalizeIncome({
            ...income,
            id: createId('inc'),
          });
          if (!nextIncome) return state;

          return { incomes: [...state.incomes, nextIncome] };
        }),

      updateIncome: (id, patch) =>
        set((state) => {
          const current = state.incomes.find((income) => income.id === id);
          if (!current) return state;
          const nextIncome = normalizeIncome({ ...current, ...patch });
          if (!nextIncome) return state;

          return {
            incomes: state.incomes.map((income) =>
              income.id === id ? nextIncome : income,
            ),
          };
        }),

      removeIncome: (id) =>
        set((state) => ({
          incomes: state.incomes.filter((income) => income.id !== id),
        })),

      clearAll: () => set(cloneFinanceState(emptyFinanceState)),
    }),
    {
      name: FINANCE_STORAGE_KEY,
      version: FINANCE_STORAGE_VERSION,
      storage,
      migrate: (persistedState, version) =>
        migrateFinanceState(persistedState, version),
    },
  ),
);

export function selectMonthlyIncome(
  state: FinanceState,
  monthKey = getMonthKey(),
) {
  return getMonthlyIncome(state.incomes, monthKey);
}

export function selectMonthlyExpenses(state: FinanceState) {
  return getMonthlyExpenses(state.expenses);
}

export function selectAverageMonthlyExpense(
  state: FinanceState,
  monthKey = getMonthKey(),
) {
  return getAverageMonthlyExpense(
    state.history,
    selectMonthlyExpenses(state),
    monthKey,
  );
}

export function selectRecurringShare(state: FinanceState) {
  const income = selectMonthlyIncome(state);
  if (income <= 0) return 0;
  return selectMonthlyExpenses(state) / income;
}

export function selectDashboardSeries(
  state: FinanceState,
  monthKey = getMonthKey(),
) {
  return buildDashboardSeries(
    state.history,
    state.incomes,
    state.expenses,
    monthKey,
  );
}

export function selectMonthComparison(
  state: FinanceState,
  monthKey = getMonthKey(),
) {
  return {
    current: getCurrentSnapshot(state.incomes, state.expenses, monthKey),
    previous: getPreviousSnapshot(state.history, monthKey),
  };
}
