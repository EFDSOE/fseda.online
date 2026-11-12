import { HttpError, Router, sendJson, serializeCookie } from './http.js';
import {
  hashPassword, verifyPassword, burnPasswordCheck, createSession, destroySession,
  destroyOtherSessions, RateLimiter, SESSION_COOKIE, SESSION_TTL_SECONDS,
} from './auth.js';
import { LANGUAGES, LEVELS, ROLES, transaction } from './db.js';
import * as v from './validate.js';

export const loginLimiter = new RateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });
export const registerLimiter = new RateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });

// ---------- helpers ----------

function requireUser(ctx) {
  if (!ctx.user) throw new HttpError(401, 'unauthorized');
  return ctx.user;
}

function requireRole(ctx, ...roles) {
  const user = requireUser(ctx);
  if (!roles.includes(user.role)) throw new HttpError(403, 'forbidden');
  return user;
}

const canManage = (user, course) => !!user && (user.role === 'admin' || course.owner_id === user.id);

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, locale: u.locale, created_at: u.created_at };
}

function sessionCookie(ctx, token, maxAge) {
  return serializeCookie(SESSION_COOKIE, token, { maxAge, secure: ctx.secureCookies });
}

function uniqueSlug(db, base, exceptId = 0) {
  let slug = base;
  for (let i = 2; db.prepare('SELECT 1 FROM courses WHERE slug = ? AND id <> ?').get(slug, exceptId); i++) {
    slug = `${base.slice(0, 55)}-${i}`;
  }
  return slug;
}

function courseRow(c) {
  return {
    id: c.id, slug: c.slug, title: c.title, summary: c.summary, language: c.language, level: c.level,
    published: !!c.published, lesson_count: c.lesson_count ?? 0, total_minutes: c.total_minutes ?? 0,
    instructor: c.instructor ?? null, created_at: c.created_at, updated_at: c.updated_at,
  };
}

const COURSE_LIST_SQL = `
  SELECT c.*, u.name AS instructor,
    (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
    (SELECT COALESCE(SUM(duration_min), 0) FROM lessons l WHERE l.course_id = c.id) AS total_minutes
  FROM courses c JOIN users u ON u.id = c.owner_id
`;

function loadCourseBySlug(db, slug) {
  const course = db.prepare(`${COURSE_LIST_SQL} WHERE c.slug = ?`).get(slug);
  if (!course) throw new HttpError(404, 'not_found');
  return course;
}

function loadManagedCourse(ctx, id) {
  const course = ctx.db.prepare('SELECT * FROM courses WHERE id = ?').get(v.idParam(id));
  if (!course || !canManage(ctx.user, course)) throw new HttpError(404, 'not_found');
  return course;
}

function isEnrolled(db, userId, courseId) {
  return !!db.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, courseId);
}

function touchCourse(db, courseId) {
  db.prepare("UPDATE courses SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?").run(courseId);
}

function renumberLessons(db, courseId) {
  const ids = db.prepare('SELECT id FROM lessons WHERE course_id = ? ORDER BY position, id').all(courseId);
  const update = db.prepare('UPDATE lessons SET position = ? WHERE id = ?');
  ids.forEach((row, i) => update.run(i + 1, row.id));
}

// ---------- routes ----------

