import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from './app';
import { loadConfig } from './config/env';

test('GET /health returns backend status through the complete app', async () => {
  const app = createApp(
    loadConfig({
      NODE_ENV: 'test',
      API_PORT: '8888',
      APP_URL: 'http://localhost:5180',
    }),
  );
  const server = app.listen(0);

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      status: string;
      service: string;
      timestamp: string;
    };
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'demanage-backend');
    assert.ok(Number.isFinite(Date.parse(body.timestamp)));
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('auth and application routes remain mounted', async () => {
  const app = createApp(
    loadConfig({
      NODE_ENV: 'test',
      API_PORT: '8888',
      APP_URL: 'http://localhost:5180',
    }),
  );
  const server = app.listen(0);

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    assert.equal((await fetch(`${baseUrl}/auth/me`)).status, 401);
    assert.equal(
      (
        await fetch(`${baseUrl}/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status,
      401,
    );

    for (const path of ['/cards', '/expenses', '/entries']) {
      assert.equal((await fetch(`${baseUrl}${path}`)).status, 401);
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('invalid environment configuration is rejected', () => {
  assert.throws(
    () =>
      loadConfig({
        NODE_ENV: 'test',
        API_PORT: '70000',
        APP_URL: 'http://localhost:5180',
      }),
    /API_PORT/,
  );
  assert.throws(
    () =>
      loadConfig({
        NODE_ENV: 'test',
        API_PORT: '8888',
        APP_URL: 'not-a-url',
      }),
    /APP_URL/,
  );
});
