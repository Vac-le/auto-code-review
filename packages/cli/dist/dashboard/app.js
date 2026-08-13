const copy = {
  zh: {
    history:'历史审查',clearHistory:'清空记录',historyLoading:'正在读取历史记录…',historyEmpty:'还没有历史审查记录。',historyCount:'{count} 条记录',historyFindings:'{count} 个问题',historyFiles:'{count} 个文件',deleteHistory:'删除这条记录',historyDeleted:'历史记录已删除',historyCleared:'历史记录已清空',historyViewed:'历史记录',confirmClear:'确定清空当前仓库的全部历史审查记录吗？',scopeWorking:'未提交变更',scopeStaged:'暂存区变更',scopeBase:'基础分支对比',
    overview:'审查概览',newReview:'发起审查',projectHistory:'项目审查记录',recentProjects:'最近项目',loadMore:'显示更多',selectBranch:'选择分支',switchBranch:'切换',branchSafety:'切换前需要保持工作区干净。',branchSwitched:'已切换到分支 {branch}',branchSwitching:'正在切换…',openFolder:'打开目录',refresh:'刷新',activity:'Review 活跃度',activityHint:'过去一年每天完成的代码审查',pastYear:'过去 365 天',totalReviews:'审查次数',activeDays:'活跃天数',totalFindings:'发现问题',currentStreak:'连续天数',less:'少',more:'多',collapseSidebar:'收起侧栏',expandSidebar:'展开侧栏',logsTitle:'运行日志',logsDescription:'查看桌面端运行与审查事件',logsLocalOnly:'日志仅保存在本机',logsRefresh:'刷新日志',logsLoading:'正在读取日志…',logsEmpty:'暂无运行日志。',diagnostics:'诊断',diagnosticsTitle:'环境诊断',diagnosticsDescription:'检查 Git、审查平台、项目配置和本地存储',diagnosticsLocalOnly:'诊断仅执行本机只读检查',diagnosticsLoading:'正在执行只读诊断…',diagnosticsHealthy:'环境可用',diagnosticsNeedsAttention:'需要处理',configured:'已配置',notConfigured:'使用默认配置',openSource:'打开文件',rerun:'重新审查',checkUpdates:'检查更新',updateCurrent:'当前已是最新版本',updateAvailable:'发现新版本 {version}',copyReport:'复制完整报告',reportCopied:'报告已复制',
    skip:'跳到主要内容',localOnly:'仅在本机运行',eyebrow:'真实本地审查',title:'检查当前代码变更',intro:'代码快照在本机生成，由你已登录的 Codex 或 Claude Code 审查；结果通过证据校验后才会显示。',repository:'当前仓库',settings:'设置审查',settingsHint:'选择平台和范围，然后开始一次只读审查。',platform:'审查平台',scope:'审查范围',working:'未提交变更',staged:'暂存区',base:'与基础分支对比',commitScope:'指定 Commit',branchScope:'分支对比',prScope:'Pull Request',baseRevision:'基础分支',headRevision:'目标 Commit',readonly:'只读运行，不会修改代码或 Git 状态',run:'开始真实审查',progress:'审查进度',stageSnapshot:'生成安全快照',stageSnapshotHint:'过滤密钥与无关文件',stageReview:'模型分析代码',stageReviewHint:'使用当前平台账号',stageValidate:'验证证据与行号',stageValidateHint:'淘汰不可靠问题',stageComplete:'生成审查报告',stageCompleteHint:'最多十条高置信度问题',cancel:'取消审查',result:'审查结果',waiting:'等待开始',restoring:'正在恢复审查状态',emptyTitle:'还没有审查报告',emptyBody:'选择上方设置并开始审查。模型完成分析后，经过验证的问题会显示在这里。',files:'变更文件',filesLoading:'正在读取 Git 变更…',available:'可用',unavailable:'未安装',branch:'分支',changes:'{files} 个文件 · +{additions} −{deletions}',running:'审查中',reviewLoading:'正在审查当前代码变更…',complete:'审查完成',failed:'审查失败',cancelled:'已取消',cleanTitle:'没有发现可靠问题',cleanBody:'本次审查没有问题通过证据门槛。这不等同于形式化证明代码完全正确。',verifiedFindings:'已验证问题',findingCount:'{count} 个',confidenceLabel:'置信度',trigger:'触发条件与影响',evidence:'代码证据',repair:'修复方向',noRepair:'报告未提供修复方向',location:'位置',copyFix:'复制修复提示',resolved:'标记已解决',falsePositive:'误报',reopen:'重新打开',copied:'修复提示已复制',categoryCorrectness:'正确性',categorySecurity:'安全',categoryDataIntegrity:'数据完整性',categoryConcurrency:'并发',categoryPerformance:'性能',categoryCompatibility:'兼容性',categoryTesting:'测试',reviewStarted:'真实审查已开始',authError:'本地会话链接无效，请重新运行 auto-code-review ui。',noHost:'请先安装并登录 Codex 或 Claude Code。',statusError:'无法读取本地仓库状态。',unknownError:'发生未知错误。',statusModified:'修改',statusAdded:'新增',statusDeleted:'删除',statusRenamed:'重命名',statusCopied:'复制',statusTypeChanged:'类型变化',statusUnmerged:'冲突'
  },
  en: {
    history:'Review history',clearHistory:'Clear history',historyLoading:'Loading review history…',historyEmpty:'No review history yet.',historyCount:'{count} records',historyFindings:'{count} findings',historyFiles:'{count} files',deleteHistory:'Delete this record',historyDeleted:'History record deleted',historyCleared:'Review history cleared',historyViewed:'History',confirmClear:'Clear all review history for this repository?',scopeWorking:'Uncommitted changes',scopeStaged:'Staged changes',scopeBase:'Base comparison',
    overview:'Overview',newReview:'New review',projectHistory:'Project review history',recentProjects:'Recent projects',loadMore:'Show more',selectBranch:'Select branch',switchBranch:'Switch',branchSafety:'Keep the working tree clean before switching.',branchSwitched:'Switched to {branch}',branchSwitching:'Switching…',openFolder:'Open folder',refresh:'Refresh',activity:'Review activity',activityHint:'Daily code reviews during the past year',pastYear:'Past 365 days',totalReviews:'Reviews',activeDays:'Active days',totalFindings:'Findings',currentStreak:'Day streak',less:'Less',more:'More',collapseSidebar:'Collapse sidebar',expandSidebar:'Expand sidebar',logsTitle:'Runtime logs',logsDescription:'Desktop runtime and review events',logsLocalOnly:'Logs are stored on this computer only',logsRefresh:'Refresh logs',logsLoading:'Loading logs…',logsEmpty:'No runtime logs yet.',diagnostics:'Diagnostics',diagnosticsTitle:'Environment diagnostics',diagnosticsDescription:'Check Git, review hosts, project configuration, and local storage',diagnosticsLocalOnly:'Diagnostics run read-only checks on this computer',diagnosticsLoading:'Running read-only diagnostics…',diagnosticsHealthy:'Environment ready',diagnosticsNeedsAttention:'Needs attention',configured:'Configured',notConfigured:'Using defaults',openSource:'Open file',rerun:'Review again',checkUpdates:'Check for updates',updateCurrent:'You are on the latest version',updateAvailable:'Version {version} is available',copyReport:'Copy full report',reportCopied:'Report copied',
    skip:'Skip to content',localOnly:'Runs on this computer only',eyebrow:'Real local review',title:'Review the current code change',intro:'A bounded snapshot is created locally, reviewed by your signed-in Codex or Claude Code, and shown only after evidence validation.',repository:'Current repository',settings:'Configure review',settingsHint:'Choose a platform and scope, then start a read-only review.',platform:'Review platform',scope:'Review scope',working:'Uncommitted changes',staged:'Staged changes',base:'Against a base branch',commitScope:'Specific commit',branchScope:'Branch comparison',prScope:'Pull Request',baseRevision:'Base revision',headRevision:'Head commit',readonly:'Read-only: code and Git state will not be modified',run:'Start real review',progress:'Review progress',stageSnapshot:'Create safe snapshot',stageSnapshotHint:'Filter secrets and unrelated files',stageReview:'Analyze with the model',stageReviewHint:'Use the active platform account',stageValidate:'Validate evidence and lines',stageValidateHint:'Remove unreliable findings',stageComplete:'Create review report',stageCompleteHint:'At most ten high-confidence findings',cancel:'Cancel review',result:'Review result',waiting:'Waiting to start',restoring:'Restoring review state',emptyTitle:'No review report yet',emptyBody:'Choose the settings above and start. Verified findings will appear here after the model finishes.',files:'Changed files',filesLoading:'Reading Git changes…',available:'Available',unavailable:'Not installed',branch:'Branch',changes:'{files} files · +{additions} −{deletions}',running:'Reviewing',reviewLoading:'Reviewing the current code change…',complete:'Review complete',failed:'Review failed',cancelled:'Cancelled',cleanTitle:'No verified findings',cleanBody:'No issue passed the evidence threshold. This is not a formal proof that the code is perfect.',verifiedFindings:'Verified findings',findingCount:'{count}',confidenceLabel:'Confidence',trigger:'Trigger and impact',evidence:'Code evidence',repair:'Repair direction',noRepair:'No repair direction was provided',location:'Location',copyFix:'Copy fix prompt',resolved:'Mark resolved',falsePositive:'False positive',reopen:'Reopen',copied:'Fix prompt copied',categoryCorrectness:'Correctness',categorySecurity:'Security',categoryDataIntegrity:'Data integrity',categoryConcurrency:'Concurrency',categoryPerformance:'Performance',categoryCompatibility:'Compatibility',categoryTesting:'Testing',reviewStarted:'Real review started',authError:'The local session link is invalid. Run auto-code-review ui again.',noHost:'Install and sign in to Codex or Claude Code first.',statusError:'Unable to read the local repository.',unknownError:'An unknown error occurred.',statusModified:'Modified',statusAdded:'Added',statusDeleted:'Deleted',statusRenamed:'Renamed',statusCopied:'Copied',statusTypeChanged:'Type changed',statusUnmerged:'Conflict'
  }
};

