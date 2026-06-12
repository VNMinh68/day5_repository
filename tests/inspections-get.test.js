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

function buildResults(overrides = {}) {
  return [1, 2, 3, 4, 5].map((item_id) => ({
    item_id,
    result: overrides[item_id] || 'PASS',
  }));
}

function buildBody(overrides = {}) {
  return {
    inspector: 'Johan',
    lot_no: 'LOT-0042',
    results: buildResults(),
    ...overrides,
  };
}

const today = () => new Date().toISOString().slice(0, 10);

describe('GET /inspections', () => {
  describe('date param validation', () => {
    it('rejects a missing date param with 400', async () => {
      const res = await request(app).get('/inspections');

      expect(res.status).toBe(400);
      expect(res.body.error).toEqual(expect.any(String));
    });

    it.each(['2026-6-1', '06-11-2026', 'not-a-date'])(
      'rejects malformed date "%s" with 400',
      async (date) => {
        const res = await request(app).get('/inspections').query({ date });

        expect(res.status).toBe(400);
        expect(res.body.error).toEqual(expect.any(String));
      }
    );

    it.each(['2026-13-40', '2026-02-30'])(
      'rejects impossible calendar date "%s" with 400',
      async (date) => {
        const res = await request(app).get('/inspections').query({ date });

        expect(res.status).toBe(400);
        expect(res.body.error).toEqual(expect.any(String));
      }
    );
  });

  describe('successful retrieval', () => {
    it('returns only inspections matching the requested date, each with a parsed results array', async () => {
      await request(app)
        .post('/inspections')
        .send(buildBody({ lot_no: 'LOT-0001' }));
      await request(app)
        .post('/inspections')
        .send(buildBody({ lot_no: 'LOT-0002', results: buildResults({ 1: 'FAIL' }) }));

      const date = today();
      const res = await request(app).get('/inspections').query({ date });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);

      for (const row of res.body) {
        expect(row.inspected_at.slice(0, 10)).toBe(date);
        expect(Array.isArray(row.results)).toBe(true);
        expect(row.results).toHaveLength(5);
        expect(row).not.toHaveProperty('results_json');
      }
    });

    it('returns an empty array for a valid date with no inspections', async () => {
      const res = await request(app)
        .get('/inspections')
        .query({ date: '2000-01-01' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('orders results newest first (inspected_at descending)', async () => {
      for (let i = 0; i < 3; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await request(app)
          .post('/inspections')
          .send(buildBody({ lot_no: `LOT-000${i + 1}` }));
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const res = await request(app).get('/inspections').query({ date: today() });

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(3);

      const stamps = res.body.map((r) => r.inspected_at);
      const sortedDesc = [...stamps].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
      expect(stamps).toEqual(sortedDesc);
    });
  });
});
