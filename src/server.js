'use strict';

const { openDb } = require('./db');
const { createApp } = require('./app');

const DB_PATH = process.env.DB_PATH || './data.db';
const PORT = Number(process.env.PORT) || 3000;

const db = openDb(DB_PATH);
const app = createApp(db);

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Option C inspection service listening on http://localhost:${PORT}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