let language = localStorage.getItem('auto-code-review-language') === 'en' ? 'en' : 'zh';
let token = sessionStorage.getItem('auto-code-review-token');
function acceptTokenFromHash() {
  const next=new URLSearchParams(location.hash.slice(1)).get('token');
  if(!next)return false;
  token=next;sessionStorage.setItem('auto-code-review-token',token);history.replaceState(null,'',`${location.pathname}${location.search}`);return true;
}
acceptTokenFromHash();
window.addEventListener('hashchange',()=>{if(acceptTokenFromHash()){currentJob=null;lastJob=null;showEmptyResult();start();}});
let statusData = null;
let selectedHost = null;
let selectedScope = 'working';
let currentJob = null;
let pollTimer = null;
let lastJob = null;
let historyRecords = [];
let activityRecords = [];
let branchData = { current: null, branches: [] };
let selectedBranch = null;
let desktopState = null;
let sidebarHistoryLimit = 60;
let projectDefaultsApplied = false;
const desktopApi = window.autoCodeReviewDesktop;
const t = (key) => copy[language][key] || key;
const element = (tag, className, text) => { const node=document.createElement(tag); if(className)node.className=className;if(text!==undefined)node.textContent=text;return node; };

function applyLanguage(next) {
  language = next === 'en' ? 'en' : 'zh';
  localStorage.setItem('auto-code-review-language', language);
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = language === 'zh' ? '本地审查 — Auto Code Review' : 'Local review — Auto Code Review';
  document.querySelectorAll('[data-i18n]').forEach((node) => { if(t(node.dataset.i18n))node.textContent=t(node.dataset.i18n); });
  document.querySelectorAll('[data-language]').forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.language===language)));
  const projectButton=document.querySelector('[data-desktop-project]');
  const logsButton=document.querySelector('[data-desktop-logs]');
  const diagnosticsButton=document.querySelector('[data-diagnostics]');
  const folderButton=document.querySelector('[data-desktop-folder]');
  if(projectButton)projectButton.textContent=language==='zh'?'切换仓库':'Switch repository';
  if(logsButton)logsButton.textContent=language==='zh'?'日志':'Logs';
  if(diagnosticsButton)diagnosticsButton.textContent=t('diagnostics');
  if(folderButton)folderButton.textContent=t('openFolder');
  const collapse=document.querySelector('[data-sidebar-collapse]');
  const restore=document.querySelector('[data-sidebar-restore]');
  if(collapse){collapse.setAttribute('aria-label',t('collapseSidebar'));collapse.title=t('collapseSidebar');}
  if(restore){restore.setAttribute('aria-label',t('expandSidebar'));restore.title=t('expandSidebar');}
  if (statusData) renderStatus(statusData);
  if (lastJob) renderJob(lastJob);
  renderHistory(historyRecords);
  renderActivity(activityRecords);
  renderBranches(branchData);
}

