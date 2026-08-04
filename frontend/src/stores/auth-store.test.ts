import assert from 'node:assert/strict';
import test from 'node:test';

import { isAuthUser } from './auth-store';

const validUser = {
  id: 'user-1',
  name: 'Pessoa',
  email: 'pessoa@example.com',
  notes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test('auth responses require a complete public user before authentication', () => {
  assert.equal(isAuthUser(validUser), true);
  assert.equal(isAuthUser({ user: validUser }), false);
  assert.equal(isAuthUser('<!doctype html>'), false);
});
