import Database from 'better-sqlite3';

export function openDb(path) {
  const db = new Database(path);

  // Enable foreign keys (best practice)
  db.pragma('foreign_keys = ON');

  migrate(db);

  return db;
}

export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      short_code  TEXT PRIMARY KEY,
      target_url  TEXT NOT NULL UNIQUE,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function closeDb(db) {
  db.close();
}
