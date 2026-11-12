import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export const LANGUAGES = ['de', 'en', 'fr', 'es', 'pt'];
export const LEVELS = ['beginner', 'intermediate', 'advanced'];
export const ROLES = ['student', 'instructor', 'admin'];

// Each entry runs exactly once, in order. Never edit an entry that has shipped;
// append a new one instead. The applied count is stored in PRAGMA user_version.
const MIGRATIONS = [
  `
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY,
    email         TEXT    NOT NULL UNIQUE,
    name          TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'student' CHECK (role IN ('student','instructor','admin')),
    locale        TEXT    NOT NULL DEFAULT 'de'      CHECK (locale IN ('de','en','fr','es','pt')),
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );

  CREATE TABLE sessions (
    token_hash TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);
  CREATE INDEX sessions_expiry ON sessions(expires_at);

  CREATE TABLE courses (
    id          INTEGER PRIMARY KEY,
    slug        TEXT    NOT NULL UNIQUE,
    title       TEXT    NOT NULL,
    summary     TEXT    NOT NULL DEFAULT '',
    description TEXT    NOT NULL DEFAULT '',
    language    TEXT    NOT NULL CHECK (language IN ('de','en','fr','es','pt')),
    level       TEXT    NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner','intermediate','advanced')),
    published   INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0,1)),
    owner_id    INTEGER NOT NULL REFERENCES users(id),
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
  CREATE INDEX courses_owner ON courses(owner_id);
  CREATE INDEX courses_published ON courses(published, created_at);

  CREATE TABLE lessons (
    id           INTEGER PRIMARY KEY,
    course_id    INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    position     INTEGER NOT NULL,
    title        TEXT    NOT NULL,
    content      TEXT    NOT NULL DEFAULT '',
    duration_min INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
  CREATE INDEX lessons_course ON lessons(course_id, position);

  CREATE TABLE enrollments (
    user_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    course_id  INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    PRIMARY KEY (user_id, course_id)
  );
  CREATE INDEX enrollments_course ON enrollments(course_id);

  CREATE TABLE progress (
    user_id      INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    lesson_id    INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    completed_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    PRIMARY KEY (user_id, lesson_id)
  );
  CREATE INDEX progress_lesson ON progress(lesson_id);
  `,
];

export function openDb(dataDir) {
  mkdirSync(dataDir, { recursive: true, mode: 0o750 });
  const db = new DatabaseSync(path.join(dataDir, 'fseda.db'));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;');
  migrate(db);
  return db;
}

function migrate(db) {
  const current = db.prepare('PRAGMA user_version').get().user_version;
  for (let i = current; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