document.querySelectorAll('[data-language]').forEach((button)=>button.addEventListener('click',()=>applyLanguage(button.dataset.language)));
applyLanguage(language);

if (desktopApi) {
  document.querySelector('[data-desktop-actions]').hidden = false;
  document.body.classList.add('desktop-mode');
  document.querySelector('[data-desktop-sidebar]').hidden=false;
  document.querySelector('[data-desktop-activity]').hidden=false;
  document.querySelector('[data-desktop-branch]').hidden=false;
  document.querySelector('[data-desktop-folder]').addEventListener('click',()=>desktopApi.openRepository());
  document.querySelector('[data-desktop-project]').addEventListener('click',()=>desktopApi.showProjectPicker());
  document.querySelector('[data-desktop-logs]').addEventListener('click',()=>showLogViewer());
  document.querySelector('[data-update-check]').hidden=false;
  desktopApi.onShowLogs?.(()=>showLogViewer());
  desktopApi.getState().then((state)=>{desktopState=state;renderDesktopProjects();}).catch(()=>{});
}

function setMainInert(value){document.querySelectorAll('body > .topbar,body > .desktop-layout').forEach((node)=>{node.inert=value;});}

function closeLogViewer() {
  const viewer=document.querySelector('[data-log-viewer]');
  if(!viewer||viewer.hidden)return;
  viewer.hidden=true;document.body.classList.remove('log-viewer-open');
  setMainInert(false);
  document.querySelector('[data-desktop-logs]')?.focus();
}

async function refreshLogViewer() {
  const content=document.querySelector('[data-log-content]');
  const meta=document.querySelector('[data-log-meta]');
  const refresh=document.querySelector('[data-log-refresh]');
  if(!content||!desktopApi)return;
  content.textContent=t('logsLoading');if(refresh)refresh.disabled=true;
  try {
    const snapshot=await desktopApi.getLogs();
    content.textContent=snapshot.content||t('logsEmpty');
    if(meta)meta.textContent=snapshot.updatedAt?`${snapshot.fileName} · ${new Date(snapshot.updatedAt).toLocaleString(language==='zh'?'zh-CN':'en')}`:t('logsDescription');
    content.scrollTop=content.scrollHeight;
  } catch(error) { content.textContent=error instanceof Error?error.message:t('unknownError'); }
  finally { if(refresh)refresh.disabled=false; }
}

function showLogViewer() {
  const viewer=document.querySelector('[data-log-viewer]');if(!viewer||!desktopApi)return;
  viewer.hidden=false;document.body.classList.add('log-viewer-open');
  setMainInert(true);
  document.querySelector('.log-viewer-close')?.focus();
  refreshLogViewer();
}

document.querySelectorAll('[data-log-close]').forEach((button)=>button.addEventListener('click',closeLogViewer));
document.querySelector('[data-log-refresh]')?.addEventListener('click',refreshLogViewer);

function closeDiagnostics(){const viewer=document.querySelector('[data-diagnostics-viewer]');if(!viewer||viewer.hidden)return;viewer.hidden=true;document.body.classList.remove('diagnostics-open');setMainInert(false);document.querySelector('[data-diagnostics]')?.focus();}
function diagnosticsRow(label,ok,detail){const row=element('article',`diagnostics-row ${ok?'ok':'warning'}`);row.append(element('span','diagnostics-state',ok?'✓':'!'));const body=element('div','');body.append(element('strong','',label),element('p','',detail||'—'));row.append(body);return row;}
async function refreshDiagnostics(){const content=document.querySelector('[data-diagnostics-content]');const refresh=document.querySelector('[data-diagnostics-refresh]');if(!content)return;content.replaceChildren(element('p','diagnostics-loading',t('diagnosticsLoading')));if(refresh)refresh.disabled=true;try{const data=await api('/api/diagnostics');const tools=data.doctor?.tools||[];content.replaceChildren();content.append(...tools.map((tool)=>diagnosticsRow(tool.name==='git'?'Git':tool.name==='codex'?'Codex':'Claude Code',tool.available,tool.version||tool.detail||t('unavailable'))),diagnosticsRow(data.config.path,true,data.config.exists?t('configured'):t('notConfigured')),diagnosticsRow(language==='zh'?'历史记录':'History storage',true,data.history.path));}catch(error){content.replaceChildren(diagnosticsRow(t('diagnosticsNeedsAttention'),false,error.message));}finally{if(refresh)refresh.disabled=false;}}
function showDiagnostics(){const viewer=document.querySelector('[data-diagnostics-viewer]');if(!viewer)return;viewer.hidden=false;document.body.classList.add('diagnostics-open');setMainInert(true);viewer.querySelector('.log-viewer-close')?.focus();refreshDiagnostics();}
document.querySelector('[data-diagnostics]')?.addEventListener('click',showDiagnostics);
document.querySelectorAll('[data-diagnostics-close]').forEach((button)=>button.addEventListener('click',closeDiagnostics));
document.querySelector('[data-diagnostics-refresh]')?.addEventListener('click',refreshDiagnostics);
document.querySelector('[data-update-check]')?.addEventListener('click',async()=>{const button=document.querySelector('[data-update-check]');button.disabled=true;try{const update=await desktopApi.checkUpdates();if(update.updateAvailable){showToast(t('updateAvailable').replace('{version}',update.latest));await desktopApi.openReleases();}else showToast(t('updateCurrent'));}catch(error){showError(error.message);}finally{button.disabled=false;}});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape')closeLogViewer();});

