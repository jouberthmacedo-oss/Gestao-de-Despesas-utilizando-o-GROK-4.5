import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCardCommitmentData,
  getWeightedCardCommitmentPercentage,
} from '@/lib/card-commitment';

test('card commitment supports duplicate names and uses weighted totals', () => {
  const data = buildCardCommitmentData(
    [
      { id: 'card-a', name: 'Mesmo nome', limit: 100 },
      { id: 'card-b', name: 'Mesmo nome', limit: 900 },
    ],
    [
      {
        id: 'expense-a',
        name: 'Despesa A',
        amount: 200,
        category: 'outro',
        frequency: 'mensal',
        cardId: 'card-a',
        startMonth: '2026-08',
      },
      {
        id: 'expense-b',
        name: 'Despesa B',
        amount: 900,
        category: 'outro',
        frequency: 'mensal',
        cardId: 'card-b',
        startMonth: '2026-08',
      },
    ],
    [],
    '2026-08',
    '2026-08-04',
  );

  assert.deepEqual(
    data.map((item) => item.id),
    ['card-a', 'card-b'],
  );
  assert.equal(data[0]?.percent, 200);
  assert.equal(data[0]?.display, 100);
  assert.equal(getWeightedCardCommitmentPercentage(data), 110);
});
