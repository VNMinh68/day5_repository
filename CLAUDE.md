# CLAUDE.md — Option C: Inspection Checklist

Project-specific rules for this capstone build. Read before changing code.

## What this is

Node.js + Express + SQLite (`better-sqlite3`) service. A factory inspector submits a
Pass/Fail checklist for a lot; results are stored and queryable by date. Includes a
plain-HTML UI at `public/index.html`.

## Layout

- `src/db.js` — `openDb(path)`: opens SQLite, applies `schema/option-c.sql`, exposes
  prepared statements. Use `:memory:` in tests.
- `src/validation.js` — pure validators, return `{ ok, error }` / `{ ok, overall }`.
- `src/app.js` — `createApp(db)` builds the Express app (no `listen`).
- `src/server.js` — wires DB + app and listens (`PORT`, `DB_PATH` from env).
- `public/index.html` — New Inspection form + History view.
- `tests/` — Jest + supertest, one suite per endpoint.

## Endpoints

| Method/Path | Success | Notes |
| --- | --- | --- |
| `GET /healthz` | `200 {status:"ok"}` | |
| `GET /checklist-items` | `200 [{id,label}]` | 5 seeded items, ordered by id |
| `POST /inspections` | `201 {id,inspector,lot_no,inspected_at,overall,results}` | validation below |
| `GET /inspections?date=YYYY-MM-DD` | `200 [...]` | that date only, newest first |

Validation failures return `400 {error}` with a message **naming the field**.

## Field names & rules (do not rename)

- `inspector` — required non-empty string, ≤ 50 chars (trimmed).
- `lot_no` — required, matches `/^LOT-\d{4}$/`.
- `results` — non-empty array, exactly one entry per checklist item: no missing,
  unknown, or duplicate `item_id`. Each `results[].result` is `PASS` or `FAIL`.
- `overall` — computed server-side: `PASS` only if every item passed, else `FAIL`.
  Never trust a client-supplied `overall`.
- `date` query param — `YYYY-MM-DD` and a real calendar date.

## Conventions

- **SQL**: only parameterized prepared statements (`?` / `@named`). Never build SQL by
  string concatenation.
- Per-item results persist as JSON in `inspections.results_json`; API responses parse it
  back into `results` and never expose the raw column (see `serialize()` in `app.js`).
- `inspected_at` is set by the DB default (ISO `YYYY-MM-DDTHH:MM:SS.fffZ`); the date
  filter keys on `substr(inspected_at,1,10)`.
- Every route handler wraps its body in try/catch → `500 {error}`.

## Workflow

Per the README: tests delegated to the `test-writer` sub-agent; run `/review` on the
staged diff and fix every finding before each commit; keep commits small (8+).
