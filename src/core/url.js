const MAX_URL_LENGTH = 4000;

export function validateUrl(raw) {
  if (typeof raw !== 'string') {
    throw new Error('URL must be a string');
  }
  if (raw.length === 0) {
    throw new Error('URL cannot be empty');
  }
  if (raw.length > MAX_URL_LENGTH) {
    throw new Error(`URL exceeds maximum length of ${MAX_URL_LENGTH} characters`);
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('URL must use http or https scheme');
  }

  return url;
}

export function normalizeUrl(raw) {
  const url = validateUrl(raw);

  // Lowercase scheme and host
  const scheme = url.protocol.slice(0, -1).toLowerCase();
  const host = url.hostname.toLowerCase();

  // Strip default ports
  let port = url.port;
  if ((scheme === 'http' && port === '80') || (scheme === 'https' && port === '443')) {
    port = '';
  }

  // Build normalized URL: preserve path and query verbatim, collapse trailing slash only at root
  const pathQueryFragment = url.pathname + url.search + url.hash;
  const authority = port ? `${host}:${port}` : host;
  const normalized = `${scheme}://${authority}${pathQueryFragment}`;

  return normalized;
}
