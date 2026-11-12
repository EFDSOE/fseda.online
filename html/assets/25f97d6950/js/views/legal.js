import { getLanguage, formatDate } from '../i18n.js';
import { h } from '../ui.js';
import { legalPage } from '../legal/content.js';
import { SITE } from '../site-config.js';

function renderPart(part) {
  return typeof part === 'string' ? part : h('a', { href: part.link }, part.text);
}

function renderItem(item) {
  if (Array.isArray(item)) return h('p', null, item.map(renderPart));
  if (item.lines) return h('p', { class: 'legal-lines' }, item.lines.flatMap((line, i) => (i ? [h('br'), line] : [line])));
  if (item.list) return h('ul', null, item.list.map((li) => h('li', null, li)));
  return null;
}

function view(kind) {
  const page = legalPage(kind, getLanguage());
  const sub = kind === 'privacy' ? page.sub.replace(SITE.privacyUpdated, formatDate(SITE.privacyUpdated)) : page.sub;
  return h('article', { class: 'legal' },
    h('h1', null, page.title),
    h('p', { class: 'muted' }, sub),
    page.note ? h('p', { class: 'legal-note', lang: getLanguage() }, page.note) : null,
    page.sections.map((s) => h('section', null, h('h2', null, s.h), s.body.map(renderItem))),
  );
}

export const impressumView = () => view('impressum');
export const privacyView = () => view('privacy');
