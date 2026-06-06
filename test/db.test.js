import { test } from 'node:test';
import assert from 'node:assert';
import { openDb, migrate, closeDb } from '../src/db/db.js';

test('Database connection and schema', async (t) => {
  let db;

  await t.test('openDb creates in-memory database', () => {
    db = openDb(':memory:');
    assert.ok(db, 'Database should be created');
  });

  await t.test('creates links table with correct schema', () => {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='links'
    `).all();

    assert.strictEqual(tables.length, 1, 'links table should exist');
  });

  await t.test('links table has correct columns', () => {
    const info = db.pragma('table_info(links)');

    const columns = info.reduce((acc, col) => {
      acc[col.name] = col;
      return acc;
    }, {});

    // Check short_code PRIMARY KEY
    assert.ok(columns.short_code, 'short_code column should exist');
    assert.strictEqual(columns.short_code.pk, 1, 'short_code should be PRIMARY KEY');

    // Check target_url NOT NULL UNIQUE
    assert.ok(columns.target_url, 'target_url column should exist');
    assert.strictEqual(columns.target_url.notnull, 1, 'target_url should be NOT NULL');

    // Check created_at NOT NULL DEFAULT
    assert.ok(columns.created_at, 'created_at column should exist');
    assert.strictEqual(columns.created_at.notnull, 1, 'created_at should be NOT NULL');
  });

  await t.test('target_url has UNIQUE constraint', () => {
    // Insert first row
    db.prepare(`
      INSERT INTO links (short_code, target_url)
      VALUES ('abc1234', 'https://example.com')
    `).run();

    // Try to insert another row with the same target_url
    assert.throws(
      () => {
        db.prepare(`
          INSERT INTO links (short_code, target_url)
          VALUES ('xyz9999', 'https://example.com')
        `).run();
      },
      /UNIQUE constraint failed/i
    );
  });

  await t.test('migrate is idempotent', () => {
    // First migration already ran in openDb
    // Running again should not error
    assert.doesNotThrow(() => {
      migrate(db);
    });

    // Table should still exist and be usable
    const count = db.prepare('SELECT COUNT(*) as count FROM links').get();
    assert.ok(count, 'Table should still be queryable');
  });

  await t.test('created_at has default timestamp', () => {
    const result = db.prepare(`
      INSERT INTO links (short_code, target_url)
      VALUES ('def5678', 'https://another.com')
      RETURNING created_at
    `).get();

    assert.ok(result.created_at, 'created_at should be automatically populated');
    assert.match(result.created_at, /\d{4}-\d{2}-\d{2}/, 'created_at should be a timestamp');
  });

  await t.test('cleanup - close database', () => {
    assert.doesNotThrow(() => {
      closeDb(db);
    });
  });
});