async function api(path, options={}) {
  const response = await fetch(path, { ...options, headers:{'x-auto-code-review-token':token,...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})} });
  const body = await response.json().catch(()=>({error:t('unknownError')}));
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

function showToast(message) {
  const toast=document.querySelector('[data-toast]');toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800);
}

const projectName=(path)=>path?.split(/[\\/]/).filter(Boolean).pop()||path||'';

function renderDesktopProjects() {
  if(!desktopApi||!desktopState)return;
  const list=document.querySelector('[data-sidebar-project-list]');
  if(!list)return;
  list.replaceChildren();
  desktopState.recentRepositories.filter((path)=>path!==desktopState.activeRepository).slice(0,5).forEach((path)=>{
    const button=element('button','sidebar-project-link');button.type='button';
    const mark=element('span','',projectName(path).slice(0,1).toUpperCase());
    const copy=element('span','');copy.append(element('strong','',projectName(path)),element('small','',path));
    button.append(mark,copy);button.addEventListener('click',()=>desktopApi.openRecentRepository(path));list.append(button);
  });
  document.querySelector('[data-sidebar-projects]').hidden=list.childElementCount===0;
}

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed',collapsed);
  document.querySelector('[data-sidebar-restore]').hidden=!collapsed;
  localStorage.setItem('auto-code-review-sidebar-collapsed',collapsed?'true':'false');
}

if(desktopApi){
  setSidebarCollapsed(localStorage.getItem('auto-code-review-sidebar-collapsed')==='true');
  document.querySelector('[data-sidebar-collapse]').addEventListener('click',()=>setSidebarCollapsed(true));
  document.querySelector('[data-sidebar-restore]').addEventListener('click',()=>setSidebarCollapsed(false));
  document.querySelectorAll('[data-scroll-target]').forEach((button)=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-scroll-target]').forEach((item)=>item.classList.toggle('active',item===button));
    document.getElementById(button.dataset.scrollTarget)?.scrollIntoView({behavior:'smooth',block:'start'});
  }));
}

function renderBranches(data) {
  branchData=data||{current:null,branches:[]};
  const select=document.querySelector('[data-branch-select]');const options=document.querySelector('[data-branch-options]');if(!select||!options)return;
  if(!selectedBranch||!branchData.branches.some(({name})=>name===selectedBranch))selectedBranch=branchData.current||branchData.branches[0]?.name||null;
  document.querySelector('[data-branch-value]').textContent=selectedBranch||'HEAD';
  select.disabled=branchData.branches.length===0;select.setAttribute('aria-expanded','false');options.hidden=true;options.replaceChildren();
  branchData.branches.forEach((branch)=>{
    const option=element('button','branch-option');option.type='button';option.setAttribute('role','option');option.setAttribute('aria-selected',String(branch.name===selectedBranch));
    const copy=element('span','');copy.append(element('strong','',branch.name),element('small','',branch.commit));
    option.append(element('span','branch-option-check',branch.name===selectedBranch?'✓':''),copy,element('span','branch-option-current',branch.current?(language==='zh'?'当前':'Current'):''));
    option.addEventListener('click',()=>{selectedBranch=branch.name;renderBranches(branchData);document.querySelector('[data-branch-switch]').disabled=selectedBranch===branchData.current;select.focus();});options.append(option);
  });
  document.querySelector('[data-branch-switch]').disabled=!selectedBranch||selectedBranch===branchData.current;
  document.querySelector('[data-sidebar-project-branch]').textContent=branchData.current||'HEAD';
  renderScopeBranches(branchData);
}

function closeBranchOptions(){const select=document.querySelector('[data-branch-select]');const options=document.querySelector('[data-branch-options]');if(!select||!options)return false;const open=select.getAttribute('aria-expanded')==='true';select.setAttribute('aria-expanded','false');options.hidden=true;return open;}
document.querySelector('[data-branch-select]')?.addEventListener('click',(event)=>{event.stopPropagation();const select=event.currentTarget;const options=document.querySelector('[data-branch-options]');const open=select.getAttribute('aria-expanded')==='true';select.setAttribute('aria-expanded',String(!open));options.hidden=open;if(!open)options.querySelector('[aria-selected="true"]')?.focus();});
document.querySelector('[data-branch-options]')?.addEventListener('click',(event)=>event.stopPropagation());
document.querySelector('.branch-select')?.addEventListener('focusout',(event)=>{if(!event.currentTarget.contains(event.relatedTarget))closeBranchOptions();});
document.addEventListener('click',closeBranchOptions);
document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&closeBranchOptions())document.querySelector('[data-branch-select]')?.focus();});

document.querySelector('[data-branch-switch]')?.addEventListener('click',async()=>{
  const button=document.querySelector('[data-branch-switch]');const branch=selectedBranch;if(!branch)return;
  button.disabled=true;button.textContent=t('branchSwitching');
  try{
    const data=await api('/api/branches/switch',{method:'POST',body:JSON.stringify({branch})});renderBranches(data);currentJob=null;lastJob=null;showEmptyResult();
    const [status,history,activity]=await Promise.all([api('/api/status'),api('/api/history'),api('/api/activity')]);renderStatus(status);renderHistory(history.records||[]);renderActivity(activity.records||[]);showToast(t('branchSwitched').replace('{branch}',branch));
  }catch(error){showError(error.message);renderBranches(branchData);}
  finally{button.textContent=t('switchBranch');}
});

function renderScopeBranches(data) {
  if (!desktopApi) return;
  const branches = data?.branches || [];
  ['base', 'head'].forEach((type) => {
    const selectBtn = document.querySelector(`[data-scope-${type}-select]`);
    const valueSpan = document.querySelector(`[data-scope-${type}-value]`);
    const optionsDiv = document.querySelector(`[data-scope-${type}-options]`);
    const input = document.querySelector(type === 'base' ? '[data-base-input]' : '[data-head-input]');
    if (!selectBtn || !optionsDiv || !input) return;
    const currentValue = input.value.trim() || (type === 'base' ? 'main' : 'HEAD');
    if (valueSpan) valueSpan.textContent = currentValue;
    selectBtn.setAttribute('aria-expanded', 'false');
    optionsDiv.hidden = true;
    optionsDiv.replaceChildren();
    branches.forEach((branch) => {
      const option = element('button', 'scope-branch-option');
      option.type = 'button';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(branch.name === currentValue));
      option.textContent = branch.name;
      option.addEventListener('click', () => {
        input.value = branch.name;
        if (valueSpan) valueSpan.textContent = branch.name;
        selectBtn.setAttribute('aria-expanded', 'false');
        optionsDiv.hidden = true;
        selectBtn.focus();
      });
      optionsDiv.append(option);
    });
  });
}

