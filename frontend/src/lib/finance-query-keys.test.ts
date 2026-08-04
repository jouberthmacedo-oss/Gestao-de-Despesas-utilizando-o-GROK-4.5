import assert from 'node:assert/strict';
import test from 'node:test';

import { getFinanceQueryKey } from '@/lib/finance-query-keys';

test('finance query keys include the authenticated user', () => {
  assert.deepEqual(getFinanceQueryKey('user-a', 'cards'), [
    'finance',
    'user-a',
    'cards',
  ]);
  assert.notDeepEqual(
    getFinanceQueryKey('user-a', 'expenses'),
    getFinanceQueryKey('user-b', 'expenses'),
  );
});
