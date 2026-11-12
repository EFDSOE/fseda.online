import { api } from '../api.js';
import { t, LANGUAGES, LANGUAGE_NAMES, errorMessage, getLanguage } from '../i18n.js';
import { h, clear, field, handleForm, toast, emptyState } from '../ui.js';
import { renderMarkdown } from '../markdown.js';
import { navigate } from '../app.js';

const LEVELS = ['beginner', 'intermediate', 'advanced'];

export async function teachListView() {
  const { courses } = await api('/teach/courses');

  const table = h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
    h('thead', null, h('tr', null,
      h('th', { scope: 'col' }, t('teach.col_title')),
      h('th', { scope: 'col' }, t('teach.col_status')),
      h('th', { scope: 'col', class: 'num' }, t('teach.col_lessons')),
      h('th', { scope: 'col', class: 'num' }, t('teach.col_students')),
      h('th', { scope: 'col' }, h('span', { class: 'visually-hidden' }, t('teach.col_actions'))))),
    h('tbody', null, courses.map((c) => h('tr', null,
      h('td', null, h('a', { href: `/teach/${c.id}` }, c.title),
        h('span', { class: 'cell-sub' }, LANGUAGE_NAMES[c.language], c.instructor ? ` – ${c.instructor}` : '')),
      h('td', null, h('span', { class: c.published ? 'status status-live' : 'status' }, c.published ? t('teach.published') : t('teach.draft'))),
      h('td', { class: 'num' }, c.lesson_count),
      h('td', { class: 'num' }, c.student_count),
      h('td', { class: 'cell-actions' }, h('a', { href: `/courses/${encodeURIComponent(c.slug)}` }, t('teach.view'))))))));

  return h('section', null,
    h('div', { class: 'page-head' },
      h('h1', null, t('teach.title')),
      h('a', { href: '/teach/new', class: 'btn btn-primary' }, t('teach.new_course'))),
    courses.length ? table : emptyState(t('teach.empty'), h('a', { href: '/teach/new', class: 'btn btn-primary' }, t('teach.new_course'))),
  );
}

