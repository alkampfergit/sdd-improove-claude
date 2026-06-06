import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openDb } from './db/db.js';
import { createLinksRepository } from './db/links-repo.js';
import { createLinksService } from './service/links-service.js';
import { createApp } from './http/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'links.db');
const PORT = process.env.PORT || 3000;
const STATIC_DIR = path.join(__dirname, '..', 'web', 'dist');

function main() {
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Open database
  const db = openDb(DB_PATH);
  console.log(`Connected to database: ${DB_PATH}`);

  // Create repository and service
  const repo = createLinksRepository(db);
  const service = createLinksService(repo);

  // Create and start the app
  const app = createApp({ service, staticDir: STATIC_DIR });

  const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Database: ${DB_PATH}`);
    console.log(`Static files: ${STATIC_DIR}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}

main();