function setupScopeBranchSelect(type) {
  const selectBtn = document.querySelector(`[data-scope-${type}-select]`);
  const optionsDiv = document.querySelector(`[data-scope-${type}-options]`);
  const container = document.querySelector(`[data-scope-${type}-branch]`);
  if (!selectBtn || !optionsDiv || !container) return;
  selectBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = selectBtn.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.scope-branch-select button[aria-expanded="true"]').forEach((btn) => {
      btn.setAttribute('aria-expanded', 'false');
      btn.parentElement.querySelector('.scope-branch-options').hidden = true;
    });
    selectBtn.setAttribute('aria-expanded', String(!open));
    optionsDiv.hidden = open;
  });
  optionsDiv.addEventListener('click', (event) => event.stopPropagation());
  container.addEventListener('focusout', (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      selectBtn.setAttribute('aria-expanded', 'false');
      optionsDiv.hidden = true;
    }
  });
}

if (desktopApi) {
  setupScopeBranchSelect('base');
  setupScopeBranchSelect('head');
}

document.addEventListener('click', () => {
  document.querySelectorAll('.scope-branch-select button[aria-expanded="true"]').forEach((btn) => {
    btn.setAttribute('aria-expanded', 'false');
    btn.parentElement.querySelector('.scope-branch-options').hidden = true;
  });
});

function localDay(value) {
  const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function renderActivity(records) {
  activityRecords=records||[];
  const calendar=document.querySelector('[data-activity-calendar]');if(!calendar)return;
  const today=new Date();today.setHours(12,0,0,0);const start=new Date(today);start.setDate(start.getDate()-364-start.getDay());
  const end=new Date(today);end.setHours(23,59,59,999);const beginning=new Date(start);beginning.setHours(0,0,0,0);
  const visibleRecords=activityRecords.filter((record)=>{const time=Date.parse(record.updatedAt);return Number.isFinite(time)&&time>=beginning.getTime()&&time<=end.getTime();});
  const counts=new Map();let findings=0;
  visibleRecords.forEach((record)=>{const day=localDay(record.updatedAt);if(day)counts.set(day,(counts.get(day)||0)+1);findings+=record.findings||0;});
  const dates=[];for(const cursor=new Date(start);cursor<=today;cursor.setDate(cursor.getDate()+1))dates.push(new Date(cursor));
  calendar.replaceChildren();
  const months=element('div','calendar-months');const grid=element('div','calendar-grid');
  const formatter=new Intl.DateTimeFormat(language==='zh'?'zh-CN':'en',{month:'short'});let previousMonth=-1;
  dates.forEach((date,index)=>{
    const week=Math.floor(index/7);if(index===0||(date.getMonth()!==previousMonth&&date.getDate()<=7)){const label=element('span','',formatter.format(date));label.style.gridColumn=String(week+1);months.append(label);previousMonth=date.getMonth();}
    const day=localDay(date);const count=counts.get(day)||0;const cell=element('span','activity-cell');cell.dataset.level=String(count===0?0:count===1?1:count<=3?2:count<=6?3:4);cell.title=`${day} · ${count} ${language==='zh'?'次审查':'reviews'}`;grid.append(cell);
  });
  calendar.append(months,grid);
  let streak=0;const cursor=new Date(today);if(!(counts.get(localDay(cursor))>0))cursor.setDate(cursor.getDate()-1);while(counts.get(localDay(cursor))>0){streak+=1;cursor.setDate(cursor.getDate()-1);}
  document.querySelector('[data-stat-reviews]').textContent=String(visibleRecords.length);
  document.querySelector('[data-stat-days]').textContent=String(counts.size);
  document.querySelector('[data-stat-findings]').textContent=String(findings);
  document.querySelector('[data-stat-streak]').textContent=String(streak);
}

function statusLabel(status) {
  const key={modified:'statusModified',added:'statusAdded',deleted:'statusDeleted',renamed:'statusRenamed',copied:'statusCopied','type-changed':'statusTypeChanged',unmerged:'statusUnmerged'}[status];
  return key?t(key):status;
}

function renderFiles(snapshot) {
  const list=document.querySelector('[data-files]');list.replaceChildren();
  document.querySelector('[data-change-summary]').textContent=t('changes').replace('{files}',snapshot.files).replace('{additions}',snapshot.additions).replace('{deletions}',snapshot.deletions);
  if (!snapshot.filesList.length) { list.append(element('p','empty-files',language==='zh'?'当前范围没有代码变更。':'No code changes in this scope.')); return; }
  snapshot.filesList.forEach((file)=>{
    const row=element('div','file-row');row.append(element('span','file-status',statusLabel(file.status)),element('code','',file.path));
    const stats=element('span','file-stats');stats.append(element('span','additions',`+${file.additions}`),document.createTextNode(' '),element('span','deletions',`−${file.deletions}`));row.append(stats);list.append(row);
  });
}

function renderStatus(data) {
  statusData=data;
  document.querySelector('[data-repository-name]').textContent=data.repository.name;
  document.querySelector('[data-repository-path]').textContent=data.repository.path;
  document.querySelector('[data-repository-branch]').textContent=`${t('branch')}: ${data.repository.branch || 'HEAD'}`;
  const sidebarName=document.querySelector('[data-sidebar-project-name]');if(sidebarName)sidebarName.textContent=data.repository.name;
  const sidebarMark=document.querySelector('[data-sidebar-project-mark]');if(sidebarMark)sidebarMark.textContent=data.repository.name.slice(0,1).toUpperCase();
  const sidebarBranch=document.querySelector('[data-sidebar-project-branch]');if(sidebarBranch)sidebarBranch.textContent=data.repository.branch||'HEAD';
  data.hosts.forEach((host)=>{
    const button=document.querySelector(`[data-host="${host.host}"]`);button.disabled=!host.available;
    button.querySelector('small').textContent=host.available?`${t('available')} · ${host.version || ''}`:t('unavailable');
  });
  const preferred=data.hosts.find((host)=>host.host===data.preferredHost&&host.available)||data.hosts.find((host)=>host.available);
  if(preferred) selectHost(preferred.host); else showError(t('noHost'));
  if(!projectDefaultsApplied){projectDefaultsApplied=true;if(data.config?.defaultScope)selectScope(data.config.defaultScope);if(data.config?.baseRevision)document.querySelector('[data-base-input]').value=data.config.baseRevision;}
  renderFiles(data.snapshot);
  updateRunAvailability();
}

function selectHost(host) {
  selectedHost=host;
  document.querySelectorAll('[data-host]').forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.host===host)));
  updateRunAvailability();
}
document.querySelectorAll('[data-host]').forEach((button)=>button.addEventListener('click',()=>{if(!button.disabled)selectHost(button.dataset.host);}));

