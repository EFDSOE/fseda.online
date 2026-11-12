import { homeView } from './home.js';
import { catalogView, courseView } from './courses.js';
import { lessonView } from './lesson.js';
import { loginView, registerView } from './auth.js';
import { dashboardView } from './dashboard.js';
import { accountView } from './account.js';
import { teachListView, courseEditorView, lessonEditorView } from './teach.js';
import { adminView } from './admin.js';
import { notFoundView, forbiddenView, errorPageView } from './misc.js';
import { impressumView, privacyView } from './legal.js';

const SLUG = '(?<slug>[a-z0-9-]+)';
const ID = (name) => `(?<${name}>\\d+)`;
const route = (name, pattern, view, opts = {}) => ({ name, regex: new RegExp(`^${pattern}/?$`), view, nav: opts.nav ?? name, ...opts });

export const routes = [
  route('home', '/', homeView, { nav: null }),
  route('courses', '/courses', catalogView),
  route('course', `/courses/${SLUG}`, courseView, { nav: 'courses' }),
  route('lesson', `/courses/${SLUG}/lessons/${ID('id')}`, lessonView, { nav: 'dashboard', auth: true }),
  route('login', '/login', loginView),
  route('register', '/register', registerView, { nav: null }),
  route('dashboard', '/dashboard', dashboardView, { auth: true }),
  route('account', '/account', accountView, { auth: true }),
  route('teach', '/teach', teachListView, { auth: true, roles: ['instructor', 'admin'] }),
  route('teach-new', '/teach/new', courseEditorView, { nav: 'teach', auth: true, roles: ['instructor', 'admin'] }),
  route('teach-course', `/teach/${ID('courseId')}`, courseEditorView, { nav: 'teach', auth: true, roles: ['instructor', 'admin'] }),
  route('teach-lesson-new', `/teach/${ID('courseId')}/lessons/new`, lessonEditorView, { nav: 'teach', auth: true, roles: ['instructor', 'admin'] }),
  route('teach-lesson', `/teach/${ID('courseId')}/lessons/${ID('lessonId')}`, lessonEditorView, { nav: 'teach', auth: true, roles: ['instructor', 'admin'] }),
  route('admin', '/admin', adminView, { auth: true, roles: ['admin'] }),
  route('impressum', '/impressum', impressumView, { nav: null }),
  route('privacy', '/datenschutz', privacyView, { nav: null }),
  { name: 'notfound', regex: /^$/, view: notFoundView, nav: null },
  { name: 'forbidden', regex: /^$/, view: forbiddenView, nav: null },
  { name: 'error', regex: /^$/, view: errorPageView, nav: null },
];
