const translations = {
  zh: {
    title: 'Auto Code Review — 一套标准，审查每一次代码变更',
    description: 'Auto Code Review 为 Codex 和 Claude Code 提供基于证据的 AI 代码审查流程。',
    skip: '跳到主要内容', primaryNav: '主导航', home: 'Auto Code Review 首页', language: '语言',
    navWorkflow: '工作原理', navDocs: '使用文档', navBenchmark: '质量基准', navInstall: '安装',
    heroEyebrow: '开源 · 本地优先 · 无需额外 API Key', heroTitle: '一套审查标准。', heroAccent: '覆盖每一次代码变更。',
    heroSubtitle: '安装一次，即可在 Codex 和 Claude Code 中获得一致、可靠的 AI 代码审查。每条问题都附带触发条件、实际影响和准确位置；没有根据的猜测不会进入报告。',
    installCta: '两分钟完成安装', demoCta: '体验在线审查', guarantees: '产品保证', trustReadonly: '默认只读', trustHost: '使用当前平台的模型', trustBenchmark: '公开测试基准',
    findingExample: '代码审查问题示例', verified: '已验证', findingTitle: '重试可能导致同一笔支付被扣款两次', findingBody: '首次扣款成功后仍可能发生超时，而重试没有复用幂等键，因此会创建新的扣款请求。', concreteTrigger: '明确触发条件', changedLine: '变更行 40', secondPass: '二次验证通过',
    metrics: '核心产品指标', metricInstall: '从安装到首次审查', metricConfidence: '最低报告置信度', metricKeys: '额外模型 API Key', metricPublic: '基准案例公开',
    workflowEyebrow: '结论必须有证据', workflowTitle: '每一步都可验证的审查流程', workflowIntro: '由 Codex 或 Claude Code 当前使用的模型分析代码；统一协议限定审查范围并淘汰证据不足的问题。可选 CLI 进一步校验文件和行号。',
    step1Title: '完整读取代码差异', step1Body: '先检查所有变更文件和代码块，再分析细节；自动排除二进制文件、生成文件和敏感信息。', step2Title: '补充必要上下文', step2Body: '只读取判断问题所需的调用方、类型定义、测试和项目规则，避免无边界地扫描仓库。', step3Title: '逐条复核问题', step3Body: '第二轮主动寻找反证，确认触发条件、实际影响、因果关系和准确行号。', step4Title: '输出高置信度结果', step4Body: '最多输出十条按优先级排序的问题，支持 Markdown 或 JSON；没有可靠问题时会明确说明。',
    demoEyebrow: '交互演示', demoTitle: '看看低质量问题如何被淘汰', demoIntro: '这个演示展示插件的四个验证步骤。数据固定，不会读取你的代码。', scopeLabel: '审查范围', scopeWorking: '未提交的变更', scopeStaged: '暂存区变更', scopeBranch: '当前分支与 main 对比', runReview: '开始审查', reviewing: '审查中…', runAgain: '再次运行', pipelineScope: '读取 4 个变更文件', pipelineContext: '补充相关上下文', pipelineVerify: '复核 5 个候选问题', pipelineReport: '输出 1 个确认问题', emptyResult: '点击“开始审查”，查看完整验证过程。', collecting: '正在读取必要的代码上下文…',
    demoFindingTitle: '重试可能造成重复扣款', demoFindingBody: '首次请求提交后如果网关超时，代码会进入重试流程，但没有复用原始幂等键。', scope: '范围', location: '位置', impact: '实际影响', impactValue: '客户被重复扣款', repair: '修复方向', repairValue: '始终复用同一个幂等键', filtered: '✓ 已过滤 4 个推测性或重复问题',
    benchmarkEyebrow: '用数据衡量质量', benchmarkTitle: '结果公开，评分可复现', benchmarkIntro: '仓库公开提供含缺陷与无缺陷的代码改动、标准答案和评分工具。CI 负责验证评分工具；发布模型审查成绩时，必须注明平台、模型版本和测试集版本。', signal: '准确度', signalBody: '将模型发现的问题与人工标注的标准答案进行对比。', trust: '可信度', trustMetric: '无缺陷代码的误报率', trustBody: '无缺陷案例用于衡量模型是否会凭空制造问题。', evidence: '定位能力', evidenceMetric: '文件与行号准确率', evidenceBody: '报告位置不存在或没有对应到本次变更时，验证会失败。',
    installEyebrow: '立即开始', installTitle: '继续使用你熟悉的 AI 编程助手', installIntro: '选择 Codex 或 Claude Code。无需单独配置模型网关，也不会收集使用数据。', installPlatform: '安装平台', codexInstall: '克隆仓库后，只需一条命令即可注册并安装 Codex Skill。', claudeInstall: '克隆仓库后，只需一条命令即可注册并安装带命名空间的 Claude Skill。', localUiTitle: '在浏览器中查看真实审查', localUiBody: '本地 Dashboard 会读取指定 Git 仓库，调用已登录的 Codex 或 Claude Code，并展示经过验证的真实结果。', localUiHint: '把路径替换成需要审查的项目；按 Ctrl+C 即可关闭本地页面。', openDocs: '查看完整使用文档', copy: '复制', copied: '已复制', commandCopied: '命令已复制', thenAsk: '然后输入：', thenRun: '然后运行：', footerTagline: '一套标准，审查每一次代码变更。', footerMeta: 'Apache-2.0 · 本地优先 · 完全开源'
  },
  en: {
    title: 'Auto Code Review — One review standard, every coding agent',
    description: 'Auto Code Review brings one evidence-first review standard to Codex and Claude Code, with an adapter-ready protocol.',
    skip: 'Skip to content', primaryNav: 'Primary navigation', home: 'Auto Code Review home', language: 'Language',
    navWorkflow: 'How it works', navDocs: 'Docs', navBenchmark: 'Benchmark', navInstall: 'Install',
    heroEyebrow: 'Open source · Local-first · No extra API key', heroTitle: 'One review standard.', heroAccent: 'Every coding agent.',
    heroSubtitle: 'Install once and get evidence-first reviews in Codex and Claude Code. Every finding includes a trigger, observable impact, and precise location—speculation stays out.',
    installCta: 'Install in two minutes', demoCta: 'Try the live review', guarantees: 'Product guarantees', trustReadonly: 'Read-only by default', trustHost: 'Uses your current agent', trustBenchmark: 'Public quality benchmark',
    findingExample: 'Example code review finding', verified: 'Verified', findingTitle: 'Retry can charge the same payment twice', findingBody: 'A timeout can occur after the first charge commits. The retry creates a new attempt without reusing an idempotency key.', concreteTrigger: 'Concrete trigger', changedLine: 'Changed line 40', secondPass: 'Second-pass verified',
    metrics: 'Key product metrics', metricInstall: 'install to first review', metricConfidence: 'minimum report confidence', metricKeys: 'additional model API keys', metricPublic: 'benchmark cases public',
    workflowEyebrow: 'Evidence before opinion', workflowTitle: 'A review pipeline you can inspect', workflowIntro: 'The host model reasons about code. A shared protocol controls scope and filters weak output; the optional CLI adds deterministic location validation.',
    step1Title: 'Map the complete diff', step1Body: 'Enumerate changed files and hunks before analyzing details. Skip binaries, generated output, and secrets.', step2Title: 'Build bounded context', step2Body: 'Follow only the callers, types, tests, and project rules needed to prove or disprove a candidate.', step3Title: 'Challenge every finding', step3Body: 'A second pass checks the trigger, impact, causality, line range, and possible counter-evidence.', step4Title: 'Report the signal', step4Body: 'Return at most ten prioritized findings in Markdown or JSON. Clean changes get a clean result.',
    demoEyebrow: 'Interactive example', demoTitle: 'Watch weak candidates get filtered', demoIntro: 'This deterministic demo mirrors the verification stages used by the plugin.', scopeLabel: 'Review scope', scopeWorking: 'Uncommitted changes', scopeStaged: 'Staged changes', scopeBranch: 'Branch against main', runReview: 'Run review', reviewing: 'Reviewing…', runAgain: 'Run again', pipelineScope: 'Map 4 changed files', pipelineContext: 'Inspect relevant context', pipelineVerify: 'Verify 5 candidates', pipelineReport: 'Keep 1 verified finding', emptyResult: 'Run the review to see the verification trace.', collecting: 'Collecting bounded context…',
    demoFindingTitle: 'Retry can create a duplicate charge', demoFindingBody: 'A gateway timeout after the first request commits reaches a retry that does not reuse the original idempotency key.', scope: 'Scope', location: 'Location', impact: 'Observable impact', impactValue: 'The customer is charged twice', repair: 'Repair direction', repairValue: 'Reuse one logical payment key', filtered: '✓ 4 speculative or duplicate candidates filtered',
    benchmarkEyebrow: 'Quality is measured', benchmarkTitle: 'No private victory lap', benchmarkIntro: 'Buggy and clean patches, expected findings, and the scoring harness live in the repository. CI verifies the scorer; named host/model runs are required before publishing behavioral score claims.', signal: 'Signal', signalBody: 'Match reported root causes against human-labeled expected findings.', trust: 'Trust', trustMetric: 'False positives on clean diffs', trustBody: 'Clean cases prevent the prompt from learning to invent problems everywhere.', evidence: 'Evidence', evidenceMetric: 'File and line accuracy', evidenceBody: 'Reports fail validation when locations do not exist or miss the reviewed change.',
    installEyebrow: 'Start locally', installTitle: 'Use the agent you already trust', installIntro: 'Choose a platform. The default workflow adds no model gateway and sends no telemetry.', installPlatform: 'Installation platform', codexInstall: 'From the cloned repository, register it and install the Codex skill in one command.', claudeInstall: 'From the cloned repository, register it and install the namespaced skill in one command.', localUiTitle: 'See a real review in your browser', localUiBody: 'The local dashboard reads the selected Git repository, calls your signed-in Codex or Claude Code, and displays the validated result.', localUiHint: 'Replace the path with the project to review. Press Ctrl+C to stop the local page.', openDocs: 'Read the complete guide', copy: 'Copy', copied: 'Copied', commandCopied: 'Command copied', thenAsk: 'Then ask:', thenRun: 'Then run:', footerTagline: 'One review standard, every coding agent.', footerMeta: 'Apache-2.0 · Local-first · Built in the open'
  }
};

