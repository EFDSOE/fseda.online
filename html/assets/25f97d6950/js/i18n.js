export const LANGUAGES = ['de', 'en', 'fr', 'es', 'pt'];

// Language names are always shown in their own language, so people can find theirs.
export const LANGUAGE_NAMES = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
};

const STORAGE_KEY = 'fseda.lang';
let current = 'de';
let strings = {};
let fallback = {};
const listeners = new Set();

function readStored() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function writeStored(lang) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* private mode */ }
}

export function detectLanguage(userLocale) {
  const stored = readStored();
  if (LANGUAGES.includes(stored)) return stored;
  if (LANGUAGES.includes(userLocale)) return userLocale;
  for (const tag of navigator.languages || [navigator.language]) {
    const base = String(tag).slice(0, 2).toLowerCase();
    if (LANGUAGES.includes(base)) return base;
  }
  return 'de';
}

async function load(lang) {
  return (await import(`./locales/${lang}.js`)).default;
}

export async function setLanguage(lang, { persist = true } = {}) {
  if (!LANGUAGES.includes(lang)) lang = 'de';
  const [next, base] = await Promise.all([load(lang), lang === 'en' ? null : load('en')]);
  strings = next;
  fallback = base || next;
  current = lang;
  document.documentElement.lang = lang;
  if (persist) writeStored(lang);
  listeners.forEach((fn) => fn(lang));
}

export const getLanguage = () => current;
export const onLanguageChange = (fn) => listeners.add(fn);

// t('course.lessons', { n: 3 }) — values may be { one, other } for plurals.
export function t(key, vars = {}) {
  let value = strings[key] ?? fallback[key] ?? key;
  if (typeof value === 'object') {
    const rule = new Intl.PluralRules(current).select(Number(vars.n ?? 0));
    value = value[rule] ?? value.other;
  }
  return value.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

export function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(current, { dateStyle: 'medium' }).format(date);
}

export function errorMessage(err) {
  const code = err?.code || 'unknown';
  const key = `errors.${code}`;
  const text = t(key);
  return text === key ? t('errors.unknown') : text;
}
