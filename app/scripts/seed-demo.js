// Creates a short, published demo course owned by an existing user (who becomes instructor if needed).
// Usage on the server:
//   DATA_DIR=/var/www/fseda.online/data npm run seed-demo -- you@example.com
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, transaction } from '../lib/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run seed-demo -- <email>');
  process.exit(1);
}

const db = openDb(path.resolve(here, '..', process.env.DATA_DIR || './data'));
const user = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email);
if (!user) {
  console.error(`No user with e-mail ${email}. Register on the website first.`);
  process.exit(1);
}
if (db.prepare("SELECT 1 FROM courses WHERE slug = 'erste-schritte-mit-fseda'").get()) {
  console.log('Demo course already exists, nothing to do.');
  process.exit(0);
}

const lessons = [
  {
    title: 'Willkommen',
    duration: 3,
    content: `# Schön, dass du da bist

In diesem Kurs lernst du in wenigen Minuten, wie fseda funktioniert.

- Jeder Kurs besteht aus **Lektionen**.
- Du arbeitest sie in deinem Tempo durch.
- Unter jeder Lektion markierst du sie als *erledigt*.

Klicke unten auf **Nächste Lektion**, um weiterzumachen.`,
  },
  {
    title: 'Fortschritt und Dashboard',
    duration: 4,
    content: `## Dein Fortschritt

Unter **Mein Lernen** siehst du alle Kurse, die du belegt hast, und wie weit du jeweils bist.

1. Öffne eine Lektion.
2. Lies sie durch.
3. Klicke auf **Als erledigt markieren**.

Der gelbe Balken zeigt dir, wie viel du schon geschafft hast. Dein Fortschritt ist an dein Konto gebunden und auf jedem Gerät gleich.`,
  },
  {
    title: 'Sprache wählen',
    duration: 2,
    content: `## Fünf Sprachen

Die Oberfläche gibt es auf Deutsch, Englisch, Französisch, Spanisch und Portugiesisch. Die Sprache wählst du oben rechts. Unter **Konto** kannst du deine bevorzugte Sprache dauerhaft speichern.

Kurse haben eine eigene Kurssprache. Im Katalog kannst du danach filtern.`,
  },
  {
    title: 'Selbst unterrichten',
    duration: 5,
    content: `## Eigene Kurse erstellen

Konten mit der Rolle *Kursleitung* sehen den Bereich **Unterrichten**. Dort legst du Kurse an, schreibst Lektionen und veröffentlichst sie.

Lektionen unterstützen einfache Formatierung:

\`\`\`
# Überschrift
**fett** und *kursiv*
- Aufzählung
[Link](https://fseda.online)
\`\`\`

Die Rolle vergibt die Verwaltung unter **Verwaltung → Benutzer**.`,
  },
];

transaction(db, () => {
  if (user.role === 'student') db.prepare("UPDATE users SET role = 'instructor' WHERE id = ?").run(user.id);
  const courseId = Number(db.prepare(`
    INSERT INTO courses (slug, title, summary, description, language, level, published, owner_id)
    VALUES ('erste-schritte-mit-fseda', 'Erste Schritte mit fseda', ?, ?, 'de', 'beginner', 1, ?)
  `).run(
    'Ein kurzer Rundgang: Kurse belegen, Fortschritt verfolgen, Sprache wählen und eigene Kurse anlegen.',
    'Dieser Kurs zeigt dir in vier kurzen Lektionen, wie die Plattform funktioniert. Ideal als erster Kurs nach der Registrierung.',
    user.id,
  ).lastInsertRowid);
  const insert = db.prepare('INSERT INTO lessons (course_id, position, title, content, duration_min) VALUES (?, ?, ?, ?, ?)');
  lessons.forEach((l, i) => insert.run(courseId, i + 1, l.title, l.content, l.duration));
});

console.log('Demo course "Erste Schritte mit fseda" created and published.');
db.close();