let currentLanguage = 'zh';
try { currentLanguage = localStorage.getItem('auto-code-review-language') === 'en' ? 'en' : 'zh'; } catch {}
const t = (key) => translations[currentLanguage][key];

function setLanguage(language, persist = true) {
  currentLanguage = language === 'en' ? 'en' : 'zh';
  document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const value = t(element.dataset.i18n);
    if (value) element.textContent = value;
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    const value = t(element.dataset.i18nAriaLabel);
    if (value) element.setAttribute('aria-label', value);
  });
  document.querySelectorAll('[data-i18n-content]').forEach((element) => {
    const value = t(element.dataset.i18nContent);
    if (value) element.setAttribute('content', value);
  });
  document.querySelectorAll('[data-language]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.language === currentLanguage));
  });
  if (persist) {
    try { localStorage.setItem('auto-code-review-language', currentLanguage); } catch {}
  }
  if (document.querySelector('[data-testid="demo-finding"]')) renderFinding();
}

document.querySelectorAll('[data-language]').forEach((button) => {
  button.addEventListener('click', () => setLanguage(button.dataset.language));
});

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

setLanguage(currentLanguage, false);

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
    button.textContent = t('copied');
    showToast(t('commandCopied'));
    setTimeout(() => { button.textContent = t('copy'); }, 1600);
  });
});

