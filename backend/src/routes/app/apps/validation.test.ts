import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasOnlyAllowedFields,
  parseDateOnly,
  parseDay,
  parseMoney,
  parseName,
} from './validation';

test('route validation trims names and accepts only positive two-decimal money', () => {
  assert.equal(parseName('  Cartão  '), 'Cartão');
  assert.equal(parseMoney('123.45'), '123.45');
  assert.equal(parseMoney(10), '10.00');
  assert.equal(parseMoney('9999999999.99'), '9999999999.99');
  assert.equal(parseMoney('10000000000.00'), undefined);
  assert.equal(parseMoney('123.456'), undefined);
  assert.equal(parseMoney('-1.00'), undefined);
  assert.equal(parseMoney(0), undefined);
});

test('PATCH validation accepts only declared fields', () => {
  assert.equal(
    hasOnlyAllowedFields({ name: 'Cartão' }, ['name', 'limit']),
    true,
  );
  assert.equal(
    hasOnlyAllowedFields({ unknown: 'value' }, ['name', 'limit']),
    false,
  );
  assert.equal(
    hasOnlyAllowedFields({ name: 'Cartão', unknown: 'value' }, [
      'name',
      'limit',
    ]),
    false,
  );
});

test('route validation enforces calendar day and date-only boundaries', () => {
  assert.equal(parseDay('31'), 31);
  assert.equal(parseDay(0), undefined);
  assert.equal(parseDay(32), undefined);
  assert.equal(
    parseDateOnly('2026-02-28')?.toISOString(),
    '2026-02-28T00:00:00.000Z',
  );
  assert.equal(parseDateOnly('2026-02-30'), undefined);
  assert.equal(parseDateOnly('2026-2-01'), undefined);
});
