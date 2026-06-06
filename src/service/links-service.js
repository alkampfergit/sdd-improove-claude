import { validateUrl, normalizeUrl } from '../core/url.js';
import { generateCode, isValidCode } from '../core/code.js';

const MAX_RETRY_ATTEMPTS = 5;

export class LinksService {
  constructor(repository) {
    this.repo = repository;
  }

  createLink(inputUrl) {
    // Validate and normalize the input URL
    const normalized = normalizeUrl(inputUrl);

    // Check if this URL has already been shortened
    const existingLink = this.repo.findByTarget(normalized);
    if (existingLink) {
      return {
        code: existingLink.short_code,
        url: existingLink.target_url,
        shortUrl: this._buildShortUrl(existingLink.short_code),
        isNewCode: false,
      };
    }

    // Mint a new code with collision retry
    let code;
    let lastError;

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      code = generateCode();

      try {
        this.repo.insertLink(code, normalized);
        // Success
        return {
          code,
          url: normalized,
          shortUrl: this._buildShortUrl(code),
          isNewCode: true,
        };
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed') && error.message.includes('short_code')) {
          // Collision on short_code, retry
          lastError = error;
          continue;
        }
        // Other error (e.g., target_url UNIQUE constraint from a race)
        throw error;
      }
    }

    // Exhausted retries
    throw new Error(`Failed to generate unique code after ${MAX_RETRY_ATTEMPTS} attempts`);
  }

  resolveCode(code) {
    // Validate that the code is the right shape
    if (!isValidCode(code)) {
      return { found: false };
    }

    const link = this.repo.findByCode(code);
    if (!link) {
      return { found: false };
    }

    return {
      found: true,
      targetUrl: link.target_url,
    };
  }

  listLinks() {
    const links = this.repo.listAll();
    return links.map(link => ({
      code: link.short_code,
      url: link.target_url,
      shortUrl: this._buildShortUrl(link.short_code),
      createdAt: link.created_at,
    }));
  }

  _buildShortUrl(code) {
    // The origin is determined at the HTTP layer, but for testing
    // we can use a default. In practice, this is set by the handler.
    return `//${code}`;
  }
}

export function createLinksService(repository) {
  return new LinksService(repository);
}
