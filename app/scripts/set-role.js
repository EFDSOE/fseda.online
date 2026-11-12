// Usage: npm run set-role -- <email> <student|instructor|admin>
// Run on the server in /var/www/fseda.online/app with the same DATA_DIR as the service:
//   DATA_DIR=/var/www/fseda.online/data npm run set-role -- you@example.com admin
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, ROLES } from '../lib/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const [email, role] = process.argv.slice(2);

if (!email || !ROLES.includes(role)) {
  console.error(`Usage: npm run set-role -- <email> <${ROLES.join('|')}>`);
  process.exit(1);
}

const db = openDb(path.resolve(here, '..', process.env.DATA_DIR || './data'));
const result = db.prepare('UPDATE users SET role = ? WHERE email = ?').run(role, email.trim().toLowerCase());
if (result.changes === 0) {
  console.error(`No user with e-mail ${email}. Register on the website first.`);
  process.exit(1);
}
console.log(`${email} is now ${role}.`);
db.close();