export async function courseEditorView({ params }) {
  const isNew = !params.courseId;
  const data = isNew ? null : await api(`/teach/courses/${params.courseId}`);
  const course = data?.course ?? { title: '', summary: '', description: '', language: getLanguage(), level: 'beginner', published: false };
  const lessons = data?.lessons ?? [];

  const form = h('form', { class: 'form form-wide' },
    field({ label: t('editor.title'), name: 'title', value: course.title, required: true, maxlength: 140 }),
    isNew ? null : field({ label: t('editor.slug'), name: 'slug', value: course.slug, required: true, maxlength: 60, hint: t('editor.slug_hint'), attrs: { pattern: '[a-z0-9]+(-[a-z0-9]+)*' } }),
    field({ label: t('editor.summary'), name: 'summary', type: 'textarea', rows: 2, value: course.summary, maxlength: 280, hint: t('editor.summary_hint') }),
    field({ label: t('editor.description'), name: 'description', type: 'textarea', rows: 8, value: course.description, hint: t('editor.markdown_hint') }),
    h('div', { class: 'field-row' },
      field({ label: t('editor.language'), name: 'language', type: 'select', value: course.language, options: LANGUAGES.map((c) => ({ value: c, label: LANGUAGE_NAMES[c] })) }),
      field({ label: t('editor.level'), name: 'level', type: 'select', value: course.level, options: LEVELS.map((l) => ({ value: l, label: t(`level.${l}`) })) })),
    field({ label: t('editor.published'), name: 'published', type: 'checkbox', value: course.published }),
    h('div', { class: 'actions' },
      h('button', { type: 'submit', class: 'btn btn-primary' }, isNew ? t('editor.create') : t('editor.save')),
      isNew ? null : h('a', { href: `/courses/${encodeURIComponent(course.slug)}`, class: 'btn btn-secondary' }, t('teach.view'))));

  handleForm(form, async (values) => {
    if (isNew) {
      const { course: created } = await api('/teach/courses', { method: 'POST', body: values });
      toast(t('editor.created'));
      navigate(`/teach/${created.id}`, { replace: true });
    } else {
      const { course: saved } = await api(`/teach/courses/${course.id}`, { method: 'PUT', body: values });
      course.slug = saved.slug;
      toast(t('editor.saved'));
    }
  });

  if (isNew) {
    return h('section', null,
      h('p', null, h('a', { href: '/teach' }, t('editor.back'))),
      h('h1', null, t('editor.new_title')),
      form);
  }

  const lessonList = h('div');
  function paintLessons(items) {
    clear(lessonList).append(items.length
      ? h('ol', { class: 'lesson-admin' }, items.map((l, i) => h('li', null,
        h('span', { class: 'lesson-admin-title' }, h('a', { href: `/teach/${course.id}/lessons/${l.id}` }, l.title),
          l.duration_min ? h('span', { class: 'cell-sub' }, t('course.minutes', { n: l.duration_min })) : null),
        h('span', { class: 'lesson-admin-actions' },
          h('button', { type: 'button', class: 'btn btn-icon', disabled: i === 0, 'aria-label': `${t('editor.move_up')}: ${l.title}`, title: t('editor.move_up'), onclick: () => move(l.id, 'up') }, '↑'),
          h('button', { type: 'button', class: 'btn btn-icon', disabled: i === items.length - 1, 'aria-label': `${t('editor.move_down')}: ${l.title}`, title: t('editor.move_down'), onclick: () => move(l.id, 'down') }, '↓')))))
      : h('p', { class: 'muted' }, t('editor.no_lessons')));
  }
  async function move(id, direction) {
    try {
      paintLessons((await api(`/teach/lessons/${id}/move`, { method: 'POST', body: { direction } })).lessons);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }
  paintLessons(lessons);

  async function remove() {
    if (!window.confirm(t('editor.delete_confirm'))) return;
    try {
      await api(`/teach/courses/${course.id}`, { method: 'DELETE' });
      toast(t('editor.deleted'));
      navigate('/teach');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return h('section', null,
    h('p', null, h('a', { href: '/teach' }, t('editor.back'))),
    h('h1', null, t('editor.edit_title')),
    h('p', { class: 'muted' }, t('editor.students', { n: course.student_count ?? 0 })),
    h('div', { class: 'editor-layout' },
      form,
      h('section', { class: 'editor-lessons', 'aria-labelledby': 'lessons-title' },
        h('div', { class: 'section-head' },
          h('h2', { id: 'lessons-title' }, t('editor.lessons')),
          h('a', { href: `/teach/${course.id}/lessons/new`, class: 'btn btn-secondary btn-small' }, t('editor.add_lesson'))),
        lessonList)),
    h('section', { class: 'danger-zone' },
      h('h2', null, t('editor.delete')),
      h('p', { class: 'muted' }, t('editor.delete_hint')),
      h('button', { type: 'button', class: 'btn btn-danger', onclick: remove }, t('editor.delete'))),
  );
}

export async function lessonEditorView({ params }) {
  const isNew = !params.lessonId;
  let lesson = { title: '', content: '', duration_min: 0 };
  let course;
  if (isNew) {
    course = (await api(`/teach/courses/${params.courseId}`)).course;
  } else {
    const data = await api(`/teach/lessons/${params.lessonId}`);
    lesson = data.lesson;
    course = data.course;
    if (String(course.id) !== params.courseId) {
      navigate(`/teach/${course.id}/lessons/${lesson.id}`, { replace: true });
      return h('div');
    }
  }

  const contentField = field({ label: t('lessoned.content'), name: 'content', type: 'textarea', rows: 18, value: lesson.content, hint: t('editor.markdown_hint') });
  const textarea = contentField.querySelector('textarea');
  const preview = h('div', { class: 'prose preview', hidden: true });
  const previewToggle = h('button', {
    type: 'button', class: 'btn btn-secondary btn-small', 'aria-pressed': 'false',
    onclick: () => {
      const showing = preview.hidden;
      preview.hidden = !showing;
      textarea.hidden = showing;
      previewToggle.setAttribute('aria-pressed', String(showing));
      previewToggle.textContent = showing ? t('lessoned.write') : t('lessoned.preview');
      if (showing) {
        preview.innerHTML = textarea.value.trim() ? renderMarkdown(textarea.value) : ''; // safe: escapes input
        if (!textarea.value.trim()) preview.append(h('p', { class: 'muted' }, t('lessoned.empty_preview')));
      }
    },
  }, t('lessoned.preview'));
  contentField.insertBefore(previewToggle, textarea);
  contentField.insertBefore(preview, textarea.nextSibling);

  const form = h('form', { class: 'form form-wide' },
    field({ label: t('lessoned.title'), name: 'title', value: lesson.title, required: true, maxlength: 140 }),
    field({ label: t('lessoned.duration'), name: 'duration_min', type: 'number', value: String(lesson.duration_min ?? 0), attrs: { min: 0, max: 1000, step: 1, inputmode: 'numeric' } }),
    contentField,
    h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'btn btn-primary' }, isNew ? t('lessoned.create') : t('lessoned.save'))));

  handleForm(form, async (values) => {
    const body = { ...values, duration_min: Number(values.duration_min) || 0 };
    if (isNew) {
      const { lesson: created } = await api(`/teach/courses/${course.id}/lessons`, { method: 'POST', body });
      toast(t('lessoned.created'));
      navigate(`/teach/${course.id}/lessons/${created.id}`, { replace: true });
    } else {
      await api(`/teach/lessons/${lesson.id}`, { method: 'PUT', body });
      toast(t('lessoned.saved'));
    }
  });

  async function remove() {
    if (!window.confirm(t('lessoned.delete_confirm'))) return;
    try {
      await api(`/teach/lessons/${lesson.id}`, { method: 'DELETE' });
      toast(t('lessoned.deleted'));
      navigate(`/teach/${course.id}`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return h('section', null,
    h('p', null, h('a', { href: `/teach/${course.id}` }, t('lessoned.back', { course: course.title }))),
    h('h1', null, isNew ? t('lessoned.new_title') : t('lessoned.edit_title')),
    form,
    isNew ? null : h('section', { class: 'danger-zone' },
      h('h2', null, t('lessoned.delete')),
      h('button', { type: 'button', class: 'btn btn-danger', onclick: remove }, t('lessoned.delete'))),
  );
}
