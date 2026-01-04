
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
    checkForUpdates: () => ipcRenderer.send('check-for-updates')
});
