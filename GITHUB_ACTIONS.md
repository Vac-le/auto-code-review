# GitHub Actions 自动构建说明

## 已设置的工作流

### 1. 自动构建工作流 (`build-desktop.yml`)

**触发条件**：
- 推送代码到 `main` 分支，且修改了 `packages/desktop/` 或 `packages/cli/` 目录
- 创建 Pull Request 到 `main` 分支
- 手动触发（在 GitHub Actions 页面点击 "Run workflow"）

**功能**：
- 自动在 Windows 环境下构建桌面应用
- 生成 `.exe` 安装包
- 将安装包作为 Artifacts 保存 30 天

**如何下载构建结果**：
1. 访问：https://github.com/Vac-le/auto-code-review/actions
2. 点击最新的 "Build Desktop App" 工作流
3. 在底部的 "Artifacts" 区域下载 `windows-installer`

### 2. 发布工作流 (`release.yml`)

**触发条件**：
- 推送版本标签（如 `v0.2.1`）
- 手动触发

**功能**：
- 自动构建 Windows 安装包
- 创建 GitHub Release
- 自动上传安装包到 Release 页面
- 生成发布说明

## 如何创建新版本发布

### 方法 1: 使用 Git 标签（推荐）

```bash
# 1. 确保所有更改已提交
git add .
git commit -m "feat: your changes"

# 2. 创建并推送标签
git tag v0.2.1
git push origin v0.2.1

# 3. GitHub Actions 会自动：
#    - 构建安装包
#    - 创建 Release
#    - 上传安装包
```

### 方法 2: 手动触发

1. 访问：https://github.com/Vac-le/auto-code-review/actions/workflows/release.yml
2. 点击 "Run workflow"
3. 选择分支，点击 "Run workflow"

## 查看构建状态

访问：https://github.com/Vac-le/auto-code-review/actions

你可以看到：
- ✅ 成功的构建
- ❌ 失败的构建
- 🟡 正在运行的构建

点击任意构建可以查看详细日志。

## 下载发布版本

用户可以从以下位置下载正式发布版本：
https://github.com/Vac-le/auto-code-review/releases

## 注意事项

1. **首次构建**：推送工作流文件后，GitHub Actions 会自动运行一次构建
2. **权限**：工作流使用 `GITHUB_TOKEN`，无需额外配置
3. **构建时间**：通常需要 5-10 分钟完成
4. **Artifacts 保留期**：30 天后自动删除

## 测试工作流

现在你可以：

1. 访问 Actions 页面查看首次自动构建
2. 手动触发一次构建测试
3. 或者创建一个测试标签：
   ```bash
   git tag v0.2.1-test
   git push origin v0.2.1-test
   ```

构建完成后，你可以在 Releases 页面看到新版本！
