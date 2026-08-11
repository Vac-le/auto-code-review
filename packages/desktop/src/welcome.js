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
document.querySelector('[data-logs]').addEventListener('click', () => api.openLogs());
document.querySelector('[data-quit]').addEventListener('click', () => api.quit());
render();
