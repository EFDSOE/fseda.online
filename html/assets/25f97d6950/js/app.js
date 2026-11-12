import { api } from './api.js';
import { t, setLanguage, getLanguage, detectLanguage, onLanguageChange, LANGUAGES, LANGUAGE_NAMES } from './i18n.js';
import { h, clear, toast } from './ui.js';
import { routes } from './views/index.js';

export const state = { user: null };

const main = () => document.getElementById('main');

// ----- routing -----

function matchRoute(pathname) {
  for (const route of routes) {
    const m = route.regex.exec(pathname);
    if (m) return { route, params: m.groups || {} };
  }
  return null;
}

let renderToken = 0;

export async function render() {
  const token = ++renderToken;
  const { pathname } = location;
  const found = matchRoute(pathname) || { route: routes.find((r) => r.name === 'notfound'), params: {} };
  const { route, params } = found;

  if (route.auth && !state.user) {
    navigate(`/login?next=${encodeURIComponent(pathname + location.search)}`, { replace: true });
    return;
  }
  if (route.roles && !route.roles.includes(state.user?.role)) {
    return show(token, route, routes.find((r) => r.name === 'forbidden').view({}));
  }

  renderHeader(route.nav);
  const container = h('div', { class: `view view-${route.name}` });
  try {
    const content = await route.view({ params, query: new URLSearchParams(location.search), container });
    if (token !== renderToken) return; // a newer navigation started meanwhile
    show(token, route, content ?? container);
  } catch (err) {
    if (token !== renderToken) return;
    if (err.code === 'unauthorized') {
      state.user = null;
      navigate(`/login?next=${encodeURIComponent(pathname)}`, { replace: true });
      return;
    }
    const notFound = err.status === 404;
    show(token, route, routes.find((r) => r.name === (notFound ? 'notfound' : 'error')).view({ error: err }));
  }
}

function show(token, route, content) {
  if (token !== renderToken) return;
  const el = clear(main());
  el.append(content);
  const heading = el.querySelector('h1');
  document.title = heading ? `${heading.textContent} – fseda` : 'fseda';
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    if (!history.state?.restore) heading.focus({ preventScroll: true });
  }
  renderHeader(route.nav);
}

export function navigate(url, { replace = false } = {}) {
  if (replace) history.replaceState({}, '', url);
  else history.pushState({}, '', url);
  window.scrollTo(0, 0);
  render();
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href]');
  if (!link || link.target || link.hasAttribute('download')) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  event.preventDefault();
  if (url.pathname === location.pathname && url.search === location.search && url.hash) {
    document.getElementById(url.hash.slice(1))?.scrollIntoView();
    return;
  }
  navigate(url.pathname + url.search + url.hash);
});

window.addEventListener('popstate', () => render());

// ----- header -----

function renderHeader(active) {
  const header = document.getElementById('site-header');
  const user = state.user;
  const navLink = (href, key, name) => h('a', { href, class: 'nav-link', 'aria-current': active === name ? 'page' : null }, t(key));

  const links = [navLink('/courses', 'nav.courses', 'courses')];
  if (user) links.push(navLink('/dashboard', 'nav.dashboard', 'dashboard'));
  if (user && (user.role === 'instructor' || user.role === 'admin')) links.push(navLink('/teach', 'nav.teach', 'teach'));
  if (user?.role === 'admin') links.push(navLink('/admin', 'nav.admin', 'admin'));

  const langSelect = h('select', {
    class: 'lang-select', 'aria-label': t('nav.language'),
    onchange: (e) => changeLanguage(e.target.value),
  }, LANGUAGES.map((code) => h('option', { value: code, selected: code === getLanguage(), lang: code }, LANGUAGE_NAMES[code])));

  const account = user
    ? [navLink('/account', 'nav.account', 'account'),
      h('button', { type: 'button', class: 'btn btn-quiet', onclick: logout }, t('nav.logout'))]
    : [navLink('/login', 'nav.login', 'login'),
      h('a', { href: '/register', class: 'btn btn-primary btn-small' }, t('nav.register'))];

  const menuId = 'site-menu';
  const toggle = h('button', {
    type: 'button', class: 'menu-toggle', 'aria-expanded': 'false', 'aria-controls': menuId,
    onclick: () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      header.classList.toggle('menu-open', open);
    },
  }, h('span', { class: 'menu-icon', 'aria-hidden': 'true' }), h('span', { class: 'visually-hidden' }, t('nav.menu')));

  clear(header).append(
    h('div', { class: 'header-inner' },
      h('a', { href: '/', class: 'wordmark', 'aria-label': 'fseda – Start' }, 'fseda'),
      toggle,
      h('div', { class: 'header-menu', id: menuId },
        h('nav', { class: 'nav-main', 'aria-label': t('nav.main') }, links),
        h('div', { class: 'nav-account' }, langSelect, account),
      ),
    ),
  );
  header.classList.remove('menu-open');

  const skip = document.getElementById('skip-link');
  if (skip) skip.textContent = t('nav.skip');
  const footer = document.getElementById('site-footer');
  clear(footer).append(h('div', { class: 'footer-inner' },
    h('p', null, t('footer.text', { year: new Date().getFullYear() })),
    h('nav', { class: 'footer-links', 'aria-label': t('footer.legal') },
      h('a', { href: '/impressum' }, t('footer.impressum')),
      h('a', { href: '/datenschutz' }, t('footer.privacy')))));
}

export async function changeLanguage(lang) {
  await setLanguage(lang);
  if (state.user && state.user.locale !== lang) {
    try {
      state.user = (await api('/me', { method: 'PATCH', body: { locale: lang } })).user;
    } catch { /* not critical */ }
  }
}

async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch { /* the session is gone either way */ }
  state.user = null;
  toast(t('auth.logged_out'));
  navigate('/');
}

export function setUser(user) {
  state.user = user;
}

// ----- boot -----

async function boot() {
  let user = null;
  try {
    user = (await api('/auth/me')).user;
  } catch { /* API unreachable: the public pages still work */ }
  state.user = user;
  await setLanguage(detectLanguage(user?.locale), { persist: false });
  onLanguageChange(() => render());
  await render();
}

boot();
