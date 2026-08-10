const copy = {
  zh: {
    skip:'跳到主要内容',localOnly:'仅在本机运行',eyebrow:'真实本地审查',title:'检查当前代码变更',intro:'代码快照在本机生成，由你已登录的 Codex 或 Claude Code 审查；结果通过证据校验后才会显示。',repository:'当前仓库',settings:'设置审查',settingsHint:'选择平台和范围，然后开始一次只读审查。',platform:'审查平台',scope:'审查范围',working:'未提交变更',staged:'暂存区',base:'与基础分支对比',baseRevision:'基础分支',readonly:'只读运行，不会修改代码或 Git 状态',run:'开始真实审查',progress:'审查进度',stageSnapshot:'生成安全快照',stageSnapshotHint:'过滤密钥与无关文件',stageReview:'模型分析代码',stageReviewHint:'使用当前平台账号',stageValidate:'验证证据与行号',stageValidateHint:'淘汰不可靠问题',stageComplete:'生成审查报告',stageCompleteHint:'最多十条高置信度问题',cancel:'取消审查',result:'审查结果',waiting:'等待开始',restoring:'正在恢复审查状态',emptyTitle:'还没有审查报告',emptyBody:'选择上方设置并开始审查。模型完成分析后，经过验证的问题会显示在这里。',files:'变更文件',loading:'正在读取 Git 变更…',available:'可用',unavailable:'未安装',branch:'分支',changes:'{files} 个文件 · +{additions} −{deletions}',running:'审查中',complete:'审查完成',failed:'审查失败',cancelled:'已取消',cleanTitle:'没有发现可靠问题',cleanBody:'本次审查没有问题通过证据门槛。这不等同于形式化证明代码完全正确。',trigger:'触发条件与影响',evidence:'代码证据',repair:'修复方向',noRepair:'报告未提供修复方向',location:'位置',reviewStarted:'真实审查已开始',authError:'本地会话链接无效，请重新运行 auto-code-review ui。',noHost:'请先安装并登录 Codex 或 Claude Code。',statusError:'无法读取本地仓库状态。',unknownError:'发生未知错误。',statusModified:'修改',statusAdded:'新增',statusDeleted:'删除',statusRenamed:'重命名',statusCopied:'复制',statusTypeChanged:'类型变化',statusUnmerged:'冲突'
  },
  en: {
    skip:'Skip to content',localOnly:'Runs on this computer only',eyebrow:'Real local review',title:'Review the current code change',intro:'A bounded snapshot is created locally, reviewed by your signed-in Codex or Claude Code, and shown only after evidence validation.',repository:'Current repository',settings:'Configure review',settingsHint:'Choose a platform and scope, then start a read-only review.',platform:'Review platform',scope:'Review scope',working:'Uncommitted changes',staged:'Staged changes',base:'Against a base branch',baseRevision:'Base revision',readonly:'Read-only: code and Git state will not be modified',run:'Start real review',progress:'Review progress',stageSnapshot:'Create safe snapshot',stageSnapshotHint:'Filter secrets and unrelated files',stageReview:'Analyze with the model',stageReviewHint:'Use the active platform account',stageValidate:'Validate evidence and lines',stageValidateHint:'Remove unreliable findings',stageComplete:'Create review report',stageCompleteHint:'At most ten high-confidence findings',cancel:'Cancel review',result:'Review result',waiting:'Waiting to start',restoring:'Restoring review state',emptyTitle:'No review report yet',emptyBody:'Choose the settings above and start. Verified findings will appear here after the model finishes.',files:'Changed files',loading:'Reading Git changes…',available:'Available',unavailable:'Not installed',branch:'Branch',changes:'{files} files · +{additions} −{deletions}',running:'Reviewing',complete:'Review complete',failed:'Review failed',cancelled:'Cancelled',cleanTitle:'No verified findings',cleanBody:'No issue passed the evidence threshold. This is not a formal proof that the code is perfect.',trigger:'Trigger and impact',evidence:'Code evidence',repair:'Repair direction',noRepair:'No repair direction was provided',location:'Location',reviewStarted:'Real review started',authError:'The local session link is invalid. Run auto-code-review ui again.',noHost:'Install and sign in to Codex or Claude Code first.',statusError:'Unable to read the local repository.',unknownError:'An unknown error occurred.',statusModified:'Modified',statusAdded:'Added',statusDeleted:'Deleted',statusRenamed:'Renamed',statusCopied:'Copied',statusTypeChanged:'Type changed',statusUnmerged:'Conflict'
  }
};

let language = localStorage.getItem('auto-code-review-language') === 'en' ? 'en' : 'zh';
let token = new URLSearchParams(location.hash.slice(1)).get('token') || sessionStorage.getItem('auto-code-review-token');
if (token) {
  sessionStorage.setItem('auto-code-review-token', token);
  history.replaceState(null, '', `${location.pathname}${location.search}`);
}
let statusData = null;
let selectedHost = null;
let selectedScope = 'working';
let currentJob = null;
let pollTimer = null;
let lastJob = null;
const t = (key) => copy[language][key] || key;
const element = (tag, className, text) => { const node=document.createElement(tag); if(className)node.className=className;if(text!==undefined)node.textContent=text;return node; };

function applyLanguage(next) {
  language = next === 'en' ? 'en' : 'zh';
  localStorage.setItem('auto-code-review-language', language);
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = language === 'zh' ? '本地审查 — Auto Code Review' : 'Local review — Auto Code Review';
  document.querySelectorAll('[data-i18n]').forEach((node) => { if(t(node.dataset.i18n))node.textContent=t(node.dataset.i18n); });
  document.querySelectorAll('[data-language]').forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.language===language)));
  if (statusData) renderStatus(statusData);
  if (lastJob) renderJob(lastJob);
}

