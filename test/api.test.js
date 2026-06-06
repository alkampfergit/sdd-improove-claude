import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { openDb, closeDb } from '../src/db/db.js';
import { createLinksRepository } from '../src/db/links-repo.js';
import { createLinksService } from '../src/service/links-service.js';
import { createApp } from '../src/http/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDbPath = path.join(__dirname, '..', 'test-db-temp.db');

test('HTTP API - POST /api/links', async (t) => {
  let db;
  let service;
  let app;

  await t.test('setup', () => {
    db = openDb(':memory:');
    const repo = createLinksRepository(db);
    service = createLinksService(repo);
    app = createApp({ service });
  });

  await t.test('POST valid URL returns 201 with code, shortUrl, url', async () => {
    const response = await request(app)
      .post('/api/links')
      .send({ url: 'https://example.com/page' })
      .expect(201);

    assert.ok(response.body.code);
    assert.strictEqual(response.body.code.length, 7);
    assert.ok(response.body.shortUrl);
    assert.strictEqual(response.body.url, 'https://example.com/page');
  });

  await t.test('POST without url field returns 400', async () => {
    const response = await request(app)
      .post('/api/links')
      .send({})
      .expect(400);

    assert.ok(response.body.error);
  });

  await t.test('POST with empty string url returns 400', async () => {
    const response = await request(app)
      .post('/api/links')
      .send({ url: '' })
      .expect(400);

    assert.ok(response.body.error);
  });

  await t.test('POST with non-string url returns 400', async () => {
    const response = await request(app)
      .post('/api/links')
      .send({ url: 123 })
      .expect(400);

    assert.ok(response.body.error);
  });

  await t.test('POST with non-http(s) scheme returns 400', async () => {
    const response = await request(app)
      .post('/api/links')
      .send({ url: 'ftp://example.com' })
      .expect(400);

    assert.ok(response.body.error);
  });

  await t.test('POST invalid URL returns 400 and persists nothing', async () => {
    const initialLinks = service.listLinks().length;

    await request(app)
      .post('/api/links')
      .send({ url: 'not a url' })
      .expect(400);

    const finalLinks = service.listLinks().length;
    assert.strictEqual(finalLinks, initialLinks, 'No link should be persisted');
  });

  await t.test('POST same URL twice returns same code', async () => {
    const url = 'https://unique.com/test';

    const response1 = await request(app)
      .post('/api/links')
      .send({ url })
      .expect(201);

    const response2 = await request(app)
      .post('/api/links')
      .send({ url })
      .expect(200);

    assert.strictEqual(response1.body.code, response2.body.code);
  });

  await t.test('POST same URL twice creates only one row', async () => {
    const url = 'https://onceonly.com/test';

    await request(app)
      .post('/api/links')
      .send({ url });

    await request(app)
      .post('/api/links')
      .send({ url });

    const links = service.listLinks();
    const matches = links.filter(l => l.url === url);
    assert.strictEqual(matches.length, 1, 'Should only have one link for the URL');
  });

  await t.test('shortUrl includes code', async () => {
    const response = await request(app)
      .post('/api/links')
      .send({ url: 'https://example.com/shorturl-test' })
      .expect(201);

    assert(response.body.shortUrl.includes(response.body.code));
  });

  await t.test('cleanup', () => {
    closeDb(db);
  });
});

test('HTTP API - GET /:code redirect', async (t) => {
  let db;
  let service;
  let app;

  await t.test('setup with created link', async () => {
    db = openDb(':memory:');
    const repo = createLinksRepository(db);
    service = createLinksService(repo);
    app = createApp({ service });

    // Create a link to test with
    await request(app)
      .post('/api/links')
      .send({ url: 'https://example.com/target' });
  });

  await t.test('GET existing code returns 301 with Location header', async () => {
    // Get the code first
    const postResponse = await request(app)
      .post('/api/links')
      .send({ url: 'https://redirect-test.com/page' });

    const code = postResponse.body.code;

    const response = await request(app)
      .get(`/${code}`)
      .expect(301);

    assert.strictEqual(response.headers.location, 'https://redirect-test.com/page');
  });

  await t.test('GET unknown code returns 404', async () => {
    const response = await request(app)
      .get('/unknown')
      .expect(404);

    assert(!response.headers.location, 'Should not redirect');
  });

  await t.test('GET malformed code returns 404', async () => {
    const response = await request(app)
      .get('/invalid!')
      .expect(404);

    assert(!response.headers.location, 'Should not redirect');
  });

  await t.test('GET code with wrong length returns 404', async () => {
    const response = await request(app)
      .get('/short')
      .expect(404);

    assert(!response.headers.location, 'Should not redirect');
  });

  await t.test('GET code with wrong characters returns 404', async () => {
    const response = await request(app)
      .get('/abc-def-123')
      .expect(404);

    assert(!response.headers.location, 'Should not redirect');
  });

  await t.test('redirect does not write to database', async () => {
    const linksBefore = service.listLinks().length;

    // Try to redirect to an unknown code
    await request(app)
      .get('/unknown')
      .expect(404);

    const linksAfter = service.listLinks().length;
    assert.strictEqual(linksAfter, linksBefore, 'No link should be created');
  });

  await t.test('cleanup', () => {
    closeDb(db);
  });
});

