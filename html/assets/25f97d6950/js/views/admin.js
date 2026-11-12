import { api } from '../api.js';
import { t, formatDate, errorMessage } from '../i18n.js';
import { h, clear, toast, emptyState, loading } from '../ui.js';
import { state } from '../app.js';

const ROLES = ['student', 'instructor', 'admin'];

export function adminView() {
  const results = h('div', { 'aria-live': 'polite' }, loading());
  let debounce;

  async function load(q = '') {
    try {
      const { users } = await api(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      clear(results).append(users.length ? table(users) : emptyState(t('admin.empty')));
    } catch (err) {
      clear(results).append(emptyState(errorMessage(err)));
    }
  }

  function table(users) {
    return h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
      h('thead', null, h('tr', null,
        h('th', { scope: 'col' }, t('admin.col_name')),
        h('th', { scope: 'col' }, t('admin.col_role')),
        h('th', { scope: 'col' }, t('admin.col_joined')))),
      h('tbody', null, users.map((u) => {
        const self = u.id === state.user.id;
        const select = h('select', {
          'aria-label': `${t('admin.col_role')}: ${u.name}`,
          disabled: self,
          onchange: async (e) => {
            const role = e.target.value;
            try {
              await api(`/admin/users/${u.id}/role`, { method: 'PUT', body: { role } });
              u.role = role;
              toast(t('admin.role_changed', { name: u.name, role: t(`role.${role}`) }));
            } catch (err) {
              e.target.value = u.role;
              toast(errorMessage(err), 'error');
            }
          },
        }, ROLES.map((r) => h('option', { value: r, selected: r === u.role }, t(`role.${r}`))));
        return h('tr', null,
          h('td', null, u.name, h('span', { class: 'cell-sub' }, u.email)),
          h('td', null, select),
          h('td', null, formatDate(u.created_at)));
      }))));
  }

  load();
  return h('section', null,
    h('h1', null, t('admin.title')),
    h('div', { class: 'filters' },
      h('div', { class: 'filter-row' },
        h('input', {
          type: 'search', placeholder: t('admin.search'), 'aria-label': t('admin.search'),
          oninput: (e) => { clearTimeout(debounce); debounce = setTimeout(() => load(e.target.value.trim()), 250); },
        }))),
    results,
  );
}