export function buildRouter() {
  const r = new Router();

  r.add('GET', '/api/health', (ctx) => {
    ctx.db.prepare('SELECT 1').get();
    sendJson(ctx.res, 200, { ok: true });
  });

  // ----- auth -----

  r.add('POST', '/api/auth/register', async (ctx) => {
    if (!registerLimiter.take(ctx.ip)) throw new HttpError(429, 'rate_limited');
    const body = await ctx.body();
    const name = v.text(body, 'name', { min: 1, max: 80 });
    const email = v.email(body);
    const password = v.password(body);
    const locale = v.oneOf(body, 'locale', LANGUAGES, { optional: true }) ?? 'de';

    if (ctx.db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      throw new HttpError(409, 'email_taken', 'email');
    }
    const hash = await hashPassword(password);
    let userId;
    try {
      userId = Number(ctx.db.prepare('INSERT INTO users (email, name, password_hash, locale) VALUES (?, ?, ?, ?)')
        .run(email, name, hash, locale).lastInsertRowid);
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) throw new HttpError(409, 'email_taken', 'email');
      throw err;
    }
    const user = ctx.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const token = createSession(ctx.db, userId);
    sendJson(ctx.res, 201, { user: publicUser(user) }, { 'Set-Cookie': sessionCookie(ctx, token, SESSION_TTL_SECONDS) });
  });

  r.add('POST', '/api/auth/login', async (ctx) => {
    if (!loginLimiter.take(ctx.ip)) throw new HttpError(429, 'rate_limited');
    const body = await ctx.body();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password || password.length > 200) throw new HttpError(401, 'invalid_credentials');

    const user = ctx.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      await burnPasswordCheck(password);
      throw new HttpError(401, 'invalid_credentials');
    }
    if (!(await verifyPassword(password, user.password_hash))) throw new HttpError(401, 'invalid_credentials');

    loginLimiter.reset(ctx.ip);
    const token = createSession(ctx.db, user.id);
    sendJson(ctx.res, 200, { user: publicUser(user) }, { 'Set-Cookie': sessionCookie(ctx, token, SESSION_TTL_SECONDS) });
  });

  r.add('POST', '/api/auth/logout', (ctx) => {
    destroySession(ctx.db, ctx.token);
    sendJson(ctx.res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(ctx, '', 0) });
  });

  r.add('GET', '/api/auth/me', (ctx) => {
    sendJson(ctx.res, 200, { user: ctx.user ? publicUser(ctx.user) : null });
  });

  // ----- own account -----

  r.add('PATCH', '/api/me', async (ctx) => {
    const user = requireUser(ctx);
    const body = await ctx.body();
    const name = v.text(body, 'name', { min: 1, max: 80, optional: true });
    const locale = v.oneOf(body, 'locale', LANGUAGES, { optional: true });
    if (name !== undefined) ctx.db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, user.id);
    if (locale !== undefined) ctx.db.prepare('UPDATE users SET locale = ? WHERE id = ?').run(locale, user.id);
    const fresh = ctx.db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    sendJson(ctx.res, 200, { user: publicUser(fresh) });
  });

  r.add('POST', '/api/me/password', async (ctx) => {
    const user = requireUser(ctx);
    if (!loginLimiter.take(`pw:${user.id}`)) throw new HttpError(429, 'rate_limited');
    const body = await ctx.body();
    const current = typeof body.current_password === 'string' ? body.current_password : '';
    const next = v.password(body, 'new_password');
    const row = ctx.db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id);
    if (!(await verifyPassword(current, row.password_hash))) throw new HttpError(400, 'wrong_password', 'current_password');
    ctx.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(next), user.id);
    destroyOtherSessions(ctx.db, user.id, ctx.token);
    sendJson(ctx.res, 200, { ok: true });
  });

  // Self-service account deletion (GDPR Art. 17). Requires the password.
  r.add('DELETE', '/api/me', async (ctx) => {
    const user = requireUser(ctx);
    if (!loginLimiter.take(`del:${user.id}`)) throw new HttpError(429, 'rate_limited');
    const body = await ctx.body();
    const password = typeof body.password === 'string' ? body.password : '';
    const row = ctx.db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id);
    if (!(await verifyPassword(password, row.password_hash))) throw new HttpError(400, 'wrong_password', 'password');
    if (ctx.db.prepare('SELECT 1 FROM courses WHERE owner_id = ? LIMIT 1').get(user.id)) {
      throw new HttpError(409, 'owns_courses');
    }
    if (user.role === 'admin' && ctx.db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get().n <= 1) {
      throw new HttpError(409, 'last_admin');
    }
    // Sessions, enrolments and progress go with it (ON DELETE CASCADE).
    ctx.db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    sendJson(ctx.res, 200, { deleted: true }, { 'Set-Cookie': sessionCookie(ctx, '', 0) });
  });

  // ----- catalog -----

  r.add('GET', '/api/courses', (ctx) => {
    const where = ['c.published = 1'];
    const args = [];
    const lang = ctx.query.get('lang');
    if (lang && LANGUAGES.includes(lang)) { where.push('c.language = ?'); args.push(lang); }
    const level = ctx.query.get('level');
    if (level && LEVELS.includes(level)) { where.push('c.level = ?'); args.push(level); }
    const q = (ctx.query.get('q') || '').trim().slice(0, 100);
    if (q) {
      where.push("(c.title LIKE ? ESCAPE '\\' OR c.summary LIKE ? ESCAPE '\\')");
      const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      args.push(like, like);
    }
    const limit = Math.min(Math.max(Number(ctx.query.get('limit')) || 100, 1), 200);
    const rows = ctx.db.prepare(`${COURSE_LIST_SQL} WHERE ${where.join(' AND ')} ORDER BY c.created_at DESC, c.id DESC LIMIT ${limit}`)
      .all(...args);
    sendJson(ctx.res, 200, { courses: rows.map(courseRow) });
  });

  r.add('GET', '/api/courses/:slug', (ctx) => {
    const course = loadCourseBySlug(ctx.db, ctx.params.slug);
    const manage = canManage(ctx.user, course);
    if (!course.published && !manage) throw new HttpError(404, 'not_found');

    const enrolled = ctx.user ? isEnrolled(ctx.db, ctx.user.id, course.id) : false;
    const lessons = ctx.db.prepare(`
      SELECT l.id, l.title, l.position, l.duration_min,
        EXISTS (SELECT 1 FROM progress p WHERE p.lesson_id = l.id AND p.user_id = ?) AS completed
      FROM lessons l WHERE l.course_id = ? ORDER BY l.position, l.id
    `).all(ctx.user?.id ?? 0, course.id).map((l) => ({ ...l, completed: !!l.completed }));

    sendJson(ctx.res, 200, {
      course: { ...courseRow(course), description: course.description },
      lessons,
      enrolled,
      can_manage: manage,
      can_view_lessons: enrolled || manage,
    });
  });

  r.add('POST', '/api/courses/:slug/enroll', (ctx) => {
    const user = requireUser(ctx);
    const course = loadCourseBySlug(ctx.db, ctx.params.slug);
    if (!course.published && !canManage(user, course)) throw new HttpError(404, 'not_found');
    ctx.db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)').run(user.id, course.id);
    sendJson(ctx.res, 200, { enrolled: true });
  });

  r.add('DELETE', '/api/courses/:slug/enroll', (ctx) => {
    const user = requireUser(ctx);
    const course = loadCourseBySlug(ctx.db, ctx.params.slug);
    ctx.db.prepare('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?').run(user.id, course.id);
    sendJson(ctx.res, 200, { enrolled: false });
  });

  r.add('GET', '/api/courses/:slug/lessons/:id', (ctx) => {
    const user = requireUser(ctx);
    const course = loadCourseBySlug(ctx.db, ctx.params.slug);
    const manage = canManage(user, course);
    if (!course.published && !manage) throw new HttpError(404, 'not_found');
    if (!manage && !isEnrolled(ctx.db, user.id, course.id)) throw new HttpError(403, 'not_enrolled');

    const lesson = ctx.db.prepare('SELECT * FROM lessons WHERE id = ? AND course_id = ?').get(v.idParam(ctx.params.id), course.id);
    if (!lesson) throw new HttpError(404, 'not_found');

    const siblings = ctx.db.prepare(`
      SELECT l.id, l.title, l.position, l.duration_min,
        EXISTS (SELECT 1 FROM progress p WHERE p.lesson_id = l.id AND p.user_id = ?) AS completed
      FROM lessons l WHERE l.course_id = ? ORDER BY l.position, l.id
    `).all(user.id, course.id).map((l) => ({ ...l, completed: !!l.completed }));
    const idx = siblings.findIndex((l) => l.id === lesson.id);

    sendJson(ctx.res, 200, {
      course: courseRow(course),
      lesson: {
        id: lesson.id, title: lesson.title, content: lesson.content, duration_min: lesson.duration_min,
        position: lesson.position, completed: siblings[idx].completed,
      },
      lessons: siblings,
      prev_id: siblings[idx - 1]?.id ?? null,
      next_id: siblings[idx + 1]?.id ?? null,
    });
  });

  const lessonForProgress = (ctx) => {
    const user = requireUser(ctx);
    const lesson = ctx.db.prepare(`
      SELECT l.id, l.course_id, c.owner_id, c.published FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?
    `).get(v.idParam(ctx.params.id));
    if (!lesson) throw new HttpError(404, 'not_found');
    if (!canManage(user, lesson) && !isEnrolled(ctx.db, user.id, lesson.course_id)) throw new HttpError(403, 'not_enrolled');
    return { user, lesson };
  };

  r.add('POST', '/api/lessons/:id/complete', (ctx) => {
    const { user, lesson } = lessonForProgress(ctx);
    ctx.db.prepare('INSERT OR IGNORE INTO progress (user_id, lesson_id) VALUES (?, ?)').run(user.id, lesson.id);
    sendJson(ctx.res, 200, { completed: true });
  });

  r.add('DELETE', '/api/lessons/:id/complete', (ctx) => {
    const { user, lesson } = lessonForProgress(ctx);
    ctx.db.prepare('DELETE FROM progress WHERE user_id = ? AND lesson_id = ?').run(user.id, lesson.id);
    sendJson(ctx.res, 200, { completed: false });
  });

  // ----- dashboard -----

  r.add('GET', '/api/dashboard', (ctx) => {
    const user = requireUser(ctx);
    const courses = ctx.db.prepare(`
      SELECT c.id, c.slug, c.title, c.summary, c.language, c.level, c.published, e.created_at AS enrolled_at,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS total,
        (SELECT COUNT(*) FROM progress p JOIN lessons l ON l.id = p.lesson_id
           WHERE l.course_id = c.id AND p.user_id = e.user_id) AS done,
        (SELECT l.id FROM lessons l WHERE l.course_id = c.id
           AND NOT EXISTS (SELECT 1 FROM progress p WHERE p.lesson_id = l.id AND p.user_id = e.user_id)
           ORDER BY l.position, l.id LIMIT 1) AS next_lesson_id,
        (SELECT l.id FROM lessons l WHERE l.course_id = c.id ORDER BY l.position, l.id LIMIT 1) AS first_lesson_id,
        (SELECT MAX(p.completed_at) FROM progress p JOIN lessons l ON l.id = p.lesson_id
           WHERE l.course_id = c.id AND p.user_id = e.user_id) AS last_activity
      FROM enrollments e JOIN courses c ON c.id = e.course_id
      WHERE e.user_id = ?
      ORDER BY COALESCE(last_activity, e.created_at) DESC
    `).all(user.id).map((c) => ({ ...c, published: !!c.published }));

    let teaching = null;
    if (user.role === 'instructor' || user.role === 'admin') {
      teaching = ctx.db.prepare(`
        SELECT COUNT(*) AS courses,
          (SELECT COUNT(*) FROM enrollments e JOIN courses c2 ON c2.id = e.course_id WHERE c2.owner_id = ?) AS students
        FROM courses WHERE owner_id = ?
      `).get(user.id, user.id);
    }
    sendJson(ctx.res, 200, { courses, teaching });
  });

  // ----- teaching (instructor + admin) -----

  r.add('GET', '/api/teach/courses', (ctx) => {
    const user = requireRole(ctx, 'instructor', 'admin');
    const scope = user.role === 'admin' ? '' : 'WHERE c.owner_id = ?';
    const rows = ctx.db.prepare(`
      SELECT c.*, u.name AS instructor,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count
      FROM courses c JOIN users u ON u.id = c.owner_id ${scope}
      ORDER BY c.updated_at DESC, c.id DESC
    `).all(...(user.role === 'admin' ? [] : [user.id]));
    sendJson(ctx.res, 200, {
      courses: rows.map((c) => ({ ...courseRow(c), student_count: c.student_count, owner_id: c.owner_id })),
    });
  });

  const readCourseFields = (body, { partial }) => ({
    title: v.text(body, 'title', { min: 1, max: 140, optional: partial }),
    summary: v.text(body, 'summary', { max: 280, optional: true }),
    description: v.text(body, 'description', { max: 50_000, optional: true, trim: false }),
    language: v.oneOf(body, 'language', LANGUAGES, { optional: partial }),
    level: v.oneOf(body, 'level', LEVELS, { optional: true }),
    published: v.bool(body, 'published', { optional: true }),
  });

  r.add('POST', '/api/teach/courses', async (ctx) => {
    const user = requireRole(ctx, 'instructor', 'admin');
    const f = readCourseFields(await ctx.body(), { partial: false });
    const id = transaction(ctx.db, () => {
      const slug = uniqueSlug(ctx.db, v.slugify(f.title));
      return Number(ctx.db.prepare(`
        INSERT INTO courses (slug, title, summary, description, language, level, published, owner_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(slug, f.title, f.summary ?? '', f.description ?? '', f.language, f.level ?? 'beginner', f.published ? 1 : 0, user.id)
        .lastInsertRowid);
    });
    const course = ctx.db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
    sendJson(ctx.res, 201, { course: { ...courseRow(course), description: course.description } });
  });

  r.add('GET', '/api/teach/courses/:id', (ctx) => {
    requireRole(ctx, 'instructor', 'admin');
    const course = loadManagedCourse(ctx, ctx.params.id);
    const lessons = ctx.db.prepare('SELECT id, title, position, duration_min, updated_at FROM lessons WHERE course_id = ? ORDER BY position, id')
      .all(course.id);
    const students = ctx.db.prepare('SELECT COUNT(*) AS n FROM enrollments WHERE course_id = ?').get(course.id).n;
    sendJson(ctx.res, 200, { course: { ...courseRow(course), description: course.description, student_count: students }, lessons });
  });

  r.add('PUT', '/api/teach/courses/:id', async (ctx) => {
    requireRole(ctx, 'instructor', 'admin');
    const course = loadManagedCourse(ctx, ctx.params.id);
    const body = await ctx.body();
    const f = readCourseFields(body, { partial: true });
    let slug = course.slug;
    if (body.slug !== undefined) {
      slug = v.text(body, 'slug', { min: 1, max: 60 });
      if (!v.SLUG_RE.test(slug)) throw new HttpError(400, 'validation', 'slug');
      if (ctx.db.prepare('SELECT 1 FROM courses WHERE slug = ? AND id <> ?').get(slug, course.id)) {
        throw new HttpError(409, 'slug_taken', 'slug');
      }
    }
    ctx.db.prepare(`
      UPDATE courses SET slug = ?, title = ?, summary = ?, description = ?, language = ?, level = ?, published = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
      WHERE id = ?
    `).run(
      slug, f.title ?? course.title, f.summary ?? course.summary, f.description ?? course.description,
      f.language ?? course.language, f.level ?? course.level,
      f.published === undefined ? course.published : (f.published ? 1 : 0), course.id,
    );
    const fresh = ctx.db.prepare('SELECT * FROM courses WHERE id = ?').get(course.id);
    sendJson(ctx.res, 200, { course: { ...courseRow(fresh), description: fresh.description } });
  });

  r.add('DELETE', '/api/teach/courses/:id', (ctx) => {
    requireRole(ctx, 'instructor', 'admin');
    const course = loadManagedCourse(ctx, ctx.params.id);
    ctx.db.prepare('DELETE FROM courses WHERE id = ?').run(course.id);
    sendJson(ctx.res, 200, { deleted: true });
  });

  const readLessonFields = (body, { partial }) => ({
    title: v.text(body, 'title', { min: 1, max: 140, optional: partial }),
    content: v.text(body, 'content', { max: 200_000, optional: true, trim: false }),
    duration_min: v.int(body, 'duration_min', { min: 0, max: 1000, optional: true }),
  });

  r.add('POST', '/api/teach/courses/:id/lessons', async (ctx) => {
    requireRole(ctx, 'instructor', 'admin');
    const course = loadManagedCourse(ctx, ctx.params.id);
    const f = readLessonFields(await ctx.body(), { partial: false });
    const id = transaction(ctx.db, () => {
      const pos = ctx.db.prepare('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM lessons WHERE course_id = ?').get(course.id).p;
      const newId = Number(ctx.db.prepare('INSERT INTO lessons (course_id, position, title, content, duration_min) VALUES (?, ?, ?, ?, ?)')
        .run(course.id, pos, f.title, f.content ?? '', f.duration_min ?? 0).lastInsertRowid);
      touchCourse(ctx.db, course.id);
      return newId;
    });
    sendJson(ctx.res, 201, { lesson: ctx.db.prepare('SELECT * FROM lessons WHERE id = ?').get(id) });
  });

  const loadManagedLesson = (ctx) => {
    requireRole(ctx, 'instructor', 'admin');
    const lesson = ctx.db.prepare('SELECT * FROM lessons WHERE id = ?').get(v.idParam(ctx.params.id));
    if (!lesson) throw new HttpError(404, 'not_found');
    loadManagedCourse(ctx, lesson.course_id);
    return lesson;
  };

  r.add('GET', '/api/teach/lessons/:id', (ctx) => {
    const lesson = loadManagedLesson(ctx);
    const course = ctx.db.prepare('SELECT id, slug, title FROM courses WHERE id = ?').get(lesson.course_id);
    sendJson(ctx.res, 200, { lesson, course });
  });

  r.add('PUT', '/api/teach/lessons/:id', async (ctx) => {
    const lesson = loadManagedLesson(ctx);
    const f = readLessonFields(await ctx.body(), { partial: true });
    ctx.db.prepare(`
      UPDATE lessons SET title = ?, content = ?, duration_min = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?
    `).run(f.title ?? lesson.title, f.content ?? lesson.content, f.duration_min ?? lesson.duration_min, lesson.id);
    touchCourse(ctx.db, lesson.course_id);
    sendJson(ctx.res, 200, { lesson: ctx.db.prepare('SELECT * FROM lessons WHERE id = ?').get(lesson.id) });
  });

  r.add('POST', '/api/teach/lessons/:id/move', async (ctx) => {
    const lesson = loadManagedLesson(ctx);
    const body = await ctx.body();
    const dir = v.oneOf(body, 'direction', ['up', 'down']);
    transaction(ctx.db, () => {
      renumberLessons(ctx.db, lesson.course_id);
      const cur = ctx.db.prepare('SELECT position FROM lessons WHERE id = ?').get(lesson.id).position;
      const target = dir === 'up' ? cur - 1 : cur + 1;
      const other = ctx.db.prepare('SELECT id FROM lessons WHERE course_id = ? AND position = ?').get(lesson.course_id, target);
      if (other) {
        ctx.db.prepare('UPDATE lessons SET position = ? WHERE id = ?').run(cur, other.id);
        ctx.db.prepare('UPDATE lessons SET position = ? WHERE id = ?').run(target, lesson.id);
      }
      touchCourse(ctx.db, lesson.course_id);
    });
    const lessons = ctx.db.prepare('SELECT id, title, position, duration_min, updated_at FROM lessons WHERE course_id = ? ORDER BY position, id')
      .all(lesson.course_id);
    sendJson(ctx.res, 200, { lessons });
  });

  r.add('DELETE', '/api/teach/lessons/:id', (ctx) => {
    const lesson = loadManagedLesson(ctx);
    transaction(ctx.db, () => {
      ctx.db.prepare('DELETE FROM lessons WHERE id = ?').run(lesson.id);
      renumberLessons(ctx.db, lesson.course_id);
      touchCourse(ctx.db, lesson.course_id);
    });
    sendJson(ctx.res, 200, { deleted: true });
  });

  // ----- admin -----

  r.add('GET', '/api/admin/users', (ctx) => {
    requireRole(ctx, 'admin');
    const q = (ctx.query.get('q') || '').trim().slice(0, 100);
    const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    const users = ctx.db.prepare(`
      SELECT id, email, name, role, locale, created_at FROM users
      WHERE (? = '' OR name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')
      ORDER BY created_at DESC, id DESC LIMIT 200
    `).all(q, like, like);
    sendJson(ctx.res, 200, { users });
  });

  r.add('PUT', '/api/admin/users/:id/role', async (ctx) => {
    const admin = requireRole(ctx, 'admin');
    const id = v.idParam(ctx.params.id);
    if (id === admin.id) throw new HttpError(400, 'cannot_change_own_role');
    const role = v.oneOf(await ctx.body(), 'role', ROLES);
    const result = ctx.db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    if (result.changes === 0) throw new HttpError(404, 'not_found');
    sendJson(ctx.res, 200, { user: ctx.db.prepare('SELECT id, email, name, role, locale, created_at FROM users WHERE id = ?').get(id) });
  });

  return r;
}
