export type Card = {
  id: string;
  name: string;
  limit?: number;
  closingDay?: number;
  dueDay?: number;
};

export type Profile = {
  name: string;
  notes?: string;
  cards: Card[];
};

export type ExpenseCategory = 'assinatura' | 'parcela' | 'divida' | 'outro';
export type ExpenseFrequency = 'mensal' | 'unica';

export type Expense = {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  frequency: ExpenseFrequency;
  cardId?: string;
  dueDay?: number;
  date?: string;
  startMonth?: string;
  endMonth?: string;
  notes?: string;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentCount?: number;
  originalTotal?: number;
  purchaseDate?: string;
};

export type RecurringExpense = Expense;

export type IncomeType = 'salario' | 'freelance' | 'outro';
export type IncomeFrequency = 'mensal' | 'unica';

export type Income = {
  id: string;
  name: string;
  amount: number;
  type: IncomeType;
  frequency: IncomeFrequency;
  date?: string;
  startMonth?: string;
  endMonth?: string;
};

export type MonthlySnapshot = {
  month: string;
  income: number;
  expense: number;
};

export type SettlementStatus = 'pending' | 'paid' | 'received' | 'cancelled';

export type Settlement = {
  occurrenceKey: string;
  status: SettlementStatus;
  settledAt?: string;
  cancelledAt?: string;
  reason?: string;
};

export type Budget = {
  id: string;
  category: ExpenseCategory;
  monthlyLimit: number;
  startMonth?: string;
  endMonth?: string;
  createdAt: string;
  updatedAt: string;
};

export type GoalStatus = 'active' | 'completed' | 'archived';

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
};

export type GoalContribution = {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  note?: string;
};

export type FinanceState = {
  profile: Profile;
  expenses: Expense[];
  incomes: Income[];
  history: MonthlySnapshot[];
  settlements: Settlement[];
  budgets: Budget[];
  goals: Goal[];
  contributions: GoalContribution[];
};
