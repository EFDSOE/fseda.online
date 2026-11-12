import { t, errorMessage, LANGUAGE_NAMES } from './i18n.js';

// h('a', { href: '/x', class: 'btn' }, 'Text', child) — strings become text nodes,
// so user content is never parsed as HTML.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      el.className = value;
    } else if (key === 'style') {
      el.style.cssText = value; // CSSOM, allowed under a strict Content-Security-Policy
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key === 'value' && 'value' in el) {
      el.value = value;
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}

// ----- toasts -----

let toastRegion;
export function toast(message, kind = 'ok') {
  toastRegion ??= document.getElementById('toasts');
  const el = h('div', { class: `toast toast-${kind}`, role: kind === 'error' ? 'alert' : 'status' }, message);
  toastRegion.append(el);
  setTimeout(() => {
    el.classList.add('toast-leaving');
    setTimeout(() => el.remove(), 300);
  }, kind === 'error' ? 6000 : 3500);
}

// ----- shared building blocks -----

export function progressBar(done, total) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return h('div', { class: 'progress' },
    h('div', {
      class: 'progress-track', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total,
      'aria-valuenow': done, 'aria-label': t('course.progress', { done, total }),
    }, h('span', { class: 'progress-fill', style: `width:${pct}%` })),
    h('p', { class: 'progress-label' }, t('course.progress', { done, total })),
  );
}

export function courseMeta(course) {
  const parts = [
    h('span', { class: 'tag', lang: course.language }, LANGUAGE_NAMES[course.language] || course.language),
    h('span', null, t(`level.${course.level}`)),
    h('span', null, t('course.lessons', { n: course.lesson_count ?? 0 })),
  ];
  if (course.total_minutes) parts.push(h('span', null, t('course.minutes', { n: course.total_minutes })));
  return h('p', { class: 'meta' }, parts);
}

export function courseList(courses) {
  return h('ul', { class: 'course-list' }, courses.map((c) =>
    h('li', { class: 'course-row' },
      h('div', { class: 'course-row-main' },
        h('h3', null, h('a', { href: `/courses/${encodeURIComponent(c.slug)}` }, c.title)),
        c.summary ? h('p', { class: 'course-summary' }, c.summary) : null,
      ),
      courseMeta(c),
    )));
}

export function field({ label, name, type = 'text', value = '', hint, required, autocomplete, maxlength, minlength, rows, options, attrs = {} }) {
  const id = `f-${name}-${Math.random().toString(36).slice(2, 7)}`;
  const hintId = hint ? `${id}-hint` : undefined;
  let control;
  if (type === 'textarea') {
    control = h('textarea', { id, name, rows: rows || 8, required, maxlength, 'aria-describedby': hintId, ...attrs });
    control.value = value;
  } else if (type === 'select') {
    control = h('select', { id, name, required, 'aria-describedby': hintId, ...attrs },
      options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label)));
  } else if (type === 'checkbox') {
    return h('div', { class: 'field field-check' },
      h('input', { id, name, type: 'checkbox', checked: !!value, ...attrs }),
      h('label', { for: id }, label));
  } else {
    control = h('input', { id, name, type, value, required, autocomplete, maxlength, minlength, 'aria-describedby': hintId, ...attrs });
  }
  return h('div', { class: 'field' },
    h('label', { for: id }, label),
    control,
    hint ? h('p', { class: 'hint', id: hintId }, hint) : null,
  );
}

// Wire a form: collects values, shows a busy state, maps API errors to fields.
export function handleForm(form, submit) {
  const errorBox = h('p', { class: 'form-error', role: 'alert', hidden: true });
  form.prepend(errorBox);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    const values = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      values[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    }
    const button = form.querySelector('button[type=submit]');
    if (button) button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    try {
      await submit(values);
    } catch (err) {
      errorBox.textContent = errorMessage(err);
      errorBox.hidden = false;
      const target = err.field && form.elements.namedItem(err.field);
      if (target) {
        target.setAttribute('aria-invalid', 'true');
        target.focus();
      }
    } finally {
      if (button) button.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
  return form;
}

// Notice mechanism for illegal content (Digital Services Act, Art. 16): a prefilled e-mail.
export function reportLink(contactEmail) {
  const subject = t('report.subject');
  const body = t('report.body', { url: location.href });
  const href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return h('p', { class: 'report' }, h('a', { href }, t('report.link')));
}

export function emptyState(text, action) {
  return h('div', { class: 'empty' }, h('p', null, text), action || null);
}

export function loading() {
  return h('p', { class: 'loading', role: 'status' }, t('common.loading'));
}

export function errorView(err) {
  return h('div', { class: 'empty' }, h('p', null, errorMessage(err)));
}
