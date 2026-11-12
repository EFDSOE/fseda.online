import { api } from '../api.js';
import { t, errorMessage } from '../i18n.js';
import { h, clear, progressBar, toast, reportLink } from '../ui.js';
import { SITE } from '../site-config.js';
import { renderMarkdown } from '../markdown.js';
import { navigate } from '../app.js';

export async function lessonView({ params }) {
  let data;
  try {
    data = await api(`/courses/${encodeURIComponent(params.slug)}/lessons/${params.id}`);
  } catch (err) {
    if (err.code === 'not_enrolled') {
      toast(errorMessage(err));
      navigate(`/courses/${encodeURIComponent(params.slug)}`, { replace: true });
      return h('div');
    }
    throw err;
  }
  const { course, lesson, lessons } = data;
  const base = `/courses/${encodeURIComponent(course.slug)}`;
  const lessonHref = (id) => `${base}/lessons/${id}`;

  const progressSlot = h('div');
  const outline = h('ol', { class: 'outline' });

  function paintSidebar() {
    const done = lessons.filter((l) => l.completed).length;
    clear(progressSlot).append(progressBar(done, lessons.length));
    clear(outline).append(...lessons.map((l) => h('li', { class: l.completed ? 'is-done' : '' },
      h('a', { href: lessonHref(l.id), 'aria-current': l.id === lesson.id ? 'page' : null },
        h('span', { class: 'outline-title' }, l.title),
        l.completed ? h('span', { class: 'visually-hidden' }, ` (${t('lesson.done')})`) : null))));
  }

  const toggle = h('button', { type: 'button', class: 'btn', onclick: toggleDone });
  const finished = h('p', { class: 'course-finished', role: 'status' });

  function paintToggle() {
    toggle.className = lesson.completed ? 'btn btn-done' : 'btn btn-primary';
    toggle.setAttribute('aria-pressed', String(lesson.completed));
    clear(toggle).append(lesson.completed ? t('lesson.done') : t('lesson.mark_done'));
    toggle.title = lesson.completed ? t('lesson.mark_open') : '';
    const allDone = lessons.every((l) => l.completed);
    finished.textContent = allDone ? t('lesson.course_done') : '';
    finished.hidden = !allDone;
  }

  async function toggleDone() {
    toggle.disabled = true;
    try {
      const next = !lesson.completed;
      await api(`/lessons/${lesson.id}/complete`, { method: next ? 'POST' : 'DELETE' });
      lesson.completed = next;
      lessons.find((l) => l.id === lesson.id).completed = next;
      paintToggle();
      paintSidebar();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      toggle.disabled = false;
    }
  }

  paintSidebar();
  paintToggle();

  const body = h('div', { class: 'prose' });
  body.innerHTML = renderMarkdown(lesson.content); // safe: renderMarkdown escapes all input

  const index = lessons.findIndex((l) => l.id === lesson.id);

  return h('div', { class: 'lesson-layout' },
    h('aside', { class: 'lesson-aside', 'aria-label': t('course.syllabus') },
      h('p', { class: 'aside-course' }, h('a', { href: base }, course.title)),
      progressSlot,
      outline),
    h('article', { class: 'lesson' },
      h('p', { class: 'muted lesson-position' }, t('lesson.position', { n: index + 1, total: lessons.length })),
      h('h1', null, lesson.title),
      lesson.duration_min ? h('p', { class: 'muted' }, t('course.minutes', { n: lesson.duration_min })) : null,
      body,
      h('div', { class: 'lesson-done' }, toggle, finished),
      h('nav', { class: 'lesson-nav', 'aria-label': t('lesson.nav') },
        data.prev_id ? h('a', { href: lessonHref(data.prev_id), class: 'btn btn-secondary', rel: 'prev' }, t('lesson.prev')) : h('span'),
        data.next_id
          ? h('a', { href: lessonHref(data.next_id), class: 'btn btn-secondary', rel: 'next' }, t('lesson.next'))
          : h('a', { href: base, class: 'btn btn-secondary' }, t('lesson.back'))),
      reportLink(SITE.contactEmail),
    ),
  );
}
