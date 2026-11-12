import { api } from '../api.js';
import { t, getLanguage, setLanguage, LANGUAGES, LANGUAGE_NAMES } from '../i18n.js';
import { h, field, handleForm, toast } from '../ui.js';
import { state, setUser, navigate } from '../app.js';

// Only allow redirects to our own paths.
function nextUrl(query) {
  const next = query.get('next') || '';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

export function loginView({ query }) {
  if (state.user) {
    navigate(nextUrl(query), { replace: true });
    return h('div');
  }
  const form = h('form', { class: 'form', novalidate: false },
    field({ label: t('auth.email'), name: 'email', type: 'email', required: true, autocomplete: 'email' }),
    field({ label: t('auth.password'), name: 'password', type: 'password', required: true, autocomplete: 'current-password' }),
    h('button', { type: 'submit', class: 'btn btn-primary' }, t('auth.submit_login')));

  handleForm(form, async (values) => {
    const { user } = await api('/auth/login', { method: 'POST', body: values });
    setUser(user);
    await setLanguage(user.locale);
    toast(t('auth.welcome', { name: user.name }));
    navigate(nextUrl(query));
  });

  return h('section', { class: 'narrow auth' },
    h('h1', null, t('auth.login_title')),
    form,
    h('p', { class: 'muted' }, t('auth.no_account'), ' ',
      h('a', { href: `/register${location.search}` }, t('auth.register_title'))));
}

export function registerView({ query }) {
  if (state.user) {
    navigate(nextUrl(query), { replace: true });
    return h('div');
  }
  const form = h('form', { class: 'form' },
    field({ label: t('auth.name'), name: 'name', required: true, autocomplete: 'name', maxlength: 80 }),
    field({ label: t('auth.email'), name: 'email', type: 'email', required: true, autocomplete: 'email' }),
    field({ label: t('auth.password'), name: 'password', type: 'password', required: true, autocomplete: 'new-password', minlength: 10, hint: t('auth.password_hint') }),
    field({
      label: t('auth.preferred_language'), name: 'locale', type: 'select', value: getLanguage(),
      options: LANGUAGES.map((code) => ({ value: code, label: LANGUAGE_NAMES[code] })),
    }),
    h('button', { type: 'submit', class: 'btn btn-primary' }, t('auth.submit_register')));

  handleForm(form, async (values) => {
    const { user } = await api('/auth/register', { method: 'POST', body: values });
    setUser(user);
    await setLanguage(user.locale);
    toast(t('auth.welcome', { name: user.name }));
    navigate(query.get('next') ? nextUrl(query) : '/courses');
  });

  return h('section', { class: 'narrow auth' },
    h('h1', null, t('auth.register_title')),
    h('p', { class: 'lead' }, t('auth.register_lead')),
    form,
    h('p', { class: 'muted' }, t('auth.have_account'), ' ',
      h('a', { href: `/login${location.search}` }, t('auth.login_title'))));
}
