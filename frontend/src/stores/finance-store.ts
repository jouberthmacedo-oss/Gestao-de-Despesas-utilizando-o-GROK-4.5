import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  buildDashboardSeries,
  getCurrentSnapshot,
  getExpenseOccurrenceKey,
  getIncomeOccurrenceKey,
  getMonthKey,
  getMonthlyFinanceSummary,
  getPreviousSnapshot,
  isValidDateString,
} from '@/lib/finance-calculations';
import {
  cloneFinanceState,
  migrateFinanceState,
} from '@/lib/finance-migration';
import {
  budgetPeriodsOverlap,
  createInstallmentExpenses,
  getGoalProgress,
  type InstallmentInput,
} from '@/lib/finance-planning';
import {
  createFinanceStorage,
  FINANCE_STORAGE_KEY,
} from '@/lib/finance-storage';
import {
  isValidIncomeDate,
  isValidMoneyAmount,
  isValidMonth,
  isValidName,
  isValidOptionalDay,
  isValidOptionalMoneyAmount,
  isValidPositiveInteger,
} from '@/lib/finance-validation';
import { createId } from '@/lib/format';
import type {
  Budget,
  Card,
  Expense,
  FinanceState,
  Goal,
  GoalContribution,
  Income,
  Profile,
  Settlement,
  SettlementStatus,
} from '@/types/finance';

type FinanceActions = {
  updateProfile: (patch: Partial<Omit<Profile, 'cards'>>) => void;
  addCard: (card: Omit<Card, 'id'>) => void;
  updateCard: (id: string, patch: Partial<Omit<Card, 'id'>>) => void;
  removeCard: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  addInstallmentPlan: (input: InstallmentInput) => void;
  updateExpense: (id: string, patch: Partial<Omit<Expense, 'id'>>) => void;
  removeExpense: (id: string) => void;
  removeInstallmentPlan: (groupId: string) => void;
  setExpenseStatus: (occurrenceKey: string, status: SettlementStatus) => void;
  addIncome: (income: Omit<Income, 'id'>) => void;
  updateIncome: (id: string, patch: Partial<Omit<Income, 'id'>>) => void;
  removeIncome: (id: string) => void;
  setIncomeStatus: (occurrenceKey: string, status: SettlementStatus) => void;
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBudget: (
    id: string,
    patch: Partial<Omit<Budget, 'id' | 'createdAt'>>,
  ) => void;
  removeBudget: (id: string) => void;
  addGoal: (
    goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
  ) => void;
  updateGoal: (
    id: string,
    patch: Partial<Pick<Goal, 'name' | 'targetAmount' | 'targetDate'>>,
  ) => void;
  archiveGoal: (id: string) => void;
  addContribution: (contribution: Omit<GoalContribution, 'id'>) => void;
  updateContribution: (
    id: string,
    patch: Partial<Omit<GoalContribution, 'id' | 'goalId'>>,
  ) => void;
  removeContribution: (id: string) => void;
  clearAll: () => void;
};

export type FinanceStore = FinanceState & FinanceActions;

const emptyFinanceState: FinanceState = {
  profile: { name: '', notes: undefined, cards: [] },
  expenses: [],
  incomes: [],
  history: [],
  settlements: [],
  budgets: [],
  goals: [],
  contributions: [],
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
  return typeof window === 'undefined'
    ? createMemoryStorage()
    : window.localStorage;
}

function normalizeCard(card: Card): Card | null {
  if (
    !isValidName(card.name) ||
    !isValidOptionalMoneyAmount(card.limit) ||
    !isValidOptionalDay(card.closingDay) ||
    !isValidOptionalDay(card.dueDay)
  )
    return null;
  return { ...card, name: card.name.trim() };
}

function normalizeExpense(
  expense: Expense,
  cardIds: Set<string>,
): Expense | null {
  if (
    !isValidName(expense.name) ||
    !isValidMoneyAmount(expense.amount) ||
    !['mensal', 'unica'].includes(expense.frequency) ||
    !['assinatura', 'parcela', 'divida', 'outro'].includes(expense.category) ||
    !isValidOptionalDay(expense.dueDay)
  )
    return null;
  if (expense.frequency === 'unica' && !isValidDateString(expense.date))
    return null;
  if (
    expense.frequency === 'mensal' &&
    (!isValidMonth(expense.startMonth) ||
      (expense.endMonth !== undefined &&
        (!isValidMonth(expense.endMonth) ||
          expense.endMonth < expense.startMonth)))
  )
    return null;
  if (
    expense.installmentGroupId &&
    (!isValidPositiveInteger(expense.installmentNumber) ||
      !isValidPositiveInteger(expense.installmentCount) ||
      !isValidMoneyAmount(expense.originalTotal) ||
      !isValidDateString(expense.purchaseDate))
  )
    return null;
  return {
    ...expense,
    name: expense.name.trim(),
    cardId:
      expense.cardId && cardIds.has(expense.cardId)
        ? expense.cardId
        : undefined,
    notes: expense.notes?.trim() || undefined,
  };
}

