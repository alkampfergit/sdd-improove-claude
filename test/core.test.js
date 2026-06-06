import { test } from 'node:test';
import assert from 'node:assert';
import { validateUrl, normalizeUrl } from '../src/core/url.js';
import { generateCode, isValidCode, CODE_ALPHABET, CODE_LENGTH } from '../src/core/code.js';

test('URL validation - validateUrl', async (t) => {
  await t.test('accepts valid http URL', () => {
    const url = validateUrl('http://example.com');
    assert.strictEqual(url.href.startsWith('http://'), true);
  });

  await t.test('accepts valid https URL', () => {
    const url = validateUrl('https://example.com/path');
    assert.strictEqual(url.href.startsWith('https://'), true);
  });

  await t.test('rejects non-string input', () => {
    assert.throws(
      () => validateUrl(123),
      /must be a string/i
    );
  });

  await t.test('rejects undefined', () => {
    assert.throws(
      () => validateUrl(undefined),
      /must be a string/i
    );
  });

  await t.test('rejects null', () => {
    assert.throws(
      () => validateUrl(null),
      /must be a string/i
    );
  });

  await t.test('rejects empty string', () => {
    assert.throws(
      () => validateUrl(''),
      /cannot be empty/i
    );
  });

  await t.test('rejects ftp scheme', () => {
    assert.throws(
      () => validateUrl('ftp://example.com'),
      /must use http or https/i
    );
  });

  await t.test('rejects unknown scheme', () => {
    assert.throws(
      () => validateUrl('file://path/to/file'),
      /must use http or https/i
    );
  });

  await t.test('rejects URLs exceeding 4000 characters', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(4000);
    assert.throws(
      () => validateUrl(longUrl),
      /exceeds maximum length/i
    );
  });

  await t.test('accepts URLs exactly 4000 characters', () => {
    const maxUrl = 'https://example.com/' + 'a'.repeat(3980);
    assert.doesNotThrow(() => validateUrl(maxUrl));
  });

  await t.test('rejects malformed URLs', () => {
    assert.throws(
      () => validateUrl('not a url at all'),
      /Invalid URL/i
    );
  });
});

test('URL normalization - normalizeUrl', async (t) => {
  await t.test('lowercases scheme', () => {
    const result = normalizeUrl('HTTP://example.com/path');
    assert.strictEqual(result.startsWith('http://'), true);
  });

  await t.test('lowercases host', () => {
    const result = normalizeUrl('https://EXAMPLE.COM/path');
    assert(result.includes('example.com'));
  });

  await t.test('strips default http port 80', () => {
    const result = normalizeUrl('http://example.com:80/path');
    assert(!result.includes(':80'));
  });

  await t.test('strips default https port 443', () => {
    const result = normalizeUrl('https://example.com:443/path');
    assert(!result.includes(':443'));
  });

  await t.test('preserves non-default ports', () => {
    const result = normalizeUrl('http://example.com:8080/path');
    assert(result.includes(':8080'));
  });

  await t.test('preserves path verbatim', () => {
    const result = normalizeUrl('https://example.com/path/to/resource');
    assert(result.includes('/path/to/resource'));
  });

  await t.test('preserves query string verbatim', () => {
    const result = normalizeUrl('https://example.com/path?key=value&foo=bar');
    assert(result.includes('?key=value&foo=bar'));
  });

  await t.test('preserves hash fragment', () => {
    const result = normalizeUrl('https://example.com/path#section');
    assert(result.includes('#section'));
  });

  await t.test('collapses trailing slash at root (Story 3 scenario 2)', () => {
    const url1 = normalizeUrl('https://example.com');
    const url2 = normalizeUrl('https://example.com/');
    assert.strictEqual(url1, url2);
  });

  await t.test('normalizes case-insensitive hosts to same URL', () => {
    const url1 = normalizeUrl('https://Example.Com/page');
    const url2 = normalizeUrl('https://example.com/page');
    assert.strictEqual(url1, url2);
  });
});

test('Short-code generation - generateCode', async (t) => {
  await t.test('returns a string', () => {
    const code = generateCode();
    assert.strictEqual(typeof code, 'string');
  });

  await t.test('returns exactly 7 characters', () => {
    const code = generateCode();
    assert.strictEqual(code.length, CODE_LENGTH);
  });

  await t.test('uses only alphabet characters', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      for (const char of code) {
        assert(CODE_ALPHABET.includes(char), `Character ${char} not in alphabet`);
      }
    }
  });

  await t.test('generates no duplicates in large batch', () => {
    const codes = new Set();
    const batchSize = 10000;

    for (let i = 0; i < batchSize; i++) {
      const code = generateCode();
      assert(!codes.has(code), `Duplicate code generated: ${code}`);
      codes.add(code);
    }

    assert.strictEqual(codes.size, batchSize);
  });
});

test('Short-code validation - isValidCode', async (t) => {
  await t.test('accepts valid 7-char base62 code', () => {
    assert.strictEqual(isValidCode('AbC1234'), true);
  });

  await t.test('accepts all alphabet characters', () => {
    const fullAlphabet = CODE_ALPHABET.slice(0, CODE_LENGTH).padEnd(CODE_LENGTH, 'A');
    assert.strictEqual(isValidCode(fullAlphabet), true);
  });

  await t.test('rejects non-string', () => {
    assert.strictEqual(isValidCode(123), false);
    assert.strictEqual(isValidCode(null), false);
    assert.strictEqual(isValidCode(undefined), false);
  });

  await t.test('rejects wrong length (too short)', () => {
    assert.strictEqual(isValidCode('AbC123'), false);
  });

  await t.test('rejects wrong length (too long)', () => {
    assert.strictEqual(isValidCode('AbC12345'), false);
  });

  await t.test('rejects empty string', () => {
    assert.strictEqual(isValidCode(''), false);
  });

  await t.test('rejects characters outside alphabet', () => {
    assert.strictEqual(isValidCode('AbC123!'), false);
    assert.strictEqual(isValidCode('AbC123 '), false);
    assert.strictEqual(isValidCode('AbC123-'), false);
  });

  await t.test('rejects codes with special characters', () => {
    assert.strictEqual(isValidCode('AbC@234'), false);
  });
});
