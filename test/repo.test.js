import { test } from 'node:test';
import assert from 'node:assert';
import { openDb, closeDb } from '../src/db/db.js';
import { createLinksRepository } from '../src/db/links-repo.js';

test('Links Repository', async (t) => {
  let db;
  let repo;

  await t.test('setup - create database and repository', () => {
    db = openDb(':memory:');
    repo = createLinksRepository(db);
    assert.ok(repo, 'Repository should be created');
  });

  await t.test('insertLink persists a row', () => {
    const result = repo.insertLink('abc1234', 'https://example.com');
    assert.ok(result.changes > 0, 'Should insert a row');
  });

  await t.test('findByCode retrieves inserted row', () => {
    const link = repo.findByCode('abc1234');
    assert.ok(link, 'Should find the link by code');
    assert.strictEqual(link.short_code, 'abc1234');
    assert.strictEqual(link.target_url, 'https://example.com');
  });

  await t.test('findByTarget retrieves inserted row', () => {
    const link = repo.findByTarget('https://example.com');
    assert.ok(link, 'Should find the link by target URL');
    assert.strictEqual(link.short_code, 'abc1234');
    assert.strictEqual(link.target_url, 'https://example.com');
  });

  await t.test('listAll returns all rows', () => {
    // Insert another link
    repo.insertLink('xyz9999', 'https://another.com');

    const links = repo.listAll();
    assert.strictEqual(links.length, 2, 'Should return all links');
    assert.ok(
      links.some(l => l.short_code === 'abc1234'),
      'Should include first link'
    );
    assert.ok(
      links.some(l => l.short_code === 'xyz9999'),
      'Should include second link'
    );
  });

  await t.test('listAll returns empty array when no links exist', () => {
    const db2 = openDb(':memory:');
    const repo2 = createLinksRepository(db2);

    const links = repo2.listAll();
    assert.strictEqual(links.length, 0, 'Should return empty array');
    assert.ok(Array.isArray(links), 'Should be an array');

    closeDb(db2);
  });

  await t.test('duplicate target_url raises UNIQUE constraint error', () => {
    assert.throws(
      () => {
        repo.insertLink('newcode', 'https://example.com');
      },
      /UNIQUE constraint failed/i
    );
  });

  await t.test('findByCode returns null for non-existent code', () => {
    const link = repo.findByCode('nonexistent');
    assert.strictEqual(link, undefined, 'Should return undefined for missing code');
  });

  await t.test('findByTarget returns null for non-existent URL', () => {
    const link = repo.findByTarget('https://nonexistent.com');
    assert.strictEqual(link, undefined, 'Should return undefined for missing URL');
  });

  await t.test('cleanup - close database', () => {
    assert.doesNotThrow(() => {
      closeDb(db);
    });
  });
});
