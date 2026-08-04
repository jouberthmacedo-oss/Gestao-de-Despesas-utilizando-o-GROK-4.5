import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../../../app';
import { loadConfig } from '../../../config/env';
import { prisma } from '../../../lib/prisma';

const runCrudTest =
  process.env.DEMANAGE_CRUD_TEST === '1' &&
  typeof process.env.DATABASE_URL === 'string';

async function register(baseUrl: string, email: string) {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Teste', email, password: 'senha123' }),
  });
  assert.equal(response.status, 201);
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
  assert.ok(cookie);
  return cookie;
}

async function requestJson(
  baseUrl: string,
  path: string,
  cookie: string,
  init: RequestInit = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      ...init.headers,
    },
  });
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}

test(
  'authenticated CRUD isolates users, validates input, serializes money, and unlinks cards',
  { skip: !runCrudTest },
  async () => {
    const app = createApp(
      loadConfig({
        NODE_ENV: 'test',
        API_PORT: '8888',
        APP_URL: 'http://localhost:5180',
      }),
    );
    const server = app.listen(0);
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const emailOne = `crud-one-${suffix}@example.com`;
    const emailTwo = `crud-two-${suffix}@example.com`;

    try {
      const cookieOne = await register(baseUrl, emailOne);
      const cookieTwo = await register(baseUrl, emailTwo);

      const createdCard = await requestJson(baseUrl, '/cards', cookieOne, {
        method: 'POST',
        body: JSON.stringify({
          name: '  Cartão principal  ',
          limit: 1000.5,
          closingDay: 31,
          dueDay: 5,
        }),
      });
      assert.equal(createdCard.response.status, 201);
      assert.equal(createdCard.body.name, 'Cartão principal');
      assert.equal(createdCard.body.limit, '1000.50');

      const cardId = createdCard.body.id as string;
      const otherCards = await requestJson(baseUrl, '/cards', cookieTwo);
      assert.deepEqual(otherCards.body, []);

      const emptyCardPatch = await requestJson(
        baseUrl,
        `/cards/${cardId}`,
        cookieOne,
        { method: 'PATCH', body: '{}' },
      );
      assert.equal(emptyCardPatch.response.status, 400);
      const unknownCardPatch = await requestJson(
        baseUrl,
        `/cards/${cardId}`,
        cookieOne,
        { method: 'PATCH', body: JSON.stringify({ owner: 'other-user' }) },
      );
      assert.equal(unknownCardPatch.response.status, 400);
      const validCardPatch = await requestJson(
        baseUrl,
        `/cards/${cardId}`,
        cookieOne,
        {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Cartão atualizado' }),
        },
      );
      assert.equal(validCardPatch.response.status, 200);
      assert.equal(validCardPatch.body.name, 'Cartão atualizado');

      const oversizedCard = await requestJson(baseUrl, '/cards', cookieOne, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Limite inválido',
          limit: '10000000000.00',
        }),
      });
      assert.equal(oversizedCard.response.status, 400);

      const createdExpense = await requestJson(
        baseUrl,
        '/expenses',
        cookieOne,
        {
          method: 'POST',
          body: JSON.stringify({
            name: '  Assinatura  ',
            amount: '10.50',
            category: 'assinatura',
            cardId,
            dueDay: 10,
          }),
        },
      );
      assert.equal(createdExpense.response.status, 201);
      assert.equal(createdExpense.body.amount, '10.50');
      const expenseId = createdExpense.body.id as string;

      const invalidExpense = await requestJson(
        baseUrl,
        '/expenses',
        cookieOne,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Inválida',
            amount: '10.501',
            category: 'assinatura',
            dueDay: 32,
          }),
        },
      );
      assert.equal(invalidExpense.response.status, 400);
      const oversizedExpense = await requestJson(
        baseUrl,
        '/expenses',
        cookieOne,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Despesa grande',
            amount: '10000000000.00',
            category: 'outro',
          }),
        },
      );
      assert.equal(oversizedExpense.response.status, 400);

      const unknownExpensePatch = await requestJson(
        baseUrl,
        `/expenses/${expenseId}`,
        cookieOne,
        { method: 'PATCH', body: JSON.stringify({ owner: 'other-user' }) },
      );
      assert.equal(unknownExpensePatch.response.status, 400);
      const validExpensePatch = await requestJson(
        baseUrl,
        `/expenses/${expenseId}`,
        cookieOne,
        { method: 'PATCH', body: JSON.stringify({ notes: 'Atualizada' }) },
      );
      assert.equal(validExpensePatch.response.status, 200);
      assert.equal(validExpensePatch.body.notes, 'Atualizada');

      const foreignCardReference = await requestJson(
        baseUrl,
        '/expenses',
        cookieTwo,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Referência indevida',
            amount: 1,
            category: 'outro',
            cardId,
          }),
        },
      );
      assert.equal(foreignCardReference.response.status, 400);

      const otherExpenses = await requestJson(baseUrl, '/expenses', cookieTwo);
      assert.deepEqual(otherExpenses.body, []);
      const foreignExpensePatch = await requestJson(
        baseUrl,
        `/expenses/${expenseId}`,
        cookieTwo,
        { method: 'PATCH', body: JSON.stringify({ name: 'Invadida' }) },
      );
      assert.equal(foreignExpensePatch.response.status, 404);

      const createdEntry = await requestJson(baseUrl, '/entries', cookieOne, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Freela',
          amount: 123.45,
          type: 'freelance',
          frequency: 'unica',
          date: '2026-08-04',
        }),
      });
      assert.equal(createdEntry.response.status, 201);
      assert.equal(createdEntry.body.amount, '123.45');
      const entryId = createdEntry.body.id as string;

      const invalidEntry = await requestJson(baseUrl, '/entries', cookieOne, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Data inválida',
          amount: 1,
          type: 'outro',
          frequency: 'unica',
          date: '2026-02-30',
        }),
      });
      assert.equal(invalidEntry.response.status, 400);
      const oversizedEntry = await requestJson(baseUrl, '/entries', cookieOne, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Entrada grande',
          amount: '10000000000.00',
          type: 'outro',
          frequency: 'mensal',
        }),
      });
      assert.equal(oversizedEntry.response.status, 400);

      const unknownEntryPatch = await requestJson(
        baseUrl,
        `/entries/${entryId}`,
        cookieOne,
        { method: 'PATCH', body: JSON.stringify({ owner: 'other-user' }) },
      );
      assert.equal(unknownEntryPatch.response.status, 400);
      const validEntryPatch = await requestJson(
        baseUrl,
        `/entries/${entryId}`,
        cookieOne,
        {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Freela atualizado' }),
        },
      );
      assert.equal(validEntryPatch.response.status, 200);
      assert.equal(validEntryPatch.body.name, 'Freela atualizado');

      const otherEntries = await requestJson(baseUrl, '/entries', cookieTwo);
      assert.deepEqual(otherEntries.body, []);
      const foreignEntryDelete = await requestJson(
        baseUrl,
        `/entries/${entryId}`,
        cookieTwo,
        { method: 'DELETE' },
      );
      assert.equal(foreignEntryDelete.response.status, 404);

      const deletedCard = await requestJson(
        baseUrl,
        `/cards/${cardId}`,
        cookieOne,
        { method: 'DELETE' },
      );
      assert.equal(deletedCard.response.status, 204);
      const remainingExpenses = await requestJson(
        baseUrl,
        '/expenses',
        cookieOne,
      );
      assert.equal(remainingExpenses.body[0].cardId, null);
    } finally {
      await prisma.user.deleteMany({
        where: { email: { in: [emailOne, emailTwo] } },
      });
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  },
);