test('HTTP API - GET /api/links list', async (t) => {
  let db;
  let service;
  let app;

  await t.test('setup', () => {
    db = openDb(':memory:');
    const repo = createLinksRepository(db);
    service = createLinksService(repo);
    app = createApp({ service });
  });

  await t.test('GET /api/links returns empty array when no links', async () => {
    const response = await request(app)
      .get('/api/links')
      .expect(200);

    assert(Array.isArray(response.body));
    assert.strictEqual(response.body.length, 0);
  });

  await t.test('GET /api/links returns all created links', async () => {
    // Create two links
    const resp1 = await request(app)
      .post('/api/links')
      .send({ url: 'https://link1.com' });

    const resp2 = await request(app)
      .post('/api/links')
      .send({ url: 'https://link2.com' });

    const response = await request(app)
      .get('/api/links')
      .expect(200);

    assert.strictEqual(response.body.length, 2);
    const urls = response.body.map(l => l.url);
    // URLs are normalized by the service, so check against the normalized form
    assert(urls.includes(resp1.body.url));
    assert(urls.includes(resp2.body.url));
  });

  await t.test('GET /api/links includes code, url, shortUrl, createdAt', async () => {
    const response = await request(app)
      .get('/api/links')
      .expect(200);

    const link = response.body[0];
    assert.ok(link.code);
    assert.strictEqual(link.code.length, 7);
    assert.ok(link.url);
    assert.ok(link.shortUrl);
    assert.ok(link.createdAt);
  });

  await t.test('cleanup', () => {
    closeDb(db);
  });
});

test('HTTP API - GET / SPA', async (t) => {
  let db;
  let service;
  let app;
  let appWithStatic;

  await t.test('setup', () => {
    db = openDb(':memory:');
    const repo = createLinksRepository(db);
    service = createLinksService(repo);
    app = createApp({ service });
    appWithStatic = createApp({ service, staticDir: '/nonexistent' });
  });

  await t.test('GET / without staticDir returns HTML', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    assert(response.text.includes('URL Shortener'));
  });

  await t.test('cleanup', () => {
    closeDb(db);
  });
});

test('Server integration - real disk DB persistence', async (t) => {
  let dbPath;

  await t.test('cleanup old test database', () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  await t.test('create link with real on-disk database', async () => {
    dbPath = testDbPath;

    const db = openDb(dbPath);
    const repo = createLinksRepository(db);
    const service = createLinksService(repo);
    const app = createApp({ service });

    const response = await request(app)
      .post('/api/links')
      .send({ url: 'https://persistence-test.com' });

    assert.strictEqual(response.status, 201);
    const code = response.body.code;
    assert.ok(code);

    // Verify it can be resolved
    const resolveResponse = await request(app)
      .get(`/${code}`);

    assert.strictEqual(resolveResponse.status, 301);

    closeDb(db);
  });

  await t.test('reopen database and verify persistence', async () => {
    // Reopen the database
    const db = openDb(testDbPath);
    const repo = createLinksRepository(db);
    const service = createLinksService(repo);
    const app = createApp({ service });

    // List links to verify it persisted
    const response = await request(app)
      .get('/api/links');

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.length, 1);
    assert.strictEqual(response.body[0].url, 'https://persistence-test.com/');

    closeDb(db);
  });

  await t.test('cleanup test database', () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });
});
