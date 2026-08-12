# 审查失败调试指南

## 配置验证

### 1. 检查 Claude Code 配置

你的 Claude Code 使用自定义 API（ccswitch配置）：

```bash
# 检查环境变量
echo $ANTHROPIC_BASE_URL
# 应该输出: https://api.anyint.ai/anthropic

echo $ANTHROPIC_AUTH_TOKEN
# 应该输出: sk-8a43b046...

# 检查 Claude Code 是否正常
claude --version
claude auth status
```

### 2. 验证配置生效

```bash
# 测试 Claude Code 是否使用自定义 API
echo "Hello" | claude --print --safe-mode --no-session-persistence
# 如果能正常响应，说明配置生效
```

### 3. 检查 settings.json

查看 `~/.claude/settings.json` 的 `env` 部分：

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "sk-...",
    "ANTHROPIC_BASE_URL": "https://api.anyint.ai/anthropic",
    ...
  }
}
```

## 费用说明

### 你的配置使用的是 `api.anyint.ai`

- ✅ **不扣 Anthropic 官方账户额度**
- ✅ 使用你的自定义 API 配额
- ✅ 费用由 `api.anyint.ai` 计算

### `--no-session-persistence` 的作用

虽然 Auto Code Review 使用 `--no-session-persistence` 参数：
- ✅ 不保存会话历史
- ✅ 不占用"会话数量"限制
- ❌ **仍然消耗 API tokens/请求次数**

## 审查失败调试

### 新版本改进（v0.2.1+）

从 v0.2.1 开始，详细错误日志会记录在：
1. 控制台输出（console.error）
2. 桌面应用日志
3. review.error 事件

### 查看详细错误

#### 方法 1: 桌面应用日志

1. 打开桌面应用
2. 点击顶部的"日志"按钮
3. 查找包含 `review.error` 的条目
4. 现在会显示：
   - 退出代码
   - stderr 输出（最后 2000 字符）
   - stdout 输出（最后 500 字符）
   - 错误堆栈

#### 方法 2: 控制台输出

如果从命令行启动桌面应用：

```bash
cd packages/desktop
npm start
```

错误信息会直接打印到控制台。

### 常见失败原因

#### 1. 分支对比配置错误 ⭐ 最常见

**症状**: 选择"分支对比"模式，审查失败且没有发现问题

**原因**: 
- 选择的分支不存在
- 两个分支完全相同，没有差异
- 当前仓库只有一个分支

**解决**:
```bash
# 检查本地分支
git branch -a

# 如果只有 main 分支，使用"未提交变更"模式
# 或者创建测试分支：
git checkout -b test-branch
echo "// test" >> README.md
git add README.md
git commit -m "test"
git checkout main
```

然后在应用中选择"分支对比"：main vs test-branch

#### 2. API 速率限制

**症状**: 连续多次审查后失败，耗时约 10 分钟超时

**原因**: 
- `api.anyint.ai` 的速率限制
- API 配额用尽

**解决**: 
- 等待 30 分钟到 1 小时后重试
- 联系 `api.anyint.ai` 提供商检查配额

#### 3. 代码快照太大

**症状**: 审查失败，日志显示"The model response exceeded the safe output limit"

**原因**: 变更文件太多或太大

**解决**:
- 减小审查范围
- 使用 `.auto-code-review.json` 配置 `ignorePaths`

#### 4. Claude Code 版本问题

**症状**: 审查启动失败，提示"Claude Code is not available"

**解决**:
```bash
# 更新 Claude Code
claude update

# 或重新安装
npm install -g @anthropic/claude-code
```

## 测试流程

### 最小化测试

1. **创建一个简单的测试变更**：
   ```bash
   echo "// test comment" >> README.md
   ```

2. **使用"未提交变更"模式**（最简单）

3. **选择 Claude Code 作为审查平台**

4. **点击"开始真实审查"**

5. **查看日志**：
   - 如果失败，点击"日志"按钮
   - 查找 `review.error` 事件
   - 复制完整的错误信息

### 完整测试流程

```bash
# 1. 验证环境
claude --version
echo $ANTHROPIC_BASE_URL

# 2. 创建测试分支
git checkout -b debug-test
echo "console.log('test');" > test.js
git add test.js
git commit -m "test"

# 3. 在桌面应用中测试
# - 选择"未提交变更"模式
# - 开始审查
# - 查看日志

# 4. 清理
git checkout main
git branch -D debug-test
rm test.js
```

## 获取帮助

如果以上方法都无法解决问题：

1. **收集信息**：
   - Claude Code 版本：`claude --version`
   - 操作系统版本
   - 审查范围配置（分支名称）
   - 完整的错误日志（从"日志"按钮复制）

2. **创建 GitHub Issue**：
   - 仓库：https://github.com/Vac-le/auto-code-review/issues
   - 包含上述所有信息

3. **检查 API 提供商**：
   - 联系 `api.anyint.ai` 确认服务状态
   - 检查配额和限制

## 更新日志

### v0.2.1+ 改进

- ✅ 添加详细的 stderr/stdout 日志
- ✅ 记录错误堆栈追踪
- ✅ review.error 事件包含完整错误信息
- ✅ 桌面应用日志显示更多调试信息
