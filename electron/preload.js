
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
    checkForUpdates: (manual = false) => ipcRenderer.send('check-for-updates', manual),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, status) => callback(status))
});