function normalizeIncome(income: Income): Income | null {
  if (
    !isValidName(income.name) ||
    !isValidMoneyAmount(income.amount) ||
    !['salario', 'freelance', 'outro'].includes(income.type) ||
    !['mensal', 'unica'].includes(income.frequency) ||
    !isValidIncomeDate(income.frequency, income.date)
  )
    return null;
  if (
    income.frequency === 'mensal' &&
    (!isValidMonth(income.startMonth) ||
      (income.endMonth !== undefined &&
        (!isValidMonth(income.endMonth) ||
          income.endMonth < income.startMonth)))
  )
    return null;
  return {
    ...income,
    name: income.name.trim(),
    date: income.frequency === 'unica' ? income.date : undefined,
  };
}

function updateSettlement(
  settlements: Settlement[],
  occurrenceKey: string,
  status: SettlementStatus,
): Settlement[] {
  const next = settlements.filter(
    (settlement) => settlement.occurrenceKey !== occurrenceKey,
  );
  next.push({
    occurrenceKey,
    status,
    ...(status === 'paid' || status === 'received'
      ? { settledAt: new Date().toISOString() }
      : {}),
    ...(status === 'cancelled'
      ? { cancelledAt: new Date().toISOString() }
      : {}),
  });
  return next;
}

function removeOccurrences(settlements: Settlement[], id: string) {
  return settlements.filter(
    (settlement) =>
      settlement.occurrenceKey !== id &&
      !settlement.occurrenceKey.startsWith(`${id}:`),
  );
}

const storage = createJSONStorage<FinanceState>(() =>
  createFinanceStorage(getRawStorage()),
);

