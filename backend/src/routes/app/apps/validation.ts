import { type Card, type Entry, type Expense, Prisma } from '@prisma/client';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DECIMAL_12_2 = new Prisma.Decimal('9999999999.99');

export const EXPENSE_CATEGORIES = [
  'assinatura',
  'parcela',
  'divida',
  'outro',
] as const;

export const ENTRY_TYPES = ['salario', 'freelance', 'outro'] as const;
export const ENTRY_FREQUENCIES = ['mensal', 'unica'] as const;

export function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function hasOnlyAllowedFields(
  value: Record<string, unknown>,
  allowedFields: readonly string[],
) {
  return Object.keys(value).every((key) => allowedFields.includes(key));
}

export function parseName(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value.trim();
}

export function parseMoney(value: unknown) {
  const raw =
    typeof value === 'number'
      ? Number.isFinite(value)
        ? String(value)
        : undefined
      : typeof value === 'string'
        ? value.trim()
        : undefined;

  if (!raw || !/^\d+(?:\.\d{1,2})?$/.test(raw)) return undefined;

  const decimal = new Prisma.Decimal(raw);
  return decimal.gt(0) && decimal.lte(MAX_DECIMAL_12_2)
    ? decimal.toFixed(2)
    : undefined;
}

export function parseNullableMoney(value: unknown) {
  return value === null ? null : parseMoney(value);
}

export function parseDay(value: unknown) {
  const raw =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value)
        : Number.NaN;

  return Number.isInteger(raw) && raw >= 1 && raw <= 31 ? raw : undefined;
}

export function parseNullableDay(value: unknown) {
  return value === null ? null : parseDay(value);
}

export function parseDateOnly(value: unknown) {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? undefined
    : date;
}

export function parseNullableDateOnly(value: unknown) {
  return value === null ? null : parseDateOnly(value);
}

export function isExpenseCategory(
  value: unknown,
): value is (typeof EXPENSE_CATEGORIES)[number] {
  return (
    typeof value === 'string' &&
    EXPENSE_CATEGORIES.includes(value as (typeof EXPENSE_CATEGORIES)[number])
  );
}

export function isEntryType(
  value: unknown,
): value is (typeof ENTRY_TYPES)[number] {
  return (
    typeof value === 'string' &&
    ENTRY_TYPES.includes(value as (typeof ENTRY_TYPES)[number])
  );
}

export function isEntryFrequency(
  value: unknown,
): value is (typeof ENTRY_FREQUENCIES)[number] {
  return (
    typeof value === 'string' &&
    ENTRY_FREQUENCIES.includes(value as (typeof ENTRY_FREQUENCIES)[number])
  );
}

export function parseNullableCardId(value: unknown) {
  if (value === null) return null;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value.trim();
}

export function parseNullableNotes(value: unknown) {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  return value.trim() || null;
}

export function serializeCard(card: Card) {
  return {
    ...card,
    limit: card.limit?.toFixed(2) ?? null,
  };
}

export function serializeExpense(expense: Expense) {
  return {
    ...expense,
    amount: expense.amount.toFixed(2),
  };
}

export function serializeEntry(entry: Entry) {
  return {
    ...entry,
    amount: entry.amount.toFixed(2),
  };
}