function selectScope(scope) {
  selectedScope=scope;
  document.querySelectorAll('[data-scope]').forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.scope===scope)));
  const needsBase=['base','branch','pull-request'].includes(scope);const needsHead=['commit','pull-request'].includes(scope);
  document.querySelector('[data-revision-fields]').hidden=!needsBase&&!needsHead;
  document.querySelector('[data-base-field]').hidden=!needsBase;document.querySelector('[data-head-field]').hidden=!needsHead;
  const isBranchMode = scope === 'branch';
  const baseInput = document.querySelector('[data-base-input]');
  const headInput = document.querySelector('[data-head-input]');
  const baseBranchSelect = document.querySelector('[data-scope-base-branch]');
  const headBranchSelect = document.querySelector('[data-scope-head-branch]');
  if (desktopApi && needsBase) {
    if (baseBranchSelect) baseBranchSelect.hidden = !isBranchMode;
    if (baseInput) baseInput.hidden = isBranchMode;
  }
  if (desktopApi && needsHead) {
    if (headBranchSelect) headBranchSelect.hidden = !isBranchMode;
    if (headInput) headInput.hidden = isBranchMode;
  }
  updateRunAvailability();
}
document.querySelectorAll('[data-scope]').forEach((button)=>button.addEventListener('click',()=>selectScope(button.dataset.scope)));

function updateRunAvailability(running=false){const workingHasChanges=(statusData?.snapshot?.files??0)>0;document.querySelector('[data-run]').disabled=running||!selectedHost||(selectedScope==='working'&&!workingHasChanges);}

const stageOrder=['snapshot','reviewing','validating','complete'];
function updateProgress(state) {
  const activeIndex=stageOrder.indexOf(state);
  document.querySelectorAll('[data-stage]').forEach((item,index)=>{
    item.classList.toggle('done',state==='complete'||index<activeIndex);
    item.classList.toggle('active',index===activeIndex&&state!=='complete');
    item.classList.toggle('failed',(state==='failed'||state==='cancelled')&&index===Math.max(0,stageOrder.indexOf(lastJob?.state||'snapshot')));
  });
}

function setResultStatus(state) {
  const badge=document.querySelector('[data-result-status]');badge.className='result-status';
  if(state==='restoring'){badge.textContent=t('restoring');badge.classList.add('running');return;}
  const terminal={complete:['complete','success'],failed:['failed','error'],cancelled:['cancelled','error']}[state];
  if(terminal){badge.textContent=t(terminal[0]);badge.classList.add(terminal[1]);}else if(state&&state!=='queued'){badge.textContent=t('running');badge.classList.add('running');}else badge.textContent=t('waiting');
}

function showError(message, state='failed') {
  const result=document.querySelector('[data-result]');result.replaceChildren(element('div','error-box',message));setResultStatus(state);
}

function showEmptyResult() {
  const result=document.querySelector('[data-result]');
  const empty=element('div','empty-state');
  empty.append(element('span','', '⌁'),element('h3','',t('emptyTitle')),element('p','',t('emptyBody')));
  result.replaceChildren(empty);setResultStatus('queued');updateProgress('queued');
}

function showLoading() {
  const result=document.querySelector('[data-result]');
  const state=element('div','loading-state');
  state.append(element('span','spinner'),element('p','',t('reviewLoading')));
  result.replaceChildren(state);
}

function historyScope(scope) {
  return t({working:'scopeWorking',staged:'scopeStaged',base:'scopeBase',commit:'commitScope',branch:'branchScope','pull-request':'prScope'}[scope?.mode]||'scopeWorking');
}

function historyTime(value) {
  try { return new Intl.DateTimeFormat(language==='zh'?'zh-CN':'en',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)); }
  catch { return value; }
}

function renderHistory(records) {
  historyRecords=records;
  renderSidebarHistory(records);
  const list=document.querySelector('[data-history-list]');
  if(!list)return;
  list.replaceChildren();
  document.querySelector('[data-history-count]').textContent=t('historyCount').replace('{count}',records.length);
  document.querySelector('[data-clear-history]').disabled=records.length===0;
  const sidebarClear=document.querySelector('[data-sidebar-clear-history]');if(sidebarClear)sidebarClear.disabled=records.length===0;
  if(!records.length){list.append(element('p','history-empty',t('historyEmpty')));return;}
  if(desktopApi)return;
  records.slice(0,200).forEach((record)=>{
    const row=element('article','history-row');
    if(record.id===currentJob)row.classList.add('selected');
    const open=element('button','history-open');open.type='button';
    const title=element('span','history-title',record.summary||`${record.host==='codex'?'Codex':'Claude Code'} · ${historyScope(record.scope)}`);
    const meta=element('span','history-meta');
    meta.append(element('span',`history-state ${record.state}`,t(record.state)),element('span','',record.host==='codex'?'Codex':'Claude Code'),element('span','',historyScope(record.scope)),element('span','',historyTime(record.updatedAt)),element('span','',t('historyFiles').replace('{count}',record.files)),element('span','',t('historyFindings').replace('{count}',record.findings)));
    open.append(title,meta);open.addEventListener('click',()=>openHistory(record.id));
    const remove=element('button','history-delete','×');remove.type='button';remove.setAttribute('aria-label',t('deleteHistory'));remove.title=t('deleteHistory');remove.addEventListener('click',()=>deleteHistory(record.id));
    row.append(open,remove);list.append(row);
  });
}

