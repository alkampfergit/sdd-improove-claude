import { test } from 'node:test';
import assert from 'node:assert';
import { openDb, closeDb } from '../src/db/db.js';
import { createLinksRepository } from '../src/db/links-repo.js';
import { createLinksService } from '../src/service/links-service.js';

test('Links Service - createLink', async (t) => {
  let db;
  let repo;
  let service;

  await t.test('setup', () => {
    db = openDb(':memory:');
    repo = createLinksRepository(db);
    service = createLinksService(repo);
  });

  await t.test('valid URL mints a code and persists one row', () => {
    const result = service.createLink('https://example.com/page');

    assert.ok(result.code, 'Should return a code');
    assert.strictEqual(result.code.length, 7, 'Code should be 7 characters');
    assert.strictEqual(result.isNewCode, true, 'Should mark as new code');
    assert.strictEqual(result.url, 'https://example.com/page');

    // Verify it's persisted
    const link = repo.findByCode(result.code);
    assert.ok(link, 'Link should be persisted');
    assert.strictEqual(link.target_url, 'https://example.com/page');
  });

  await t.test('invalid URL throws validation error and persists nothing', () => {
    const initialCount = repo.listAll().length;

    assert.throws(
      () => {
        service.createLink('not a url');
      },
      /Invalid URL|must be a string/i
    );

    const finalCount = repo.listAll().length;
    assert.strictEqual(finalCount, initialCount, 'Should not persist invalid URL');
  });

  await t.test('non-http(s) scheme throws validation error', () => {
    assert.throws(
      () => {
        service.createLink('ftp://example.com/file');
      },
      /must use http or https/i
    );
  });

  await t.test('empty URL throws validation error', () => {
    assert.throws(
      () => {
        service.createLink('');
      },
      /cannot be empty/i
    );
  });

  await t.test('non-string URL throws validation error', () => {
    assert.throws(
      () => {
        service.createLink(123);
      },
      /must be a string/i
    );
  });

  await t.test('submitting same URL twice returns identical code', () => {
    const url = 'https://another.com/test';
    const result1 = service.createLink(url);
    const result2 = service.createLink(url);

    assert.strictEqual(result1.code, result2.code, 'Should return the same code');
    assert.strictEqual(result2.isNewCode, false, 'Second should not be new');
  });

  await t.test('normalization-equal URLs return same code', () => {
    // These should normalize to the same URL
    const url1 = 'https://Example.COM/page';
    const url2 = 'https://example.com/page';

    const result1 = service.createLink(url1);
    const result2 = service.createLink(url2);

    assert.strictEqual(result1.code, result2.code, 'Should return the same code for normalized URLs');
    assert.strictEqual(result2.isNewCode, false, 'Second should reuse existing code');
  });

  await t.test('same URL twice creates exactly one stored row', () => {
    const url = 'https://onceonly.com/test';
    service.createLink(url);
    service.createLink(url);

    const links = repo.listAll();
    const matches = links.filter(l => l.target_url === url);
    assert.strictEqual(matches.length, 1, 'Should store exactly one row for duplicate URL');
  });

  await t.test('URL over 4000 chars is rejected', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(4000);

    assert.throws(
      () => {
        service.createLink(longUrl);
      },
      /exceeds maximum length/i
    );
  });

  await t.test('cleanup', () => {
    closeDb(db);
  });
});

test('Links Service - resolveCode', async (t) => {
  let db;
  let repo;
  let service;

  await t.test('setup with links', () => {
    db = openDb(':memory:');
    repo = createLinksRepository(db);
    service = createLinksService(repo);

    service.createLink('https://example.com/1');
    service.createLink('https://example.com/2');
  });

  await t.test('resolveCode finds existing code', () => {
    const link = repo.findByTarget('https://example.com/1');
    const result = service.resolveCode(link.short_code);

    assert.strictEqual(result.found, true);
    assert.strictEqual(result.targetUrl, 'https://example.com/1');
  });

  await t.test('resolveCode returns not found for non-existent code', () => {
    const result = service.resolveCode('NonCode');

    assert.strictEqual(result.found, false);
  });

  await t.test('resolveCode rejects malformed code', () => {
    const result = service.resolveCode('invalid!');

    assert.strictEqual(result.found, false, 'Should reject malformed code');
  });

  await t.test('resolveCode returns not found for wrong length', () => {
    const result = service.resolveCode('short');

    assert.strictEqual(result.found, false);
  });

  await t.test('cleanup', () => {
    closeDb(db);
  });
});

test('Links Service - listLinks', async (t) => {
  let db;
  let repo;
  let service;

  await t.test('setup', () => {
    db = openDb(':memory:');
    repo = createLinksRepository(db);
    service = createLinksService(repo);
  });

  await t.test('listLinks returns all created links', () => {
    service.createLink('https://example.com/1');
    service.createLink('https://example.com/2');

    const links = service.listLinks();

    assert.strictEqual(links.length, 2);
    const urls = links.map(l => l.url);
    assert(urls.includes('https://example.com/1'));
    assert(urls.includes('https://example.com/2'));
    assert.ok(links[0].code);
    assert.ok(links[0].createdAt);
  });

  await t.test('listLinks returns empty array when none exist', () => {
    const db2 = openDb(':memory:');
    const repo2 = createLinksRepository(db2);
    const service2 = createLinksService(repo2);

    const links = service2.listLinks();

    assert.strictEqual(links.length, 0);
    assert.ok(Array.isArray(links));

    closeDb(db2);
  });

  await t.test('cleanup', () => {
    closeDb(db);
  });
});
