import assert from 'node:assert/strict';
import test from 'node:test';

import { toPublicUser } from './auth';

test('authenticated public users no longer expose the legacy salary field', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const user = toPublicUser({
    id: 'user-1',
    name: 'Pessoa',
    email: 'pessoa@example.com',
    passwordHash: 'hash',
    notes: null,
    createdAt: now,
    updatedAt: now,
  });

  assert.equal('salary' in user, false);
  assert.deepEqual(user, {
    id: 'user-1',
    name: 'Pessoa',
    email: 'pessoa@example.com',
    notes: null,
    createdAt: now,
    updatedAt: now,
  });
});
