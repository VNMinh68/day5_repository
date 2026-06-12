# Plan — Option C: Inspection Checklist Form

## Context

This repository is the Day 5 capstone starter template. It ships only specs, SQLite
schemas, wireframes, and Claude tooling — no application code. This plan builds
**Option C** (`docs/option-c-inspection-checklist.md`): a small Node.js + Express +
SQLite service that lets a factory inspector submit a Pass/Fail checklist for a lot and
query inspection history by date, plus the HTML UI sketched in
`wireframes/option-c.html`.

Decisions: **better-sqlite3** driver, **API + HTML UI** scope.

Follows the README's mandatory workflow: plan → scaffold → per-feature (code → delegate
tests to `test-writer` → `npm test` → `/review` → commit), targeting 8+ small commits.

## Stack

- Node.js 18+, Express
- **better-sqlite3** (synchronous prepared statements)
- Jest + supertest for endpoint tests
- Plain HTML/JS for the UI (no framework)

## Structure

```
├── PLAN.md
├── CLAUDE.md               # scenario rules (validation, field names, API shape)
├── package.json
├── .env.example            # DB_PATH=./data.db, PORT=3000
├── schema/option-c.sql     # EXISTS — reused as-is
├── src/
│   ├── db.js               # open DB, exec schema, expose prepared statements
│   ├── validation.js       # pure validators (inspection body, date param)
│   ├── app.js              # Express app + routes — exported, does NOT listen
│   └── server.js           # imports app, reads PORT, app.listen()
├── public/index.html       # New Inspection form + History view
└── tests/                  # checklist-items / inspections-post / inspections-get
```

`app.js` (no `listen`) is split from `server.js` so supertest imports the app directly.
`db.js` takes a path so tests run against `:memory:` seeded from `schema/option-c.sql`.

## Endpoints

| Method/Path | Behavior |
| --- | --- |
| `GET /healthz` | `200 { status: "ok" }` |
| `GET /checklist-items` | the 5 seeded items |
| `POST /inspections` | validate body; `400` naming the field on failure; insert and return `201` with computed `overall` and parsed `results` |
| `GET /inspections?date=YYYY-MM-DD` | validate date (else `400`); that date's inspections, newest first |

## Validation rules

- `inspector`: required non-empty string, ≤ 50 chars
- `lot_no`: matches `/^LOT-\d{4}$/`
- `results`: non-empty array, one entry per checklist item — no missing, unknown, or
  duplicate `item_id`; each `result` is `PASS` or `FAIL`
- `overall` = `PASS` only when every item passed
- `date` query: `YYYY-MM-DD` and a real calendar date

## Tests (delegated to `test-writer`)

In-memory DB per suite, driven with supertest. Cover happy paths, every validation
rejection (message names the field), `overall` computation, and date-filtered history
(newest first).

## Commit sequence (8+)

1. docs: add plan
2. docs: add Option C rules to CLAUDE.md
3. chore: scaffold project
4. feat: db layer + schema load + /healthz
5. feat: GET /checklist-items
6. feat: POST /inspections with validation
7. feat: GET /inspections history by date
8. feat: inspection checklist HTML UI

`/review` the staged diff before each commit; fix every finding first.

## Verification

`npm install` → `npm test` (all green) → `npm start`, then curl each endpoint and open
`http://localhost:3000/` to submit an inspection and search history. Tick every item in
the spec's acceptance checklist.
