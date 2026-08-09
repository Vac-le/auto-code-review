const ui = {
  zh: {
    description: 'Auto Code Review 安装、使用范围、报告说明和常见问题。',
    titleText: '使用文档 — Auto Code Review', skip: '跳到文档正文', navigation: '文档导航', home: '返回 Auto Code Review 首页', language: '文档语言', backHome: '返回首页', navHome: '首页', navDocs: '使用文档', navBenchmark: '质量基准', navInstall: '安装', contents: '文档目录', markdownSource: '查看 Markdown 源文件 ↗', eyebrow: '产品指南', title: 'Auto Code Review 使用文档', intro: '从安装到第一次真实代码审查，按步骤即可完成。', loading: '正在载入文档…', loadError: '文档载入失败，请打开 Markdown 源文件。'
  },
  en: {
    description: 'Installation, review scopes, report format, and troubleshooting for Auto Code Review.',
    titleText: 'Documentation — Auto Code Review', skip: 'Skip to documentation', navigation: 'Documentation navigation', home: 'Back to Auto Code Review home', language: 'Documentation language', backHome: 'Back home', navHome: 'Home', navDocs: 'Docs', navBenchmark: 'Benchmark', navInstall: 'Install', contents: 'On this page', markdownSource: 'View Markdown source ↗', eyebrow: 'Product guide', title: 'Auto Code Review documentation', intro: 'Follow these steps from installation to your first real code review.', loading: 'Loading documentation…', loadError: 'The guide could not be loaded. Open the Markdown source instead.'
  }
};

let language = 'zh';
try { language = localStorage.getItem('auto-code-review-language') === 'en' ? 'en' : 'zh'; } catch {}

const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+|\.\.?\/[^\s)]+|#[^\s)]+)\)/g, (_match, label, href) => {
      const external = href.startsWith('https://');
      return `<a href="${href}"${external ? ' target="_blank" rel="noreferrer"' : ''}>${label}</a>`;
    });
}

function renderMarkdown(markdown) {
  const html = [];
  const headings = [];
  let code = false;
  let codeLines = [];
  let list = null;
  let headingIndex = 0;
  const closeList = () => {
    if (list) html.push(`</${list}>`);
    list = null;
  };

  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      closeList();
      if (code) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
      }
      code = !code;
      continue;
    }
    if (code) {
      codeLines.push(line);
      continue;
    }
    if (!line.trim()) {
      closeList();
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      closeList();
      html.push('<hr />');
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      headingIndex += 1;
      const level = heading[1].length;
      const id = `section-${headingIndex}`;
      html.push(`<h${level} id="${id}">${inlineMarkdown(heading[2])}</h${level}>`);
      if (level === 2 || level === 3) headings.push({ id, label: heading[2], level });
      continue;
    }
    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      const nextList = unordered ? 'ul' : 'ol';
      if (list !== nextList) {
        closeList();
        list = nextList;
        html.push(`<${list}>`);
      }
      html.push(`<li>${inlineMarkdown((unordered || ordered)[1])}</li>`);
      continue;
    }
    closeList();
    if (line.startsWith('> ')) html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
    else html.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  closeList();
  if (codeLines.length) html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  return { html: html.join('\n'), headings };
}

async function loadGuide() {
  const status = document.querySelector('[data-doc-status]');
  const article = document.querySelector('[data-markdown]');
  const sources = document.querySelectorAll('[data-doc-source]');
  const file = language === 'zh' ? './usage.zh-CN.md' : './usage.en.md';
  sources.forEach((source) => { source.href = file; });
  status.hidden = false;
  status.classList.remove('error');
  status.textContent = ui[language].loading;
  article.hidden = true;
  try {
    const response = await fetch(file);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rendered = renderMarkdown(await response.text());
    article.innerHTML = rendered.html;
    const toc = document.querySelector('[data-doc-toc]');
    toc.replaceChildren(...rendered.headings.map(({ id, label, level }) => {
      const link = document.createElement('a');
      link.href = `#${id}`;
      link.textContent = label;
      if (level === 3) link.style.paddingLeft = '1rem';
      return link;
    }));
    status.hidden = true;
    article.hidden = false;
  } catch {
    status.textContent = ui[language].loadError;
    status.classList.add('error');
  }
}

function applyLanguage(next, persist = true) {
  language = next === 'en' ? 'en' : 'zh';
  const copy = ui[language];
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = copy.titleText;
  document.querySelector('[data-doc-description]').content = copy.description;
  document.querySelectorAll('[data-doc-ui]').forEach((element) => {
    const value = copy[element.dataset.docUi];
    if (value) element.textContent = value;
  });
  document.querySelectorAll('[data-doc-aria]').forEach((element) => {
    const value = copy[element.dataset.docAria];
    if (value) element.setAttribute('aria-label', value);
  });
  document.querySelectorAll('[data-doc-language]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.docLanguage === language));
  });
  if (persist) {
    try { localStorage.setItem('auto-code-review-language', language); } catch {}
  }
  loadGuide();
}

document.querySelectorAll('[data-doc-language]').forEach((button) => {
  button.addEventListener('click', () => applyLanguage(button.dataset.docLanguage));
});

applyLanguage(language, false);
