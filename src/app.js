'use strict';

const path = require('path');
const express = require('express');
const { validateInspection, validateDate } = require('./validation');

/**
 * Turn a stored inspections row into the API shape: parse results_json back
 * into a `results` array and drop the raw JSON column.
 */
function serialize(row) {
  const { results_json: resultsJson, ...rest } = row;
  return { ...rest, results: JSON.parse(resultsJson) };
}

/**
 * Build the Express app around an opened DB handle (see src/db.js). The app
 * does not call listen() — server.js does that — so tests can drive it via
 * supertest.
 *
 * @param {{ statements: object }} db
 */
function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/checklist-items', (req, res) => {
    try {
      res.json(db.statements.listItems.all());
    } catch (err) {
      res.status(500).json({ error: 'failed to load checklist items' });
    }
  });

  app.post('/inspections', (req, res) => {
    try {
      const items = db.statements.listItems.all();
      const validItemIds = items.map((it) => it.id);

      const check = validateInspection(req.body, validItemIds);
      if (!check.ok) {
        return res.status(400).json({ error: check.error });
      }

      const info = db.statements.insertInspection.run({
        inspector: req.body.inspector.trim(),
        lot_no: req.body.lot_no,
        overall: check.overall,
        results_json: JSON.stringify(req.body.results),
      });

      const row = db.statements.getById.get(info.lastInsertRowid);
      return res.status(201).json(serialize(row));
    } catch (err) {
      return res.status(500).json({ error: 'failed to save inspection' });
    }
  });

  app.get('/inspections', (req, res) => {
    try {
      const check = validateDate(req.query.date);
      if (!check.ok) {
        return res.status(400).json({ error: check.error });
      }

      const rows = db.statements.byDate.all(req.query.date);
      return res.json(rows.map(serialize));
    } catch (err) {
      return res.status(500).json({ error: 'failed to load inspections' });
    }
  });

  return app;
}

module.exports = { createApp, serialize };
