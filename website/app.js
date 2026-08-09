const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = [...document.querySelectorAll('[role="tabpanel"]')];
const toast = document.querySelector('[data-toast]');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function selectPlatform(tab) {
  tabs.forEach((candidate) => {
    const selected = candidate === tab;
    candidate.setAttribute('aria-selected', String(selected));
    candidate.tabIndex = selected ? 0 : -1;
  });
  panels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== tab.dataset.platform;
  });
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectPlatform(tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const target = tabs[(index + offset + tabs.length) % tabs.length];
    selectPlatform(target);
    target.focus();
  });
});

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const command = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = command;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    button.textContent = 'Copied';
    showToast('Command copied');
    setTimeout(() => { button.textContent = 'Copy'; }, 1600);
  });
});

document.querySelector('[data-scroll-demo]').addEventListener('click', () => {
  document.querySelector('#demo').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

const runButton = document.querySelector('[data-run-review]');
const result = document.querySelector('[data-demo-result]');
const steps = [...document.querySelectorAll('.pipeline-step')];
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

runButton.addEventListener('click', async () => {
  runButton.disabled = true;
  runButton.textContent = 'Reviewing…';
  result.innerHTML = '<div class="empty-result"><span aria-hidden="true">···</span><p>Collecting bounded context…</p></div>';
  steps.forEach((step) => step.classList.remove('active', 'done'));

  for (const step of steps) {
    step.classList.add('active');
    await wait(260);
    step.classList.remove('active');
    step.classList.add('done');
  }

  const scope = document.querySelector('#scope').selectedOptions[0].textContent;
  result.innerHTML = `
    <article class="demo-finding" data-testid="demo-finding">
      <div class="result-top"><span class="priority">P1</span><h3>Retry can create a duplicate charge</h3><span class="confidence">94%</span></div>
      <p>A gateway timeout after the first request commits reaches a retry that does not reuse the original idempotency key.</p>
      <div class="evidence-grid">
        <div><span>Scope</span><strong>${scope}</strong></div>
        <div><span>Location</span><strong>src/checkout.ts:40</strong></div>
        <div><span>Observable impact</span><strong>The customer is charged twice</strong></div>
        <div><span>Repair direction</span><strong>Reuse one logical payment key</strong></div>
      </div>
      <div class="filtered-note">✓ 4 speculative or duplicate candidates filtered</div>
    </article>`;
  runButton.disabled = false;
  runButton.textContent = 'Run again';
});