document.querySelector('[data-scroll-demo]').addEventListener('click', () => {
  document.querySelector('#demo').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

const scopePicker = document.querySelector('[data-scope-picker]');
const scopeTrigger = document.querySelector('[data-scope-trigger]');
const scopeMenu = document.querySelector('[data-scope-menu]');
const scopeValue = document.querySelector('[data-scope-value]');
const scopeOptions = [...document.querySelectorAll('[data-scope-option]')];

function setScopeMenu(open) {
  scopeMenu.hidden = !open;
  scopeTrigger.setAttribute('aria-expanded', String(open));
  scopePicker.classList.toggle('open', open);
}

function chooseScope(option) {
  scopeOptions.forEach((candidate) => candidate.setAttribute('aria-selected', String(candidate === option)));
  scopeValue.dataset.i18n = option.dataset.i18n;
  scopeValue.dataset.value = option.dataset.scopeOption;
  scopeValue.textContent = option.textContent;
  setScopeMenu(false);
  scopeTrigger.focus();
}

scopeTrigger.addEventListener('click', () => setScopeMenu(scopeMenu.hidden));
scopeTrigger.addEventListener('keydown', (event) => {
  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  event.preventDefault();
  setScopeMenu(true);
  const selected = scopeOptions.find((option) => option.getAttribute('aria-selected') === 'true');
  (event.key === 'ArrowDown' ? selected : scopeOptions.at(-1)).focus();
});
scopeOptions.forEach((option, index) => {
  option.addEventListener('click', () => chooseScope(option));
  option.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setScopeMenu(false);
      scopeTrigger.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? scopeOptions.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + scopeOptions.length) % scopeOptions.length;
    scopeOptions[nextIndex].focus();
  });
});
document.addEventListener('click', (event) => {
  if (!scopePicker.contains(event.target)) setScopeMenu(false);
});

const runButton = document.querySelector('[data-run-review]');
const result = document.querySelector('[data-demo-result]');
const steps = [...document.querySelectorAll('.pipeline-step')];
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function renderFinding() {
  const scope = scopeValue.textContent;
  result.innerHTML = `
    <article class="demo-finding" data-testid="demo-finding">
      <div class="result-top"><span class="priority">P1</span><h3>${t('demoFindingTitle')}</h3><span class="confidence">94%</span></div>
      <p>${t('demoFindingBody')}</p>
      <div class="evidence-grid">
        <div><span>${t('scope')}</span><strong>${scope}</strong></div>
        <div><span>${t('location')}</span><strong>src/checkout.ts:40</strong></div>
        <div><span>${t('impact')}</span><strong>${t('impactValue')}</strong></div>
        <div><span>${t('repair')}</span><strong>${t('repairValue')}</strong></div>
      </div>
      <div class="filtered-note">${t('filtered')}</div>
    </article>`;
}

runButton.addEventListener('click', async () => {
  runButton.disabled = true;
  runButton.textContent = t('reviewing');
  result.innerHTML = `<div class="empty-result"><span aria-hidden="true">···</span><p>${t('collecting')}</p></div>`;
  steps.forEach((step) => step.classList.remove('active', 'done'));

  for (const step of steps) {
    step.classList.add('active');
    await wait(260);
    step.classList.remove('active');
    step.classList.add('done');
  }

  renderFinding();
  runButton.disabled = false;
  runButton.textContent = t('runAgain');
});
