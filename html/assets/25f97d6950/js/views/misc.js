import { t, errorMessage } from '../i18n.js';
import { h } from '../ui.js';

const page = (title, text, withHome = true) => h('section', { class: 'narrow message-page' },
  h('h1', null, title),
  h('p', { class: 'lead' }, text),
  withHome ? h('p', null, h('a', { href: '/', class: 'btn btn-secondary' }, t('notfound.home'))) : null,
);

export const notFoundView = () => page(t('notfound.title'), t('notfound.text'));
export const forbiddenView = () => page(t('forbidden.title'), t('forbidden.text'));
export const errorPageView = ({ error }) => page(t('error.title'), errorMessage(error));
