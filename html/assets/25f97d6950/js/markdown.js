// Small, safe Markdown subset for course and lesson content.
// All text is HTML-escaped first; only the tags generated here can appear.
// Supported: # ## ### headings, paragraphs, - and 1. lists, > quotes, ``` code blocks,
// **bold**, *italic*, `code`, [links](https://…) and --- rules.

const escapeHtml = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function inline(escaped) {
  const codes = [];
  let out = escaped.replace(/`([^`]+)`/g, (m, code) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });
  out = out
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g, (m, label, href) => {
      const external = !/^\/(?!\/)/.test(href);
      return `<a href="${href}"${external ? ' rel="noopener noreferrer" target="_blank"' : ''}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return out.replace(/\u0000(\d+)\u0000/g, (m, i) => `<code>${codes[Number(i)]}</code>`);
}

export function renderMarkdown(source = '') {
  const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  let para = [];
  let list = null; // { type: 'ul'|'ol', items: [] }
  let quote = [];

  const flushPara = () => {
    if (para.length) html.push(`<p>${inline(escapeHtml(para.join(' ')))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) html.push(`<${list.type}>${list.items.map((i) => `<li>${inline(escapeHtml(i))}</li>`).join('')}</${list.type}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) html.push(`<blockquote><p>${inline(escapeHtml(quote.join(' ')))}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^```/.test(line.trim())) {
      flushAll();
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) code.push(lines[i++]);
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushAll();
      // Lesson titles are the page's h1, so content headings start at h2.
      const level = heading[1].length + 1;
      html.push(`<h${level}>${inline(escapeHtml(heading[2].trim()))}</h${level}>`);
      continue;
    }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushAll();
      html.push('<hr>');
      continue;
    }

    const ul = /^\s*[-*]\s+(.+)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (ul || ol) {
      flushPara(); flushQuote();
      const type = ul ? 'ul' : 'ol';
      if (list && list.type !== type) flushList();
      list ??= { type, items: [] };
      list.items.push((ul || ol)[1]);
      continue;
    }

    const q = /^>\s?(.*)$/.exec(line);
    if (q) {
      flushPara(); flushList();
      quote.push(q[1]);
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    flushList(); flushQuote();
    para.push(line.trim());
  }
  flushAll();
  return html.join('\n');
}
