import { api } from '../api.js';
import { t, LANGUAGE_NAMES } from '../i18n.js';
import { h, emptyState, progressBar } from '../ui.js';
import { state } from '../app.js';

export async function dashboardView() {
  const { courses, teaching } = await api('/dashboard');

  const rows = courses.map((c) => {
    const lessonId = c.next_lesson_id ?? c.first_lesson_id;
    const label = c.done === 0 ? t('course.start') : c.done >= c.total && c.total > 0 ? t('course.review') : t('course.continue');
    const base = `/courses/${encodeURIComponent(c.slug)}`;
    return h('li', { class: 'learning-row' },
      h('div', { class: 'learning-main' },
        h('h3', null, h('a', { href: base }, c.title)),
        h('p', { class: 'meta' }, h('span', { class: 'tag', lang: c.language }, LANGUAGE_NAMES[c.language]), h('span', null, t(`level.${c.level}`))),
        progressBar(c.done, c.total)),
      lessonId ? h('a', { href: `${base}/lessons/${lessonId}`, class: 'btn btn-primary' }, label) : null);
  });

  return h('section', null,
    h('h1', null, t('dashboard.title', { name: state.user.name })),
    h('p', { class: 'lead' }, courses.length ? t('dashboard.lead') : t('dashboard.lead_new')),
    h('section', { class: 'section' },
      h('h2', null, t('dashboard.my_courses')),
      courses.length
        ? h('ul', { class: 'learning-list' }, rows)
        : emptyState(t('dashboard.empty'), h('a', { href: '/courses', class: 'btn btn-primary' }, t('dashboard.browse')))),
    teaching ? h('section', { class: 'section' },
      h('h2', null, t('dashboard.teaching')),
      h('p', null, t('dashboard.teaching_summary', { courses: teaching.courses, students: teaching.students })),
      h('a', { href: '/teach', class: 'btn btn-secondary' }, t('dashboard.manage'))) : null,
  );
}
