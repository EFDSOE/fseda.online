// Writes a consistent copy of the database to DATA_DIR/backups and keeps the newest 14.
// Runs daily via fseda-backup.timer; can also be run by hand:
//   DATA_DIR=/var/www/fseda.online/data node scripts/backup.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { openDb } from '../lib/db.js';

const KEEP = Number(process.env.BACKUP_KEEP || 14);
const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '..', process.env.DATA_DIR || './data');
const backupDir = path.join(dataDir, 'backups');
mkdirSync(backupDir, { recursive: true, mode: 0o750 });

const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const target = path.join(backupDir, `fseda-${stamp}.db`);

const db = openDb(dataDir);
db.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
db.close();

const old = readdirSync(backupDir).filter((f) => /^fseda-.*\.db$/.test(f)).sort().reverse().slice(KEEP);
for (const f of old) rmSync(path.join(backupDir, f));
console.log(`Backup written: ${target} (${old.length} old backup(s) removed)`);
