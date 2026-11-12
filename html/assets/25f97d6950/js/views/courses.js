import { api } from '../api.js';
import { t, LANGUAGES, LANGUAGE_NAMES, errorMessage } from '../i18n.js';
import { h, clear, courseList, courseMeta, emptyState, loading, progressBar, toast, reportLink } from '../ui.js';
import { SITE } from '../site-config.js';
import { renderMarkdown } from '../markdown.js';
import { state, navigate } from '../app.js';

const LEVELS = ['beginner', 'intermediate', 'advanced'];

export async function catalogView({ query }) {
  const filters = {
    lang: LANGUAGES.includes(query.get('lang')) ? query.get('lang') : '',
    level: LEVELS.includes(query.get('level')) ? query.get('level') : '',
    q: query.get('q') || '',
  };
  const results = h('div', { class: 'results', 'aria-live': 'polite' }, loading());

  async function load() {
    const params = new URLSearchParams();
    for (const [k, val] of Object.entries(filters)) if (val) params.set(k, val);
    const qs = params.toString();
    history.replaceState({}, '', `/courses${qs ? `?${qs}` : ''}`);
    try {
      const { courses } = await api(`/courses${qs ? `?${qs}` : ''}`);
      clear(results).append(courses.length
        ? courseList(courses)
        : emptyState(t('courses.empty'), h('button', { type: 'button', class: 'btn btn-secondary', onclick: reset }, t('courses.reset'))));
    } catch (err) {
      clear(results).append(emptyState(errorMessage(err)));
    }
  }

  function reset() {
    filters.lang = ''; filters.level = ''; filters.q = '';
    search.value = ''; levelSelect.value = '';
    updateChips();
    load();
  }

  const chips = [{ code: '', label: t('courses.all_languages') }, ...LANGUAGES.map((code) => ({ code, label: LANGUAGE_NAMES[code] }))]
    .map(({ code, label }) => h('button', {
      type: 'button', class: 'chip', lang: code || null, dataset: { code },
      onclick: () => { filters.lang = code; updateChips(); load(); },
    }, label));
  const updateChips = () => chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.code === filters.lang)));
  updateChips();

  const levelSelect = h('select', {
    'aria-label': t('courses.level_filter'),
    onchange: (e) => { filters.level = e.target.value; load(); },
  }, [h('option', { value: '' }, t('courses.all_levels')), ...LEVELS.map((l) => h('option', { value: l }, t(`level.${l}`)))]);
  levelSelect.value = filters.level;

  let debounce;
  const search = h('input', {
    type: 'search', value: filters.q, placeholder: t('courses.search'), 'aria-label': t('courses.search'),
    oninput: (e) => { clearTimeout(debounce); debounce = setTimeout(() => { filters.q = e.target.value.trim(); load(); }, 250); },
  });

  load();
  return h('section', null,
    h('h1', null, t('courses.title')),
    h('div', { class: 'filters' },
      h('div', { class: 'chips', role: 'group', 'aria-label': t('courses.language_filter') }, chips),
      h('div', { class: 'filter-row' }, search, levelSelect),
    ),
    results,
  );
}

export async function courseView({ params }) {
  const data = await api(`/courses/${encodeURIComponent(params.slug)}`);
  const { course, lessons } = data;
  const done = lessons.filter((l) => l.completed).length;
  const nextLesson = lessons.find((l) => !l.completed) || lessons[0];
  const lessonHref = (id) => `/courses/${encodeURIComponent(course.slug)}/lessons/${id}`;

  async function enroll() {
    try {
      await api(`/courses/${encodeURIComponent(course.slug)}/enroll`, { method: 'POST' });
      toast(t('course.enrolled'));
      if (lessons.length) navigate(lessonHref(lessons[0].id));
      else navigate(location.pathname, { replace: true });
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  let primary;
  if (!state.user) {
    primary = h('div', { class: 'callout' },
      h('p', null, t('course.login_to_enroll')),
      h('div', { class: 'actions' },
        h('a', { href: `/register?next=${encodeURIComponent(location.pathname)}`, class: 'btn btn-primary' }, t('nav.register')),
        h('a', { href: `/login?next=${encodeURIComponent(location.pathname)}`, class: 'btn btn-secondary' }, t('nav.login'))));
  } else if (data.enrolled) {
    primary = h('div', { class: 'callout' },
      progressBar(done, lessons.length),
      nextLesson ? h('a', { href: lessonHref(nextLesson.id), class: 'btn btn-primary' },
        done === 0 ? t('course.start') : done === lessons.length ? t('course.review') : t('course.continue')) : null);
  } else {
    primary = h('div', { class: 'callout' },
      h('button', { type: 'button', class: 'btn btn-primary', onclick: enroll }, t('course.enroll')));
  }

  const description = h('div', { class: 'prose' });
  description.innerHTML = renderMarkdown(course.description); // safe: renderMarkdown escapes all input

  const syllabus = lessons.length
    ? h('ol', { class: 'syllabus' }, lessons.map((l) => h('li', { class: l.completed ? 'is-done' : '' },
      data.can_view_lessons ? h('a', { href: lessonHref(l.id) }, l.title) : h('span', null, l.title),
      h('span', { class: 'syllabus-meta' },
        l.duration_min ? t('course.minutes', { n: l.duration_min }) : '',
        l.completed ? h('span', { class: 'done-mark' }, t('lesson.done')) : null))))
    : h('p', { class: 'muted' }, t('course.no_lessons'));

  return h('article', { class: 'course-page' },
    h('header', { class: 'course-head' },
      !course.published ? h('p', { class: 'badge-draft' }, t('course.draft')) : null,
      h('h1', null, course.title),
      course.summary ? h('p', { class: 'lead' }, course.summary) : null,
      courseMeta(course),
      course.instructor ? h('p', { class: 'muted' }, t('course.instructor', { name: course.instructor })) : null,
      data.can_manage ? h('p', null, h('a', { href: `/teach/${course.id}` }, t('course.edit'))) : null,
    ),
    h('div', { class: 'course-body' },
      h('div', { class: 'course-main' },
        primary,
        course.description ? description : null),
      h('section', { class: 'course-syllabus', 'aria-labelledby': 'syllabus-title' },
        h('h2', { id: 'syllabus-title' }, t('course.syllabus')),
        syllabus,
        reportLink(SITE.contactEmail)),
    ),
  );
}
