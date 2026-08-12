# Auto Code Review 使用指南

> 官网中的“交互演示”只展示审查步骤，不会读取你的代码。真正的审查需要在 Git 仓库中通过 Codex 或 Claude Code 调用插件。

## 1. 使用前准备

- Node.js 20 或更高版本
- Git 2.30 或更高版本
- 已安装 Codex 或 Claude Code
- 需要审查的目录必须是 Git 仓库

## 2. 安装插件

克隆项目并安装依赖：

```bash
git clone https://github.com/Vac-le/auto-code-review.git
cd auto-code-review
npm install
npm run install:agents
```

安装程序会检测本机已有的平台，并为 Codex 和 Claude Code 安装对应插件。只安装一个平台时可以运行：

```bash
npm run install:agents -- --platform codex
npm run install:agents -- --platform claude
```

安装完成后，请新建一个 Codex 任务或重新启动 Claude Code 会话。

## 3. 打开本地审查界面

在克隆的 Auto Code Review 项目中运行，并通过 `--repo` 指定需要审查的 Git 仓库：

```bash
npm run ui -- --repo C:\path\to\your-project
```

CLI 正式发布或全局安装后，也可以直接进入需要审查的仓库运行 `auto-code-review ui`。

请在普通 PowerShell、Windows Terminal 或系统终端中启动，不要让 Codex/Claude 的受限代理任务代为执行该命令。审查过程对代码仓库保持只读，但 Codex/Claude CLI 仍需要写入自己的登录状态和运行目录。

命令会在本机启动服务并自动打开浏览器，地址类似 `http://127.0.0.1:4387`。页面会显示当前仓库、Codex/Claude Code 可用状态、真实变更文件和经过验证的审查报告。关闭终端中的命令或按 `Ctrl+C` 即可停止本地界面。

只使用指定平台或端口：

```bash
npm run ui -- --repo C:\path\to\your-project --host codex
npm run ui -- --repo C:\path\to\your-project --host claude --port 4390
```

本地界面只监听 `127.0.0.1`，每次启动使用新的随机会话令牌。它不会把代码发送到 Auto Code Review 自建服务器；模型调用仍通过你选择并已登录的 Codex 或 Claude Code 账号完成。

### 历史审查记录

本地界面会为每个仓库保留最近 1,000 条审查记录，用于支持年度 Review 活跃度展示；完成、失败和取消的报告在重启服务后仍可查看。记录存放在仓库外：Windows 为 `%LOCALAPPDATA%\auto-code-review\history`，macOS 为 `~/Library/Application Support/auto-code-review/history`，Linux 为 `$XDG_STATE_HOME/auto-code-review/history`。记录仅包含经过验证的报告、问题处置状态、审查状态、范围和变更文件摘要；不会保存源码快照、原始补丁、仓库绝对路径或会话令牌。可在“历史审查”中重新打开报告、删除单条记录或清空本地历史。

### 项目配置

可在仓库根目录添加 `.auto-code-review.json`，设置 `defaultHost`、`defaultScope`、`baseRevision`、`minimumConfidence`、`maxFindings`、`ignorePaths` 和审查 `instructions`。配置采用严格校验，项目指令不能覆盖只读、安全与证据规则。完整示例见项目 README。

## 4. 在 Codex 中使用

用 Codex 打开需要审查的 Git 项目，然后在新任务中输入：

```text
$auto-code-review review my current changes
```

### 常用审查范围

审查尚未提交的全部变更：

```text
$auto-code-review review my current changes
```

只审查暂存区：

```text
$auto-code-review review staged changes
```

审查当前分支相对 main 的改动：

```text
$auto-code-review review my branch against main
```

只审查指定目录：

```text
$auto-code-review review changes under src/auth
```

审查指定提交：

```text
$auto-code-review review commit abc123
```

## 5. 在 Claude Code 中使用

进入需要审查的 Git 项目，然后运行：

```text
/auto-code-review:review
```

### 常用参数

```text
/auto-code-review:review --staged
/auto-code-review:review --base main
/auto-code-review:review src/auth
/auto-code-review:review 123
/auto-code-review:review --staged --json
```

- `--staged`：只审查暂存区
- `--base main`：审查当前分支相对 main 的改动
- `src/auth`：只审查指定文件或目录
- `123`：审查编号为 123 的 Pull Request
- `--json`：输出结构化 JSON 报告

## 6. 如何阅读审查报告

每条问题都应包含：

- **优先级**：P0、P1、P2 或 P3
- **准确位置**：文件路径和最小行号范围
- **触发条件**：什么输入、状态或执行路径会触发问题
- **实际影响**：用户或系统会观察到什么错误结果
- **问题原因**：为什么当前代码无法正确处理
- **修复建议**：限定范围的修复方向
- **置信度**：结构化报告中的可信程度，最低为 0.80

优先级含义：

- **P0**：可能立即造成大范围数据损失或安全事故，必须停止发布
- **P1**：高影响问题，应在合并或发布前修复
- **P2**：正常优先级的真实缺陷
- **P3**：影响较小但可以明确复现的问题

如果没有候选问题通过二次验证，插件会返回 `No verified findings`。这表示本次审查没有发现达到报告标准的问题，并不代表代码已经被形式化证明完全正确。

## 7. 审查后让 AI 修复

Auto Code Review 默认只读，不会修改文件。确认报告后，可以继续对 Codex 或 Claude Code 说：

```text
修复审查报告中的 P1 和 P2，补充回归测试，并运行相关测试。
```

修复完成后，建议再次运行 Auto Code Review，确认问题已经消失且没有引入新的回归。

## 8. 其他命令行工具

命令行工具用于生成代码快照、校验 JSON 报告和格式化输出；真正判断代码问题的仍是 Codex 或 Claude Code 中的 AI 模型。

```bash
npm exec -- auto-code-review snapshot --staged --output snapshot.json
npm exec -- auto-code-review validate --report report.json --snapshot snapshot.json
npm exec -- auto-code-review format --report report.json
npm exec -- auto-code-review doctor
```

## 9. 安全与隐私

- 默认只执行只读审查，不修改代码或 Git 状态
- 不需要额外的模型 API Key 或模型网关
- 不会把代码发送到 Auto Code Review 自建服务器
- 使用当前 Codex 或 Claude Code 会话中已经配置的模型和账号
- 自动跳过常见密钥文件、二进制文件、生成文件和锁文件
- 报告输出前会过滤常见令牌、私钥和凭据格式

代码是否离开本机仍取决于你所使用的 Codex 或 Claude Code 服务及其账号设置，请同时遵守对应平台的隐私政策。

## 10. 常见问题

### 安装后找不到命令

新建 Codex 任务或重新启动 Claude Code 会话。插件是在会话启动时载入的。

### 报告没有任何问题

先确认 Git 仓库中确实存在未提交、已暂存或相对基础分支的改动。没有问题通过证据门槛时，返回干净结果是正常行为。

### 可以直接在官网上传代码吗

目前不可以。官网演示使用固定示例，不接收或保存用户代码。真实审查必须在 Codex 或 Claude Code 中运行。

### 会自动修改代码吗

不会。审查插件默认只读。只有你在审查完成后明确要求 AI 修复，平台才可以进入代码修改流程。

### 从哪里报告问题

请前往 [GitHub Issues](https://github.com/Vac-le/auto-code-review/issues) 提交问题。安全漏洞请使用仓库的 Security Advisory 私密报告渠道。
