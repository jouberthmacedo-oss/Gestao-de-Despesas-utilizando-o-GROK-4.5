import { isMonthKey, isValidDateString } from '@/lib/finance-calculations';
import type { IncomeFrequency } from '@/types/finance';

export function isValidName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidMoneyAmount(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return false;
  }

  return Math.abs(Math.round(value * 100) - value * 100) < 0.000001;
}

export function isValidOptionalMoneyAmount(value: unknown) {
  return value === undefined || isValidMoneyAmount(value);
}

export function isValidDay(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 31
  );
}

export function isValidOptionalDay(value: unknown) {
  return value === undefined || isValidDay(value);
}

export function isValidMonth(value: unknown): value is string {
  return isMonthKey(value);
}

export function isValidOptionalMonth(value: unknown) {
  return value === undefined || isValidMonth(value);
}

export function isValidPositiveInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function isValidIncomeDate(frequency: IncomeFrequency, date: unknown) {
  return frequency === 'mensal' || isValidDateString(date);
}