document.querySelectorAll('[data-language]').forEach((button)=>button.addEventListener('click',()=>applyLanguage(button.dataset.language)));
applyLanguage(language);

async function api(path, options={}) {
  const response = await fetch(path, { ...options, headers:{'x-auto-code-review-token':token,...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})} });
  const body = await response.json().catch(()=>({error:t('unknownError')}));
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

function showToast(message) {
  const toast=document.querySelector('[data-toast]');toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800);
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
  data.hosts.forEach((host)=>{
    const button=document.querySelector(`[data-host="${host.host}"]`);button.disabled=!host.available;
    button.querySelector('small').textContent=host.available?`${t('available')} · ${host.version || ''}`:t('unavailable');
  });
  const preferred=data.hosts.find((host)=>host.host===data.preferredHost&&host.available)||data.hosts.find((host)=>host.available);
  if(preferred) selectHost(preferred.host); else showError(t('noHost'));
  renderFiles(data.snapshot);
  document.querySelector('[data-run]').disabled=!preferred||data.snapshot.files===0;
}

function selectHost(host) {
  selectedHost=host;
  document.querySelectorAll('[data-host]').forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.host===host)));
}
document.querySelectorAll('[data-host]').forEach((button)=>button.addEventListener('click',()=>{if(!button.disabled)selectHost(button.dataset.host);}));

function selectScope(scope) {
  selectedScope=scope;
  document.querySelectorAll('[data-scope]').forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.scope===scope)));
  document.querySelector('[data-base-field]').hidden=scope!=='base';
}
document.querySelectorAll('[data-scope]').forEach((button)=>button.addEventListener('click',()=>selectScope(button.dataset.scope)));

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

function showError(message) {
  const result=document.querySelector('[data-result]');result.replaceChildren(element('div','error-box',message));setResultStatus('failed');
}

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

function renderReport(report) {
  const result=document.querySelector('[data-result]');result.replaceChildren();
  if(!report.findings.length){const clean=element('div','clean-report');clean.append(element('span','check','✓'),element('h3','',t('cleanTitle')),element('p','',report.summary||t('cleanBody')));result.append(clean);return;}
  result.append(element('p','report-summary',report.summary));
  report.findings.forEach((finding)=>{
    const card=element('article','finding-card');const top=element('div','finding-top');top.append(element('span','priority',finding.priority),element('h3','',finding.title),element('span','confidence',`${Math.round(finding.confidence*100)}%`));card.append(top,element('p','finding-location',`${finding.file}:${finding.startLine}${finding.endLine!==finding.startLine?`–${finding.endLine}`:''}`));
    const grid=element('div','finding-grid');
    [['trigger',finding.failureScenario],['evidence',finding.evidence],['repair',finding.suggestedFix||t('noRepair')]].forEach(([key,value])=>{const box=element('div');box.append(element('span','',t(key)),element('p','',value));grid.append(box);});card.append(grid);result.append(card);
  });
}

function renderJob(job) {
  lastJob=job;if(job.host)selectHost(job.host);updateProgress(job.state);setResultStatus(job.state);
  if(job.snapshot)renderFiles(job.snapshot);
  const running=!['complete','failed','cancelled'].includes(job.state);
  document.querySelector('[data-cancel]').hidden=!running;
  document.querySelector('[data-run]').disabled=running||!selectedHost;
  if(job.state==='complete'&&job.report)renderReport(job.report);
  else if(job.state==='failed'||job.state==='cancelled')showError(localizedHostError(job.error)||t(job.state));
}

async function pollJob() {
  try { const job=await api(`/api/reviews/${currentJob}`);renderJob(job);if(!['complete','failed','cancelled'].includes(job.state))pollTimer=setTimeout(pollJob,900); }
  catch(error){showError(error.message);}
}

function restoreJob(job) {
  currentJob=job.id;
  renderJob(job);
  if(!['complete','failed','cancelled'].includes(job.state))pollTimer=setTimeout(pollJob,250);
}

document.querySelector('[data-run]').addEventListener('click',async()=>{
  try{
    const payload={host:selectedHost,scope:selectedScope};if(selectedScope==='base')payload.base=document.querySelector('[data-base-input]').value.trim();
    const job=await api('/api/reviews',{method:'POST',body:JSON.stringify(payload)});currentJob=job.id;lastJob=job;updateProgress('snapshot');setResultStatus('snapshot');document.querySelector('[data-cancel]').hidden=false;document.querySelector('[data-run]').disabled=true;showToast(t('reviewStarted'));pollTimer=setTimeout(pollJob,250);
  }catch(error){showError(error.message);}
});

document.querySelector('[data-cancel]').addEventListener('click',async()=>{
  if(!currentJob)return;clearTimeout(pollTimer);try{await api(`/api/reviews/${currentJob}/cancel`,{method:'POST',body:'{}'});pollTimer=setTimeout(pollJob,250);}catch(error){showError(error.message);}
});

async function start(){
  if(!token){showError(t('authError'));return;}
  setResultStatus('restoring');
  try{const data=await api('/api/status');renderStatus(data);if(data.activeReview)restoreJob(data.activeReview);else setResultStatus('queued');}catch(error){showError(`${t('statusError')} ${error.message}`);}
}
start();
