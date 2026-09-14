import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthFailure } from '../dist/identity/auth.types.js';
import { PostgresAuthStore } from '../dist/identity/postgres-auth-store.js';

class FakeDatabase {
  constructor(responses = []) {
    this.responses = [...responses];
    this.queries = [];
  }

  async transaction(work) {
    return work({
      query: async (text, values) => {
        this.queries.push({ text, values });
        const response = this.responses.shift();
        if (response instanceof Error) throw response;
        return response ?? { rows: [], rowCount: 0 };
      },
    });
  }
}

function userRow(overrides = {}) {
  return {
    company_id: 'aaa',
    user_id: 'inspector-1',
    identity_subject: 'auth0|inspector-1',
    email: 'inspector@example.test',
    role: 'inspector',
    active: true,
    created_at: new Date('2026-09-10T00:00:00.000Z'),
    updated_at: new Date('2026-09-10T00:00:00.000Z'),
    ...overrides,
  };
}

test('PostgreSQL auth store binds tenant context before membership reads', async () => {
  const database = new FakeDatabase([{ rows: [] }, { rows: [userRow()] }]);
  const store = new PostgresAuthStore(database);

  const user = await store.getUser('aaa', 'inspector-1');

  assert.equal(user?.companyId, 'aaa');
  assert.equal(user?.identitySubject, 'auth0|inspector-1');
  assert.match(
    database.queries[0].text,
    /set_config\('app\.company_id', \$1, true\)/,
  );
  assert.deepEqual(database.queries[0].values, ['aaa']);
  assert.deepEqual(database.queries[1].values, ['aaa', 'inspector-1']);
});

test('PostgreSQL auth store maps unique membership failures to a typed conflict', async () => {
  const database = new FakeDatabase([
    { rows: [] },
    Object.assign(new Error('duplicate'), { code: '23505' }),
  ]);
  const store = new PostgresAuthStore(database);
  const now = new Date('2026-09-10T00:00:00.000Z');

  await assert.rejects(
    store.createUser({
      companyId: 'aaa',
      userId: 'inspector-1',
      identitySubject: 'auth0|inspector-1',
      email: 'inspector@example.test',
      role: 'inspector',
      active: true,
      createdAt: now,
      updatedAt: now,
    }),
    (error) =>
      error instanceof AuthFailure &&
      error.code === 'CONFLICT' &&
      error.message === 'user already exists',
  );
});
