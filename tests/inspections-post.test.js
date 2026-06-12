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

// Build a full, valid results array: one entry per checklist item (ids 1..5),
// all PASS by default. Pass an overrides map to flip specific items.
function buildResults(overrides = {}) {
  return [1, 2, 3, 4, 5].map((item_id) => ({
    item_id,
    result: overrides[item_id] || 'PASS',
  }));
}

// Build a full, valid request body. Any provided fields override the defaults.
function buildBody(overrides = {}) {
  return {
    inspector: 'Johan',
    lot_no: 'LOT-0042',
    results: buildResults(),
    ...overrides,
  };
}

describe('POST /inspections', () => {
  describe('happy path', () => {
    it('creates an inspection when all 5 items PASS and returns 201 with overall "PASS"', async () => {
      const res = await request(app).post('/inspections').send(buildBody());

      expect(res.status).toBe(201);
      expect(res.body.overall).toBe('PASS');
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results).toHaveLength(5);
      expect(res.body).not.toHaveProperty('results_json');
      expect(typeof res.body.id).toBe('number');
      expect(typeof res.body.inspected_at).toBe('string');
      expect(res.body.inspected_at.length).toBeGreaterThan(0);
      expect(res.body.inspector).toBe('Johan');
      expect(res.body.lot_no).toBe('LOT-0042');
    });

    it('returns overall "FAIL" when at least one item is FAIL', async () => {
      const body = buildBody({ results: buildResults({ 3: 'FAIL' }) });
      const res = await request(app).post('/inspections').send(body);

      expect(res.status).toBe(201);
      expect(res.body.overall).toBe('FAIL');
      expect(res.body.results).toHaveLength(5);
    });
  });

  describe('inspector validation', () => {
    it('rejects a missing inspector with 400 and an error mentioning "inspector"', async () => {
      const body = buildBody();
      delete body.inspector;
      const res = await request(app).post('/inspections').send(body);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/inspector/i);
    });

    it('rejects a blank/whitespace inspector with 400 mentioning "inspector"', async () => {
      const res = await request(app)
        .post('/inspections')
        .send(buildBody({ inspector: '   ' }));

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/inspector/i);
    });

    it('rejects an inspector longer than 50 characters with 400 mentioning "inspector"', async () => {
      const res = await request(app)
        .post('/inspections')
        .send(buildBody({ inspector: 'a'.repeat(51) }));

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/inspector/i);
    });
  });

  describe('lot_no validation', () => {
    it('rejects a missing lot_no with 400 mentioning "lot_no"', async () => {
      const body = buildBody();
      delete body.lot_no;
      const res = await request(app).post('/inspections').send(body);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/lot_no/i);
    });

    it.each(['LOT-12', 'LOT-ABCD', '0042'])(
      'rejects wrong-format lot_no "%s" with 400 mentioning "lot_no"',
      async (lotNo) => {
        const res = await request(app)
          .post('/inspections')
          .send(buildBody({ lot_no: lotNo }));

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/lot_no/i);
      }
    );
  });

  describe('results validation', () => {
    it('rejects a missing results field with 400 mentioning "results"', async () => {
      const body = buildBody();
      delete body.results;
      const res = await request(app).post('/inspections').send(body);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/results/i);
    });

    it('rejects an empty results array with 400 mentioning "results"', async () => {
      const res = await request(app)
        .post('/inspections')
        .send(buildBody({ results: [] }));

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/results/i);
    });

    it('rejects results that omit one checklist item (only 4 entries) with 400', async () => {
      const partial = buildResults().filter((r) => r.item_id !== 5);
      const res = await request(app)
        .post('/inspections')
        .send(buildBody({ results: partial }));

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/every|answer|item/i);
    });

    it('rejects results containing an unknown item_id with 400 mentioning "unknown"', async () => {
      const withUnknown = buildResults();
      withUnknown[0] = { item_id: 99, result: 'PASS' };
      const res = await request(app)
        .post('/inspections')
        .send(buildBody({ results: withUnknown }));

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/unknown/i);
    });

    it('rejects results containing a duplicate item_id with 400 mentioning "duplicate"', async () => {
      const withDup = buildResults();
      withDup[4] = { item_id: 1, result: 'PASS' };
      const res = await request(app)
        .post('/inspections')
        .send(buildBody({ results: withDup }));

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/duplicate/i);
    });

    it('rejects an invalid result value with 400 mentioning "PASS or FAIL"', async () => {
      const res = await request(app)
        .post('/inspections')
        .send(buildBody({ results: buildResults({ 2: 'MAYBE' }) }));

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/PASS or FAIL/i);
    });
  });
});