export const FINANCE_STORAGE_VERSION = 4;

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set) => ({
      ...cloneFinanceState(emptyFinanceState),

      updateProfile: (patch) =>
        set((state) => {
          if (patch.name !== undefined && !isValidName(patch.name))
            return state;
          return {
            profile: {
              ...state.profile,
              name: patch.name?.trim() ?? state.profile.name,
              notes:
                patch.notes === undefined
                  ? state.profile.notes
                  : patch.notes.trim() || undefined,
            },
          };
        }),

      addCard: (card) =>
        set((state) => {
          const nextCard = normalizeCard({ ...card, id: createId('card') });
          return nextCard
            ? {
                profile: {
                  ...state.profile,
                  cards: [...state.profile.cards, nextCard],
                },
              }
            : state;
        }),

      updateCard: (id, patch) =>
        set((state) => {
          const current = state.profile.cards.find((card) => card.id === id);
          if (!current) return state;
          const nextCard = normalizeCard({ ...current, ...patch });
          return nextCard
            ? {
                profile: {
                  ...state.profile,
                  cards: state.profile.cards.map((card) =>
                    card.id === id ? nextCard : card,
                  ),
                },
              }
            : state;
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
          const nextExpense = normalizeExpense(
            {
              ...expense,
              id: createId('exp'),
              startMonth:
                expense.frequency === 'mensal'
                  ? (expense.startMonth ?? getMonthKey())
                  : undefined,
            },
            new Set(state.profile.cards.map((card) => card.id)),
          );
          return nextExpense
            ? { expenses: [...state.expenses, nextExpense] }
            : state;
        }),

      addInstallmentPlan: (input) =>
        set((state) => {
          const groupId = createId('installment');
          const installments = createInstallmentExpenses(input, groupId);
          if (
            !isValidName(input.name) ||
            !isValidMoneyAmount(input.total) ||
            !isValidPositiveInteger(input.count) ||
            !isValidDateString(input.purchaseDate) ||
            !state.profile.cards.some((card) => card.id === input.cardId) ||
            installments.length === 0
          )
            return state;
          return { expenses: [...state.expenses, ...installments] };
        }),

      updateExpense: (id, patch) =>
        set((state) => {
          const current = state.expenses.find((expense) => expense.id === id);
          if (!current) return state;
          const settled = state.settlements.some(
            (settlement) =>
              settlement.occurrenceKey === id &&
              settlement.status !== 'pending',
          );
          if (settled && current.installmentGroupId) return state;
          const nextExpense = normalizeExpense(
            { ...current, ...patch },
            new Set(state.profile.cards.map((card) => card.id)),
          );
          return nextExpense
            ? {
                expenses: state.expenses.map((expense) =>
                  expense.id === id ? nextExpense : expense,
                ),
              }
            : state;
        }),

      removeExpense: (id) =>
        set((state) => ({
          expenses: state.expenses.filter((expense) => expense.id !== id),
          settlements: removeOccurrences(state.settlements, id),
        })),
      removeInstallmentPlan: (groupId) =>
        set((state) => {
          const ids = new Set(
            state.expenses
              .filter((expense) => expense.installmentGroupId === groupId)
              .map((expense) => expense.id),
          );
          return {
            expenses: state.expenses.filter(
              (expense) => expense.installmentGroupId !== groupId,
            ),
            settlements: state.settlements.filter(
              (settlement) => !ids.has(settlement.occurrenceKey),
            ),
          };
        }),
      setExpenseStatus: (occurrenceKey, status) =>
        set((state) => ({
          settlements: updateSettlement(
            state.settlements,
            occurrenceKey,
            status,
          ),
        })),

      addIncome: (income) =>
        set((state) => {
          const nextIncome = normalizeIncome({
            ...income,
            id: createId('inc'),
            startMonth:
              income.frequency === 'mensal'
                ? (income.startMonth ?? getMonthKey())
                : undefined,
          });
          return nextIncome
            ? { incomes: [...state.incomes, nextIncome] }
            : state;
        }),
      updateIncome: (id, patch) =>
        set((state) => {
          const current = state.incomes.find((income) => income.id === id);
          if (!current) return state;
          const nextIncome = normalizeIncome({ ...current, ...patch });
          return nextIncome
            ? {
                incomes: state.incomes.map((income) =>
                  income.id === id ? nextIncome : income,
                ),
              }
            : state;
        }),
      removeIncome: (id) =>
        set((state) => ({
          incomes: state.incomes.filter((income) => income.id !== id),
          settlements: removeOccurrences(state.settlements, id),
        })),
      setIncomeStatus: (occurrenceKey, status) =>
        set((state) => ({
          settlements: updateSettlement(
            state.settlements,
            occurrenceKey,
            status,
          ),
        })),

      addBudget: (budget) =>
        set((state) => {
          const now = new Date().toISOString();
          const next = {
            ...budget,
            id: createId('budget'),
            createdAt: now,
            updatedAt: now,
          };
          if (
            !isValidMoneyAmount(next.monthlyLimit) ||
            (next.startMonth !== undefined && !isValidMonth(next.startMonth)) ||
            (next.endMonth !== undefined &&
              (!isValidMonth(next.endMonth) ||
                (next.startMonth && next.endMonth < next.startMonth))) ||
            state.budgets.some((item) => budgetPeriodsOverlap(item, next))
          )
            return state;
          return { budgets: [...state.budgets, next] };
        }),
      updateBudget: (id, patch) =>
        set((state) => {
          const current = state.budgets.find((budget) => budget.id === id);
          if (!current) return state;
          const next = {
            ...current,
            ...patch,
            updatedAt: new Date().toISOString(),
          };
          if (
            !isValidMoneyAmount(next.monthlyLimit) ||
            (next.startMonth !== undefined && !isValidMonth(next.startMonth)) ||
            state.budgets.some(
              (item) => item.id !== id && budgetPeriodsOverlap(item, next),
            )
          )
            return state;
          return {
            budgets: state.budgets.map((budget) =>
              budget.id === id ? next : budget,
            ),
          };
        }),
      removeBudget: (id) =>
        set((state) => ({
          budgets: state.budgets.filter((budget) => budget.id !== id),
        })),

      addGoal: (goal) =>
        set((state) => {
          if (
            !isValidName(goal.name) ||
            !isValidMoneyAmount(goal.targetAmount) ||
            (goal.targetDate !== undefined &&
              !isValidDateString(goal.targetDate))
          )
            return state;
          const now = new Date().toISOString();
          return {
            goals: [
              ...state.goals,
              {
                ...goal,
                id: createId('goal'),
                status: 'active',
                createdAt: now,
                updatedAt: now,
              },
            ],
          };
        }),
      updateGoal: (id, patch) =>
        set((state) => {
          const current = state.goals.find((goal) => goal.id === id);
          if (
            !current ||
            (patch.name !== undefined && !isValidName(patch.name)) ||
            (patch.targetAmount !== undefined &&
              !isValidMoneyAmount(patch.targetAmount)) ||
            (patch.targetDate !== undefined &&
              !isValidDateString(patch.targetDate))
          )
            return state;
          const nextGoals = state.goals.map((goal) =>
            goal.id === id
              ? {
                  ...goal,
                  ...patch,
                  name: patch.name?.trim() ?? goal.name,
                  updatedAt: new Date().toISOString(),
                }
              : goal,
          );
          return {
            goals: nextGoals.map((goal) =>
              goal.id === id && goal.status !== 'archived'
                ? {
                    ...goal,
                    status: getGoalProgress(goal, state.contributions).completed
                      ? 'completed'
                      : 'active',
                  }
                : goal,
            ),
          };
        }),
      archiveGoal: (id) =>
        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === id
              ? {
                  ...goal,
                  status: 'archived',
                  updatedAt: new Date().toISOString(),
                }
              : goal,
          ),
        })),
      addContribution: (contribution) =>
        set((state) => {
          if (
            !state.goals.some((goal) => goal.id === contribution.goalId) ||
            !isValidMoneyAmount(contribution.amount) ||
            !isValidDateString(contribution.date)
          )
            return state;
          const nextContribution = {
            ...contribution,
            id: createId('contribution'),
            note: contribution.note?.trim() || undefined,
          };
          return {
            contributions: [...state.contributions, nextContribution],
            goals: state.goals.map((goal) =>
              goal.id === contribution.goalId &&
              getGoalProgress({ ...goal, status: 'active' }, [
                ...state.contributions,
                nextContribution,
              ]).completed
                ? {
                    ...goal,
                    status: 'completed',
                    updatedAt: new Date().toISOString(),
                  }
                : goal,
            ),
          };
        }),
      updateContribution: (id, patch) =>
        set((state) => {
          const current = state.contributions.find(
            (contribution) => contribution.id === id,
          );
          if (
            !current ||
            (patch.amount !== undefined && !isValidMoneyAmount(patch.amount)) ||
            (patch.date !== undefined && !isValidDateString(patch.date))
          )
            return state;
          const contributions = state.contributions.map((contribution) =>
            contribution.id === id
              ? {
                  ...contribution,
                  ...patch,
                  note: patch.note?.trim() || undefined,
                }
              : contribution,
          );
          return {
            contributions,
            goals: state.goals.map((goal) =>
              goal.id === current.goalId && goal.status !== 'archived'
                ? {
                    ...goal,
                    status: getGoalProgress(goal, contributions).completed
                      ? 'completed'
                      : 'active',
                    updatedAt: new Date().toISOString(),
                  }
                : goal,
            ),
          };
        }),
      removeContribution: (id) =>
        set((state) => ({
          contributions: state.contributions.filter(
            (contribution) => contribution.id !== id,
          ),
          goals: state.goals.map((goal) =>
            goal.status === 'completed' &&
            getGoalProgress(
              goal,
              state.contributions.filter(
                (contribution) => contribution.id !== id,
              ),
            ).completed === false
              ? {
                  ...goal,
                  status: 'active',
                  updatedAt: new Date().toISOString(),
                }
              : goal,
          ),
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
  return getMonthlyFinanceSummary(
    state.incomes,
    state.expenses,
    state.settlements,
    monthKey,
  ).income;
}

export function selectMonthlyExpenses(
  state: FinanceState,
  monthKey = getMonthKey(),
) {
  return getMonthlyFinanceSummary(
    state.incomes,
    state.expenses,
    state.settlements,
    monthKey,
  ).expense;
}

export function selectMonthlySummary(
  state: FinanceState,
  monthKey = getMonthKey(),
) {
  return getMonthlyFinanceSummary(
    state.incomes,
    state.expenses,
    state.settlements,
    monthKey,
  );
}

export function selectAverageMonthlyExpense(
  state: FinanceState,
  monthKey = getMonthKey(),
) {
  return state.history.length === 0
    ? selectMonthlyExpenses(state, monthKey)
    : state.history.reduce((total, snapshot) => total + snapshot.expense, 0) /
        state.history.length;
}

export function selectRecurringShare(state: FinanceState) {
  const income = selectMonthlyIncome(state);
  return income <= 0 ? 0 : selectMonthlyExpenses(state) / income;
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
    previous: getPreviousSnapshot(
      buildDashboardSeries(
        state.history,
        state.incomes,
        state.expenses,
        monthKey,
      ),
      monthKey,
    ),
  };
}

export function selectExpenseOccurrenceKey(
  expense: Expense,
  monthKey?: string,
) {
  return getExpenseOccurrenceKey(expense, monthKey);
}

export function selectIncomeOccurrenceKey(income: Income, monthKey?: string) {
  return getIncomeOccurrenceKey(income, monthKey);
}
