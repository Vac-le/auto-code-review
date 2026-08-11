const api = window.autoCodeReviewDesktop;
const recent = document.querySelector('[data-recent]');
const nameOf = (path) => path.split(/[\\/]/).filter(Boolean).pop() || path;

async function render() {
  const state = await api.getState();
  document.querySelector('[data-version]').textContent = `v${state.version}`;
  recent.replaceChildren();
  if (!state.recentRepositories.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = '还没有打开过仓库。';
    recent.append(empty);
    return;
  }
  for (const path of state.recentRepositories) {
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
    recent.append(button);
  }
}

document.querySelector('[data-select]').addEventListener('click', () => api.selectRepository());
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
