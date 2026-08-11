const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("autoCodeReviewDesktop", Object.freeze({
  getState: () => ipcRenderer.invoke("desktop:get-state"),
  selectRepository: () => ipcRenderer.invoke("desktop:select-repository"),
  openRecentRepository: (path) => ipcRenderer.invoke("desktop:open-recent-repository", path),
  showProjectPicker: () => ipcRenderer.invoke("desktop:show-project-picker"),
  openLogs: () => ipcRenderer.invoke("desktop:open-logs"),
  quit: () => ipcRenderer.invoke("desktop:quit"),
}));
