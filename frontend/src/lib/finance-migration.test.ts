import assert from 'node:assert/strict';
import test from 'node:test';

import { migrateFinanceState } from '@/lib/finance-migration';
import {
  createFinanceStorage,
  FINANCE_STORAGE_KEY,
  LEGACY_FINANCE_STORAGE_KEY,
} from '@/lib/finance-storage';
import { parseCurrencyInput } from '@/lib/format';

function makeStorage(values: Record<string, string>) {
  const data = new Map(Object.entries(values));
  return {
    getItem: (name: string) => data.get(name) ?? null,
    setItem: (name: string, value: string) => data.set(name, value),
    removeItem: (name: string) => data.delete(name),
  };
}

test('legacy salary migrates to one recurring income without a profile salary', () => {
  const migrated = migrateFinanceState({
    profile: {
      name: 'Pessoa',
      salary: 7500,
      notes: 'Notas',
      cards: [{ id: 'card-1', name: 'Nubank', limit: 1000 }],
    },
    expenses: [
      {
        id: 'expense-1',
        name: 'Internet',
        amount: 100,
        category: 'assinatura',
        cardId: 'card-1',
      },
    ],
    incomes: [],
    history: [],
  });

  assert.equal('salary' in migrated.profile, false);
  assert.equal(
    migrated.incomes.filter(
      (income) => income.type === 'salario' && income.frequency === 'mensal',
    ).length,
    1,
  );
  assert.equal(migrated.expenses[0]?.cardId, 'card-1');
});

test('existing recurring salary prevents duplicate migration and stale dates are removed', () => {
  const migrated = migrateFinanceState({
    profile: { name: 'Pessoa', salary: 7500, cards: [] },
    expenses: [],
    incomes: [
      {
        id: 'salary',
        name: 'Salário atual',
        amount: 8000,
        type: 'salario',
        frequency: 'mensal',
        date: '2026-04-10',
      },
    ],
    history: [],
  });

  assert.equal(migrated.incomes.length, 1);
  assert.equal('date' in migrated.incomes[0], false);
});

test('malformed optional fields do not discard unrelated valid records', () => {
  const migrated = migrateFinanceState({
    profile: {
      name: ' Pessoa ',
      cards: [{ id: 'card-1', name: 'Nubank', limit: 'invalid', dueDay: 32 }],
    },
    expenses: [
      {
        id: 'expense-1',
        name: 'Internet',
        amount: 100,
        category: 'assinatura',
        cardId: 'missing-card',
      },
    ],
    incomes: [],
    history: [],
  });

  assert.equal(migrated.profile.name, 'Pessoa');
  assert.deepEqual(migrated.profile.cards[0], {
    id: 'card-1',
    name: 'Nubank',
  });
  assert.equal('cardId' in migrated.expenses[0], false);
});

test('canonical storage wins over usable legacy storage and legacy is retained', () => {
  const canonical = JSON.stringify({ state: { profile: { name: 'Atual' } } });
  const legacy = JSON.stringify({ state: { profile: { name: 'Legado' } } });
  const raw = makeStorage({
    [FINANCE_STORAGE_KEY]: canonical,
    [LEGACY_FINANCE_STORAGE_KEY]: legacy,
  });
  const storage = createFinanceStorage(raw);

  assert.equal(storage.getItem(FINANCE_STORAGE_KEY), canonical);
  storage.setItem(FINANCE_STORAGE_KEY, canonical);
  assert.equal(raw.getItem(LEGACY_FINANCE_STORAGE_KEY), legacy);
});

test('legacy storage is selected when canonical state is unusable', () => {
  const legacy = JSON.stringify({ state: { profile: { name: 'Legado' } } });
  const storage = createFinanceStorage(
    makeStorage({
      [FINANCE_STORAGE_KEY]: '{malformed',
      [LEGACY_FINANCE_STORAGE_KEY]: legacy,
    }),
  );

  assert.equal(storage.getItem(FINANCE_STORAGE_KEY), legacy);
});

test('Brazilian currency parsing accepts realistic formats and rejects malformed input', () => {
  assert.equal(parseCurrencyInput('1234,56'), 1234.56);
  assert.equal(parseCurrencyInput('1.234,56'), 1234.56);
  assert.equal(parseCurrencyInput('R$ 1.234,56'), 1234.56);
  assert.equal(parseCurrencyInput('1234.56'), 1234.56);
  assert.equal(parseCurrencyInput('1.234.56'), 0);
  assert.equal(parseCurrencyInput('12,345'), 0);
  assert.equal(parseCurrencyInput('inválido'), 0);
});
