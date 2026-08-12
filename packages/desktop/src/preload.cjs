const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("autoCodeReviewDesktop", Object.freeze({
  getState: () => ipcRenderer.invoke("desktop:get-state"),
  selectRepository: () => ipcRenderer.invoke("desktop:select-repository"),
  openRecentRepository: (path) => ipcRenderer.invoke("desktop:open-recent-repository", path),
  toggleFavorite: (path) => ipcRenderer.invoke("desktop:toggle-favorite", path),
  showProjectPicker: () => ipcRenderer.invoke("desktop:show-project-picker"),
  openRepository: () => ipcRenderer.invoke("desktop:open-repository"),
  openSource: (file) => ipcRenderer.invoke("desktop:open-source", file),
  checkUpdates: () => ipcRenderer.invoke("desktop:check-updates"),
  openReleases: () => ipcRenderer.invoke("desktop:open-releases"),
  getLogs: () => ipcRenderer.invoke("desktop:get-logs"),
  onShowLogs: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = () => callback();
    ipcRenderer.on("desktop:show-logs", listener);
    return () => ipcRenderer.removeListener("desktop:show-logs", listener);
  },
  quit: () => ipcRenderer.invoke("desktop:quit"),
}));
