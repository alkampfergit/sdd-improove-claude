import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { openDb, closeDb } from '../src/db/db.js';
import { createLinksRepository } from '../src/db/links-repo.js';
import { createLinksService } from '../src/service/links-service.js';
import { createApp } from '../src/http/app.js';

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
