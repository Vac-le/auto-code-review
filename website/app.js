const translations = {
  zh: {
    title: 'Auto Code Review — 一套审查标准，适配每个编程智能体',
    description: 'Auto Code Review 为 Codex 与 Claude Code 提供证据优先的统一 AI 代码审查标准。',
    skip: '跳到主要内容', primaryNav: '主导航', home: 'Auto Code Review 首页', language: '语言',
    navWorkflow: '工作原理', navBenchmark: '质量基准', navInstall: '安装',
    heroEyebrow: '开源 · 本地优先 · 无需额外 API Key', heroTitle: '一套审查标准。', heroAccent: '适配每个编程智能体。',
    heroSubtitle: '一次安装，即可在 Codex 与 Claude Code 中获得证据优先的审查。每个问题都包含触发条件、可观察影响和精确位置——拒绝猜测。',
    installCta: '两分钟完成安装', demoCta: '体验在线审查', guarantees: '产品保证', trustReadonly: '默认只读', trustHost: '复用当前智能体', trustBenchmark: '公开质量基准',
    findingExample: '代码审查问题示例', verified: '已验证', findingTitle: '重试可能导致同一笔支付被扣款两次', findingBody: '首次扣款成功后仍可能发生超时，而重试没有复用幂等键，因此会创建新的扣款请求。', concreteTrigger: '明确触发条件', changedLine: '变更行 40', secondPass: '二次验证通过',
    metrics: '核心产品指标', metricInstall: '从安装到首次审查', metricConfidence: '最低报告置信度', metricKeys: '额外模型 API Key', metricPublic: '基准案例公开',
    workflowEyebrow: '先看证据，再下结论', workflowTitle: '一条你可以检查的审查流水线', workflowIntro: '宿主模型负责理解代码，共享协议控制审查范围并过滤薄弱结论；可选 CLI 提供确定性的代码位置验证。',
    step1Title: '映射完整 diff', step1Body: '分析细节前先枚举所有变更文件与代码块，并跳过二进制、生成文件和敏感信息。', step2Title: '构建有限上下文', step2Body: '只追踪证明或推翻候选问题所需的调用方、类型、测试和项目规则。', step3Title: '质疑每个发现', step3Body: '第二轮检查触发条件、影响、因果关系、行范围与可能的反证。', step4Title: '只报告有效信号', step4Body: '最多返回十个按优先级排序的问题，支持 Markdown 或 JSON；没有问题就明确给出干净结果。',
    demoEyebrow: '交互示例', demoTitle: '看看薄弱候选如何被过滤', demoIntro: '这个确定性演示复现了插件使用的验证阶段。', scopeLabel: '审查范围', scopeWorking: '未提交的变更', scopeStaged: '暂存区变更', scopeBranch: '当前分支与 main 对比', runReview: '开始审查', reviewing: '审查中…', runAgain: '再次运行', pipelineScope: '映射 4 个变更文件', pipelineContext: '检查相关上下文', pipelineVerify: '验证 5 个候选问题', pipelineReport: '保留 1 个已验证问题', emptyResult: '运行审查后查看完整验证轨迹。', collecting: '正在收集有限上下文…',
    demoFindingTitle: '重试可能造成重复扣款', demoFindingBody: '首次请求提交后如果网关超时，代码会进入重试流程，但没有复用原始幂等键。', scope: '范围', location: '位置', impact: '可观察影响', impactValue: '客户被重复扣款', repair: '修复方向', repairValue: '复用同一个逻辑支付键', filtered: '✓ 已过滤 4 个推测性或重复候选',
    benchmarkEyebrow: '质量必须可衡量', benchmarkTitle: '不做无法复现的自我庆祝', benchmarkIntro: '有缺陷与干净的补丁、预期发现和评分工具全部公开在仓库中。CI 验证评分器；发布行为分数前必须注明宿主、模型版本和语料。', signal: '信号', signalBody: '将报告的根因与人工标注的预期发现进行匹配。', trust: '可信度', trustMetric: '干净 diff 的误报率', trustBody: '干净案例可以防止提示词养成“处处编造问题”的倾向。', evidence: '证据', evidenceMetric: '文件与行号准确性', evidenceBody: '位置不存在或没有命中被审查的变更时，报告无法通过验证。',
    installEyebrow: '从本地开始', installTitle: '使用你已经信任的智能体', installIntro: '选择一个平台。默认工作流不增加模型网关，也不会发送遥测数据。', installPlatform: '安装平台', codexInstall: '克隆仓库后，只需一条命令即可注册并安装 Codex Skill。', claudeInstall: '克隆仓库后，只需一条命令即可注册并安装带命名空间的 Claude Skill。', copy: '复制', copied: '已复制', commandCopied: '命令已复制', thenAsk: '然后输入：', thenRun: '然后运行：', footerTagline: '一套审查标准，适配每个编程智能体。', footerMeta: 'Apache-2.0 · 本地优先 · 开放构建'
  },
  en: {
    title: 'Auto Code Review — One review standard, every coding agent',
    description: 'Auto Code Review brings one evidence-first review standard to Codex and Claude Code, with an adapter-ready protocol.',
    skip: 'Skip to content', primaryNav: 'Primary navigation', home: 'Auto Code Review home', language: 'Language',
    navWorkflow: 'How it works', navBenchmark: 'Benchmark', navInstall: 'Install',
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
    installEyebrow: 'Start locally', installTitle: 'Use the agent you already trust', installIntro: 'Choose a platform. The default workflow adds no model gateway and sends no telemetry.', installPlatform: 'Installation platform', codexInstall: 'From the cloned repository, register it and install the Codex skill in one command.', claudeInstall: 'From the cloned repository, register it and install the namespaced skill in one command.', copy: 'Copy', copied: 'Copied', commandCopied: 'Command copied', thenAsk: 'Then ask:', thenRun: 'Then run:', footerTagline: 'One review standard, every coding agent.', footerMeta: 'Apache-2.0 · Local-first · Built in the open'
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

const runButton = document.querySelector('[data-run-review]');
const result = document.querySelector('[data-demo-result]');
const steps = [...document.querySelectorAll('.pipeline-step')];
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function renderFinding() {
  const scope = document.querySelector('#scope').selectedOptions[0].textContent;
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
