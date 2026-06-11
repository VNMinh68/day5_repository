'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SCHEMA_PATH = path.join(__dirname, '..', 'schema', 'option-c.sql');

/**
 * Open a SQLite database, apply the Option C schema (idempotent — uses
 * CREATE TABLE IF NOT EXISTS + INSERT OR IGNORE), and expose prepared
 * statements. Pass ':memory:' for an isolated in-memory DB (used by tests).
 *
 * @param {string} dbPath path to the database file, or ':memory:'
 * @returns {{ raw: import('better-sqlite3').Database, statements: object, close: () => void }}
 */
function openDb(dbPath) {
  const raw = new Database(dbPath);
  raw.pragma('journal_mode = WAL');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  raw.exec(schema);

  const statements = {
    listItems: raw.prepare(
      'SELECT id, label FROM checklist_items ORDER BY id'
    ),
    insertInspection: raw.prepare(
      `INSERT INTO inspections (inspector, lot_no, overall, results_json)
       VALUES (@inspector, @lot_no, @overall, @results_json)`
    ),
    getById: raw.prepare(
      'SELECT * FROM inspections WHERE id = ?'
    ),
    byDate: raw.prepare(
      `SELECT * FROM inspections
       WHERE substr(inspected_at, 1, 10) = ?
       ORDER BY inspected_at DESC`
    ),
  };

  return {
    raw,
    statements,
    close() {
      raw.close();
    },
  };
}

module.exports = { openDb, SCHEMA_PATH };
