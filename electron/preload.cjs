const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("velopackApi", {
    getVersion: () => ipcRenderer.invoke("velopack:get-version"),
    checkForUpdates: () => ipcRenderer.invoke("velopack:check-for-update"),
    downloadUpdates: (updateInfo) => ipcRenderer.invoke("velopack:download-update", updateInfo),
    applyUpdates: (updateInfo) => ipcRenderer.invoke("velopack:apply-update", updateInfo),
    clearAppData: () => ipcRenderer.send('clear-app-data'),
});