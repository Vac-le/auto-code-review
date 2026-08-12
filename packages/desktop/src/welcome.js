const api = window.autoCodeReviewDesktop;
const recent = document.querySelector('[data-recent]');
const search = document.querySelector('[data-project-search]');
const nameOf = (path) => path.split(/[\\/]/).filter(Boolean).pop() || path;
let desktopState = null;

async function render() {
  desktopState = await api.getState();
  renderProjects();
}

function renderProjects() {
  const state = desktopState;
  if (!state) return;
  document.querySelector('[data-version]').textContent = `v${state.version}`;
  recent.replaceChildren();
  const query = search.value.trim().toLocaleLowerCase('zh-CN');
  const repositories = [...state.recentRepositories]
    .sort((left, right) => Number(state.favoriteRepositories.includes(right)) - Number(state.favoriteRepositories.includes(left)))
    .filter((path) => !query || path.toLocaleLowerCase('zh-CN').includes(query));
  if (!repositories.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = query ? '没有匹配的项目。' : '还没有打开过仓库。';
    recent.append(empty);
    return;
  }
  for (const path of repositories) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recent-item';
    const strong = document.createElement('strong');
    strong.textContent = nameOf(path);
    const detail = document.createElement('span');
    detail.className = 'path';
    detail.textContent = path;
    const arrow = document.createElement('span');
    arrow.className = 'recent-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    button.append(strong, detail, arrow);
    button.addEventListener('click', () => api.openRecentRepository(path));
    const favorite = document.createElement('button');
    favorite.type = 'button';
    favorite.className = 'favorite';
    favorite.title = state.favoriteRepositories.includes(path) ? '取消收藏' : '收藏项目';
    favorite.setAttribute('aria-label', favorite.title);
    favorite.setAttribute('aria-pressed', String(state.favoriteRepositories.includes(path)));
    favorite.textContent = state.favoriteRepositories.includes(path) ? '★' : '☆';
    favorite.addEventListener('click', async () => { desktopState = await api.toggleFavorite(path); renderProjects(); });
    const row = document.createElement('div');
    row.className = 'recent-row';
    row.append(button, favorite);
    recent.append(row);
  }
}

document.querySelector('[data-select]').addEventListener('click', () => api.selectRepository());
search.addEventListener('input', renderProjects);
function closeLogViewer() {
  const viewer = document.querySelector('[data-log-viewer]');
  if (viewer.hidden) return;
  viewer.hidden = true;
  document.body.classList.remove('log-viewer-open');
  document.querySelector('.app-frame').inert = false;
  document.querySelector('[data-logs]').focus();
}

async function refreshLogViewer() {
  const content = document.querySelector('[data-log-content]');
  const meta = document.querySelector('[data-log-meta]');
  const refresh = document.querySelector('[data-log-refresh]');
  content.textContent = '正在读取日志…';
  refresh.disabled = true;
  try {
    const snapshot = await api.getLogs();
    content.textContent = snapshot.content || '暂无运行日志。';
    meta.textContent = snapshot.updatedAt
      ? `${snapshot.fileName} · ${new Date(snapshot.updatedAt).toLocaleString('zh-CN')}`
      : '查看桌面端运行与审查事件';
    content.scrollTop = content.scrollHeight;
  } catch (error) {
    content.textContent = error instanceof Error ? error.message : '无法读取日志。';
  } finally {
    refresh.disabled = false;
  }
}

function showLogViewer() {
  const viewer = document.querySelector('[data-log-viewer]');
  viewer.hidden = false;
  document.body.classList.add('log-viewer-open');
  document.querySelector('.app-frame').inert = true;
  document.querySelector('.log-viewer-close').focus();
  refreshLogViewer();
}

document.querySelector('[data-logs]').addEventListener('click', showLogViewer);
document.querySelectorAll('[data-log-close]').forEach((button) => button.addEventListener('click', closeLogViewer));
document.querySelector('[data-log-refresh]').addEventListener('click', refreshLogViewer);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeLogViewer(); });
api.onShowLogs?.(showLogViewer);
document.querySelector('[data-quit]').addEventListener('click', () => api.quit());
render();