function renderSidebarHistory(records) {
  const list=document.querySelector('[data-sidebar-history]');if(!list)return;
  list.replaceChildren();document.querySelector('[data-sidebar-history-count]').textContent=String(records.length);
  if(!records.length){list.append(element('p','sidebar-history-empty',t('historyEmpty')));return;}
  records.slice(0,sidebarHistoryLimit).forEach((record)=>{
    const button=element('button','sidebar-history-item');button.type='button';if(record.id===currentJob)button.classList.add('selected');
    const dot=element('span',`sidebar-history-state ${record.state}`);
    const copy=element('span','sidebar-history-copy');copy.append(element('strong','',record.summary||historyScope(record.scope)),element('small','',`${record.scope?.branch||'HEAD'} · ${historyTime(record.updatedAt)}`));
    const count=element('span','sidebar-history-findings',String(record.findings));
    button.append(dot,copy,count);button.addEventListener('click',()=>openHistory(record.id));list.append(button);
  });
  if(records.length>sidebarHistoryLimit){const more=element('button','sidebar-history-more',`${t('loadMore')} · ${records.length-sidebarHistoryLimit}`);more.type='button';more.addEventListener('click',()=>{sidebarHistoryLimit+=60;renderSidebarHistory(records);});list.append(more);}
}

async function loadHistory() {
  const [data,activity]=await Promise.all([api('/api/history'),api('/api/activity')]);renderHistory(data.records||[]);renderActivity(activity.records||[]);
}

async function openHistory(id) {
  try { clearTimeout(pollTimer);const record=await api(`/api/history/${id}`);currentJob=id;renderJob(record);setResultStatus(record.state);renderHistory(historyRecords);showToast(t('historyViewed')); }
  catch(error){showError(error.message);}
}

async function deleteHistory(id) {
  try { await api(`/api/history/${id}`,{method:'DELETE'});if(currentJob===id){currentJob=null;lastJob=null;showEmptyResult();}await loadHistory();showToast(t('historyDeleted')); }
  catch(error){showError(error.message);}
}

document.querySelector('[data-clear-history]').addEventListener('click',async()=>{
  if(!confirm(t('confirmClear')))return;
  try { await api('/api/history',{method:'DELETE'});if(lastJob&&['complete','failed','cancelled'].includes(lastJob.state)){currentJob=null;lastJob=null;showEmptyResult();}await loadHistory();showToast(t('historyCleared')); }
  catch(error){showError(error.message);}
});
document.querySelector('[data-sidebar-clear-history]')?.addEventListener('click',()=>document.querySelector('[data-clear-history]').click());

function localizedHostError(message) {
  if(message?.startsWith('Codex cannot write to its runtime directory.')) {
    return language==='zh'
      ? 'Codex 无法写入自己的运行目录。请在普通 PowerShell 或终端中启动 auto-code-review ui，不要从受限的代理任务内启动。'
      : 'Codex cannot write to its runtime directory. Start auto-code-review ui from a normal PowerShell or terminal, not from a restricted agent task.';
  }
  if(message?.startsWith('The Codex account or API key has reached its usage limit.')) {
    return language==='zh'?'当前 Codex 账号或 API Key 已达到用量限制，请检查账号用量后重试。':message;
  }
  if(message?.startsWith('Codex authentication failed.')) {
    return language==='zh'?'Codex 登录失效，请先运行 codex login status 检查登录状态。':message;
  }
  return message;
}

