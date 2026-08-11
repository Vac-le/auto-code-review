import { once } from "node:events";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, shell, Tray } from "electron";
import { createDashboardServer } from "@auto-code-review/cli/dist/ui.js";
import { createLogger } from "./logger.mjs";
import { isAllowedDesktopPage } from "./security.mjs";
import { readSettings, rememberRepository, writeSettings } from "./settings.mjs";

const sourceDirectory = fileURLToPath(new URL(".", import.meta.url));
const welcomePath = join(sourceDirectory, "welcome.html");
const welcomeUrl = pathToFileURL(welcomePath).href;
const iconPath = join(sourceDirectory, "..", "assets", "icon.png");

app.enableSandbox();
app.setAppUserModelId("dev.autocodereview.desktop");

let mainWindow = null;
let tray = null;
let dashboard = null;
let quitting = false;
let settingsPath = "";
let logsDirectory = "";
let settings = { lastRepository: null, recentRepositories: [] };
let log = () => {};

function desktopState() {
  return {
    activeRepository: dashboard?.repositoryRoot ?? null,
    recentRepositories: settings.recentRepositories,
    version: app.getVersion(),
  };
}

function senderIsMainWindow(event) {
  if (!mainWindow || event.sender.id !== mainWindow.webContents.id || event.senderFrame !== mainWindow.webContents.mainFrame) return false;
  return isAllowedPage(event.senderFrame.url);
}

function isAllowedPage(value) {
  return isAllowedDesktopPage(value, welcomeUrl, dashboard?.baseUrl ?? null);
}

function requireTrustedSender(event) {
  if (!senderIsMainWindow(event)) throw new Error("Desktop request rejected.");
}

async function stopDashboard() {
  if (!dashboard) return;
  const current = dashboard;
  dashboard = null;
  await current.shutdown();
  log("dashboard.stopped");
}

async function startRepository(repositoryPath) {
  await stopDashboard();
  let created;
  try {
    created = createDashboardServer({ cwd: repositoryPath, port: 0, open: false }, {
      onEvent: (event, detail) => log(`review.${event}`, JSON.stringify(detail)),
    });
    created.server.listen(0, "127.0.0.1");
    await once(created.server, "listening");
  } catch (error) {
    if (created?.server.listening) created.server.close();
    log("dashboard.failed", error instanceof Error ? error.message : error);
    throw error;
  }
  const address = created.server.address();
  if (!address || typeof address === "string") throw new Error("Unable to determine the local dashboard address.");
  dashboard = {
    ...created,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
  settings = rememberRepository(settings, created.repositoryRoot);
  writeSettings(settingsPath, settings);
  log("dashboard.started", created.repositoryRoot);
  await mainWindow.loadURL(`${dashboard.baseUrl}/#token=${created.token}`);
  mainWindow.setTitle(`Auto Code Review — ${created.repositoryRoot.split(/[\\/]/).pop()}`);
  updateTrayMenu();
  return desktopState();
}

async function showProjectPicker() {
  await stopDashboard();
  await mainWindow.loadFile(welcomePath);
  mainWindow.setTitle("Auto Code Review");
  updateTrayMenu();
  return desktopState();
}

async function selectRepository() {
  const selection = await dialog.showOpenDialog(mainWindow, {
    title: "选择需要审查的 Git 仓库",
    buttonLabel: "打开仓库",
    properties: ["openDirectory"],
  });
  if (selection.canceled || selection.filePaths.length === 0) return { cancelled: true };
  try {
    return { cancelled: false, state: await startRepository(selection.filePaths[0]) };
  } catch (error) {
    await dialog.showMessageBox(mainWindow, {
      type: "error",
      title: "无法打开仓库",
      message: "请选择一个有效的 Git 仓库。",
      detail: error instanceof Error ? error.message : String(error),
    });
    return { cancelled: true, error: "invalid-repository" };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 900,
    minHeight: 680,
    show: true,
    backgroundColor: "#f3f1eb",
    icon: existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(sourceDirectory, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("did-fail-load", (_event, code, description) => log("window.load-failed", `${code} ${description}`));
  mainWindow.webContents.on("render-process-gone", (_event, detail) => log("window.renderer-gone", detail.reason));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedPage(url)) event.preventDefault();
  });
  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  mainWindow.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  log("window.created");
}

