import { api } from '../api.js';
import { t, getLanguage, LANGUAGES, LANGUAGE_NAMES } from '../i18n.js';
import { h, courseList, emptyState } from '../ui.js';
import { state, changeLanguage } from '../app.js';

export async function homeView() {
  let courses = [];
  try {
    courses = (await api('/courses?limit=5')).courses;
  } catch { /* show the page without the list */ }

  const current = getLanguage();
  const languageRow = h('div', { class: 'hero-languages', role: 'group', 'aria-label': t('home.pick_language') },
    LANGUAGES.map((code) => h('button', {
      type: 'button',
      class: 'hero-language',
      lang: code,
      'aria-pressed': String(code === current),
      onclick: () => changeLanguage(code),
    }, LANGUAGE_NAMES[code])));

  const actions = state.user
    ? [h('a', { href: '/dashboard', class: 'btn btn-primary' }, t('home.cta_continue')),
      h('a', { href: '/courses', class: 'btn btn-secondary' }, t('home.cta_browse'))]
    : [h('a', { href: '/register', class: 'btn btn-primary' }, t('home.cta_register')),
      h('a', { href: '/courses', class: 'btn btn-secondary' }, t('home.cta_browse'))];

  const steps = [1, 2, 3].map((n) => h('li', { class: 'step' },
    h('h3', null, t(`home.step${n}_title`)),
    h('p', null, t(`home.step${n}_text`))));

  return h('div', { class: 'home' },
    h('section', { class: 'hero' },
      h('h1', { class: 'hero-title' }, t('home.title')),
      h('p', { class: 'hero-lead' }, t('home.lead')),
      h('p', { class: 'hero-pick' }, t('home.pick_language')),
      languageRow,
      h('div', { class: 'actions' }, actions),
    ),
    h('section', { class: 'section' },
      h('div', { class: 'section-head' },
        h('h2', null, t('home.latest')),
        courses.length ? h('a', { href: '/courses' }, t('home.all_courses')) : null),
      courses.length ? courseList(courses) : emptyState(t('home.no_courses')),
    ),
    h('section', { class: 'section' },
      h('h2', null, t('home.how_title')),
      h('ol', { class: 'steps' }, steps),
    ),
  );
}