async function setFindingState(recordId,findingId,state){try{const record=await api(`/api/history/${recordId}/findings/${findingId}`,{method:'PATCH',body:JSON.stringify({state})});lastJob=record;renderReport(record.report,record);await loadHistory();}catch(error){showError(error.message);}}
function findingPrompt(finding){return `Fix this verified code-review finding without changing unrelated behavior.\n\n${finding.title}\nLocation: ${finding.file}:${finding.startLine}-${finding.endLine}\nTrigger and impact: ${finding.failureScenario}\nEvidence: ${finding.evidence}\nSuggested direction: ${finding.suggestedFix||t('noRepair')}`;}
async function copyText(value){if(!navigator.clipboard?.writeText)throw new Error(language==='zh'?'当前环境无法访问剪贴板。':'Clipboard access is unavailable.');await navigator.clipboard.writeText(value);}
function formatReportForCopy(report) {
  const categoryLabel=(category)=>t(`category${category.split('-').map((part)=>part[0].toUpperCase()+part.slice(1)).join('')}`);
  let text = `# ${t('verifiedFindings')} (${report.findings.length})\n\n`;
  if (report.summary) text += `${report.summary}\n\n`;
  text += '---\n\n';
  report.findings.forEach((finding, index) => {
    text += `## ${index + 1}. ${finding.title}\n\n`;
    text += `**${t('category')}**: ${categoryLabel(finding.category)}\n`;
    text += `**${t('confidenceLabel')}**: ${Math.round(finding.confidence * 100)}%\n`;
    text += `**${t('location')}**: ${finding.file}:${finding.startLine}${finding.endLine !== finding.startLine ? `–${finding.endLine}` : ''}\n\n`;
    text += `### ${t('trigger')}\n${finding.failureScenario}\n\n`;
    text += `### ${t('evidence')}\n${finding.evidence}\n\n`;
    text += `### ${t('repair')}\n${finding.suggestedFix || t('noRepair')}\n\n`;
    text += '---\n\n';
  });
  return text;
}
function renderReport(report,record=lastJob) {
  const result=document.querySelector('[data-result]');result.replaceChildren();
  if(!report.findings.length){const clean=element('div','clean-report');clean.append(element('span','check','✓'),element('h3','',t('cleanTitle')),element('p','',report.summary||t('cleanBody')));const rerun=element('button','report-rerun',t('rerun'));rerun.type='button';rerun.addEventListener('click',()=>runReview());clean.append(rerun);result.append(clean);return;}
  const overview=element('header','report-overview');
  const summary=element('div','report-copy');summary.append(element('span','report-label',t('verifiedFindings')),element('p','report-summary',report.summary));
  const total=element('strong','report-count',t('findingCount').replace('{count}',report.findings.length));
  const overviewActions=element('div','report-overview-actions');overviewActions.append(total);
  const copyReport=element('button','report-copy-all',t('copyReport'));copyReport.type='button';copyReport.addEventListener('click',async()=>{try{await copyText(formatReportForCopy(report));showToast(t('reportCopied'));}catch(error){showError(error.message);}});overviewActions.append(copyReport);
  const rerun=element('button','report-rerun',t('rerun'));rerun.type='button';rerun.addEventListener('click',()=>runReview());overviewActions.append(rerun);overview.append(summary,overviewActions);result.append(overview);
  const categoryLabel=(category)=>t(`category${category.split('-').map((part)=>part[0].toUpperCase()+part.slice(1)).join('')}`);
  report.findings.forEach((finding,index)=>{
    const card=element('article',`finding-card priority-${finding.priority.toLowerCase()}`);
    const state=record?.findingStates?.[finding.id]||'open';card.dataset.findingState=state;
    const header=element('header','finding-header');
    const identity=element('div','finding-identity');identity.append(element('span','finding-number',String(index+1).padStart(2,'0')),element('span','priority',finding.priority));
    const heading=element('div','finding-heading');heading.append(element('h3','',finding.title));
    const meta=element('div','finding-meta');meta.append(element('span','category',categoryLabel(finding.category)),element('span','confidence',`${t('confidenceLabel')} ${Math.round(finding.confidence*100)}%`));heading.append(meta);header.append(identity,heading);
    const actions=element('div','finding-actions');const copy=element('button','',t('copyFix'));copy.type='button';copy.addEventListener('click',async()=>{try{await copyText(findingPrompt(finding));showToast(t('copied'));}catch(error){showError(error.message);}});actions.append(copy);
    if(record?.id&&finding.id){const resolved=element('button','',state==='resolved'?t('reopen'):t('resolved'));resolved.type='button';resolved.addEventListener('click',()=>setFindingState(record.id,finding.id,state==='resolved'?'open':'resolved'));const falsePositive=element('button','',state==='false-positive'?t('reopen'):t('falsePositive'));falsePositive.type='button';falsePositive.addEventListener('click',()=>setFindingState(record.id,finding.id,state==='false-positive'?'open':'false-positive'));actions.append(resolved,falsePositive);}header.append(actions);
    const location=element('div','finding-location');location.append(element('span','location-label',t('location')),element('code','',`${finding.file}:${finding.startLine}${finding.endLine!==finding.startLine?`–${finding.endLine}`:''}`));if(desktopApi?.openSource){const open=element('button','finding-open-source',t('openSource'));open.type='button';open.addEventListener('click',()=>desktopApi.openSource(finding.file).catch((error)=>showError(error.message)));location.append(open);}
    const grid=element('div','finding-grid');
    [['trigger',finding.failureScenario],['evidence',finding.evidence],['repair',finding.suggestedFix||t('noRepair')]].forEach(([key,value])=>{const box=element('section',`finding-detail ${key}`);box.append(element('h4','',t(key)),element('p','',value));grid.append(box);});
    card.append(header,location,grid);result.append(card);
  });
}

function renderJob(job) {
  lastJob=job;if(job.host)selectHost(job.host);if(job.scope?.mode){selectScope(job.scope.mode);if(job.scope.base)document.querySelector('[data-base-input]').value=job.scope.base;if(job.scope.head)document.querySelector('[data-head-input]').value=job.scope.head;}updateProgress(job.state);setResultStatus(job.state);
  if(job.snapshot)renderFiles(job.snapshot);
  const running=!['complete','failed','cancelled'].includes(job.state);
  document.querySelector('[data-cancel]').hidden=!running;
  updateRunAvailability(running);
  if(job.state==='complete'&&job.report)renderReport(job.report,job);
  else if(job.state==='failed'||job.state==='cancelled')showError(job.state==='cancelled'?t('cancelled'):(localizedHostError(job.error)||t('failed')),job.state);
  else showLoading();
}

async function pollJob() {
  try { const job=await api(`/api/reviews/${currentJob}`);renderJob(job);if(!['complete','failed','cancelled'].includes(job.state))pollTimer=setTimeout(pollJob,900);else await loadHistory(); }
  catch(error){showError(error.message);}
}

function restoreJob(job) {
  currentJob=job.id;
  renderJob(job);
  if(!['complete','failed','cancelled'].includes(job.state))pollTimer=setTimeout(pollJob,250);
}

async function runReview(){
  try{
    const payload={host:selectedHost,scope:selectedScope};if(['base','branch','pull-request'].includes(selectedScope))payload.base=document.querySelector('[data-base-input]').value.trim();if(['commit','pull-request'].includes(selectedScope))payload.head=document.querySelector('[data-head-input]').value.trim();
    const job=await api('/api/reviews',{method:'POST',body:JSON.stringify(payload)});currentJob=job.id;lastJob=job;updateProgress('snapshot');setResultStatus('snapshot');showLoading();document.querySelector('[data-cancel]').hidden=false;document.querySelector('[data-run]').disabled=true;showToast(t('reviewStarted'));pollTimer=setTimeout(pollJob,250);
  }catch(error){showError(error.message);}
}
document.querySelector('[data-run]').addEventListener('click',runReview);

document.querySelector('[data-cancel]').addEventListener('click',async()=>{
  if(!currentJob)return;clearTimeout(pollTimer);try{await api(`/api/reviews/${currentJob}/cancel`,{method:'POST',body:'{}'});pollTimer=setTimeout(pollJob,250);}catch(error){showError(error.message);}
});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape'){closeLogViewer();closeDiagnostics();}});

async function start(){
  if(!token){showError(t('authError'));return;}
  setResultStatus('restoring');
  try{const [data,history,activity,branches]=await Promise.all([api('/api/status'),api('/api/history'),api('/api/activity'),api('/api/branches')]);renderStatus(data);renderHistory(history.records||[]);renderActivity(activity.records||[]);renderBranches(branches);if(data.activeReview)restoreJob(data.activeReview);else setResultStatus('queued');}catch(error){showError(`${t('statusError')} ${error.message}`);}
}
start();
