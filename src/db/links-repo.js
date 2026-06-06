export class LinksRepository {
  constructor(db) {
    this.db = db;
    this.insertStmt = db.prepare(`
      INSERT INTO links (short_code, target_url)
      VALUES (?, ?)
    `);
    this.findByCodeStmt = db.prepare('SELECT * FROM links WHERE short_code = ?');
    this.findByTargetStmt = db.prepare('SELECT * FROM links WHERE target_url = ?');
    this.listAllStmt = db.prepare('SELECT * FROM links ORDER BY created_at DESC');
  }

  insertLink(shortCode, targetUrl) {
    const result = this.insertStmt.run(shortCode, targetUrl);
    return result;
  }

  findByCode(code) {
    return this.findByCodeStmt.get(code);
  }

  findByTarget(url) {
    return this.findByTargetStmt.get(url);
  }

  listAll() {
    return this.listAllStmt.all();
  }
}

export function createLinksRepository(db) {
  return new LinksRepository(db);
}