function trayIcon() {
  if (existsSync(iconPath)) return nativeImage.createFromPath(iconPath).resize({ width: 20, height: 20 });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g fill="none" stroke-linecap="round"><path d="M6 27 14.5 4.5" stroke="#191916" stroke-width="3.5"/><path d="m26 27-8.5-22.5" stroke="#191916" stroke-width="3.5"/><path d="m9.25 19 13.75-6" stroke="#5b4be7" stroke-width="3.5"/></g><circle cx="26.25" cy="27" r="3" fill="#3f7955"/></svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}

function updateTrayMenu() {
  if (!tray) return;
  tray.setToolTip(dashboard ? `Auto Code Review — ${dashboard.repositoryRoot}` : "Auto Code Review");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "显示 Auto Code Review", click: () => { mainWindow.show(); mainWindow.focus(); } },
    { label: "选择仓库…", click: async () => { mainWindow.show(); await selectRepository(); } },
    { label: "打开日志目录", click: () => void shell.openPath(logsDirectory) },
    { type: "separator" },
    { label: "退出", click: () => { quitting = true; app.quit(); } },
  ]));
}

function registerIpc() {
  ipcMain.handle("desktop:get-state", (event) => { requireTrustedSender(event); return desktopState(); });
  ipcMain.handle("desktop:select-repository", async (event) => { requireTrustedSender(event); return selectRepository(); });
  ipcMain.handle("desktop:open-recent-repository", async (event, repositoryPath) => {
    requireTrustedSender(event);
    if (typeof repositoryPath !== "string" || !settings.recentRepositories.includes(repositoryPath)) throw new Error("Unknown recent repository.");
    try { return await startRepository(repositoryPath); }
    catch (error) {
      await dialog.showMessageBox(mainWindow, {
        type: "error",
        title: "无法打开仓库",
        message: "这个最近使用的仓库已无法打开。",
        detail: error instanceof Error ? error.message : String(error),
      });
      return showProjectPicker();
    }
  });
  ipcMain.handle("desktop:show-project-picker", async (event) => { requireTrustedSender(event); return showProjectPicker(); });
  ipcMain.handle("desktop:open-logs", async (event) => { requireTrustedSender(event); return shell.openPath(logsDirectory); });
  ipcMain.handle("desktop:quit", (event) => { requireTrustedSender(event); quitting = true; app.quit(); });
}

async function boot() {
  settingsPath = join(app.getPath("userData"), "desktop-settings.json");
  logsDirectory = join(app.getPath("userData"), "logs");
  log = createLogger(join(logsDirectory, "desktop.log"));
  settings = readSettings(settingsPath);
  log("app.started", app.getVersion());
  createWindow();
  registerIpc();
  tray = new Tray(trayIcon());
  tray.on("double-click", () => { mainWindow.show(); mainWindow.focus(); });
  updateTrayMenu();

  if (settings.lastRepository && existsSync(settings.lastRepository)) {
    try { await startRepository(settings.lastRepository); }
    catch { await showProjectPicker(); }
  } else await showProjectPicker();
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();
else {
  app.on("second-instance", () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
  app.whenReady().then(boot).catch((error) => {
    log("app.failed", error instanceof Error ? error.message : error);
    dialog.showErrorBox("Auto Code Review", error instanceof Error ? error.message : String(error));
    quitting = true;
    app.quit();
  });
}

app.on("activate", () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
app.on("before-quit", () => { quitting = true; });
app.on("will-quit", () => { if (dashboard) void dashboard.shutdown(); log("app.stopped"); });
