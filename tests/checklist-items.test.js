'use strict';

const request = require('supertest');
const { openDb } = require('../src/db');
const { createApp } = require('../src/app');

let db, app;
beforeEach(() => {
  db = openDb(':memory:');
  app = createApp(db);
});
afterEach(() => {
  db.close();
});

describe('GET /checklist-items', () => {
  it('returns 200 with exactly 5 items, each having a numeric id and non-empty label, ordered by id ascending', async () => {
    const res = await request(app).get('/checklist-items');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(5);

    for (const item of res.body) {
      expect(typeof item.id).toBe('number');
      expect(typeof item.label).toBe('string');
      expect(item.label.trim().length).toBeGreaterThan(0);
    }

    const ids = res.body.map((it) => it.id);
    expect(ids).toEqual([1, 2, 3, 4, 5]);

    const sorted = [...ids].sort((a, b) => a - b);
    expect(ids).toEqual(sorted);
  });
});
