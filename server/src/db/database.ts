import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/foodcompare.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  let schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.join(__dirname, '../../src/db/schema.sql');
  }
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);

    // Safe migration for oauth_sessions compound primary key
    try {
      const tableInfo = db.prepare("PRAGMA table_info(oauth_sessions)").all() as any[];
      const hasUserId = tableInfo.some(c => c.name === 'user_id');
      if (tableInfo.length > 0 && !hasUserId) {
        db.exec(`
          ALTER TABLE oauth_sessions RENAME TO oauth_sessions_old;
          CREATE TABLE oauth_sessions (
            user_id TEXT NOT NULL DEFAULT 'default_user',
            platform_code TEXT NOT NULL,
            access_token TEXT,
            refresh_token TEXT,
            token_type TEXT DEFAULT 'Bearer',
            expires_at DATETIME,
            code_verifier TEXT,
            state TEXT,
            address_id TEXT,
            address_details TEXT,
            scope TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, platform_code)
          );
          INSERT INTO oauth_sessions (user_id, platform_code, access_token, refresh_token, token_type, expires_at, code_verifier, state, address_id, address_details, scope, updated_at)
          SELECT 'default_user', platform_code, access_token, refresh_token, token_type, expires_at, code_verifier, state, address_id, address_details, scope, updated_at FROM oauth_sessions_old;
          DROP TABLE oauth_sessions_old;
        `);
      }
    } catch {
      // Ignored if table already has user_id
    }

    console.log('✅ SQLite database initialized with WAL mode at:', DB_PATH);
  }
}

// Auto-initialize tables
try {
  initDatabase();
} catch (err) {
  console.warn('Database auto-init deferred:', err);
}

