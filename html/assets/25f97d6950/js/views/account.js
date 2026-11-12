import { api } from '../api.js';
import { t, setLanguage, LANGUAGES, LANGUAGE_NAMES, formatDate } from '../i18n.js';
import { h, field, handleForm, toast } from '../ui.js';
import { state, setUser, navigate } from '../app.js';

export function accountView() {
  const user = state.user;

  const profile = h('form', { class: 'form' },
    field({ label: t('auth.name'), name: 'name', value: user.name, required: true, autocomplete: 'name', maxlength: 80 }),
    field({
      label: t('auth.preferred_language'), name: 'locale', type: 'select', value: user.locale,
      options: LANGUAGES.map((code) => ({ value: code, label: LANGUAGE_NAMES[code] })),
    }),
    h('button', { type: 'submit', class: 'btn btn-primary' }, t('account.save')));

  handleForm(profile, async (values) => {
    const { user: fresh } = await api('/me', { method: 'PATCH', body: values });
    setUser(fresh);
    toast(t('account.saved'));
    await setLanguage(fresh.locale); // re-renders the page in the new language
  });

  const password = h('form', { class: 'form' },
    field({ label: t('account.current_password'), name: 'current_password', type: 'password', required: true, autocomplete: 'current-password' }),
    field({ label: t('account.new_password'), name: 'new_password', type: 'password', required: true, minlength: 10, autocomplete: 'new-password', hint: t('auth.password_hint') }),
    h('button', { type: 'submit', class: 'btn btn-secondary' }, t('account.change_password')));

  handleForm(password, async (values) => {
    await api('/me/password', { method: 'POST', body: values });
    password.reset();
    toast(t('account.password_changed'));
  });

  const remove = h('form', { class: 'form' },
    field({ label: t('account.delete_password'), name: 'password', type: 'password', required: true, autocomplete: 'current-password' }),
    h('button', { type: 'submit', class: 'btn btn-danger' }, t('account.delete_button')));

  handleForm(remove, async (values) => {
    if (!window.confirm(t('account.delete_confirm'))) return;
    await api('/me', { method: 'DELETE', body: values });
    setUser(null);
    toast(t('account.deleted'));
    navigate('/');
  });

  return h('section', { class: 'narrow' },
    h('h1', null, t('account.title')),
    h('p', { class: 'muted' }, user.email, ' – ', t(`role.${user.role}`), ' – ', t('account.member_since', { date: formatDate(user.created_at) })),
    h('section', { class: 'section' }, h('h2', null, t('account.profile')), profile),
    h('section', { class: 'section' }, h('h2', null, t('account.password_title')), password),
    h('section', { class: 'danger-zone' },
      h('h2', null, t('account.delete_title')),
      h('p', { class: 'muted' }, t('account.delete_text')),
      remove),
  );
}
