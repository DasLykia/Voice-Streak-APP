import { VelopackApp, UpdateManager } from 'velopack';
import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import Store from "electron-store";
// fs is no longer needed since we removed the manual cleanup hook
// import fs from "fs"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- VELOPACK SETUP ---
// FIXED: Reverted to standard initialization to prevent the "not a function" error.
VelopackApp.build().run();

const updateUrl = 'https://github.com/DasLykia/Voice-Streak-APP/releases/latest/download';

// Initialize the store
const store = new Store();

// Keep a global reference of the window object to send messages
let win;

function createWindow() {
  const defaultBounds = { width: 1200, height: 800 };
  const bounds = store.get("windowBounds", defaultBounds);

  win = new BrowserWindow({
    ...bounds,
    icon: path.join(__dirname, "../build/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"), 
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false 
    },
    autoHideMenuBar: true,
  });

  Menu.setApplicationMenu(null);

  const saveState = () => {
    if (!win.isDestroyed()) {
      store.set("windowBounds", win.getBounds());
    }
  };

  win.on("resize", saveState);
  win.on("move", saveState);
  win.on("close", saveState);
  
  if (!app.isPackaged) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    const indexHtml = path.join(__dirname, "../dist/index.html");
    win.loadFile(indexHtml);
  }

  console.log("Electron window created. Dev mode:", !app.isPackaged);
}

// --- Velopack IPC Handlers ---
ipcMain.handle("velopack:get-version", () => {
    try {
        const um = new UpdateManager(updateUrl);
        const version = um.getCurrentVersion();
        return version || "Dev-Mode"; 
    } catch (e) {
        return `Not Installed`;
    }
});

ipcMain.handle("velopack:check-for-update", async () => {
    try {
        const um = new UpdateManager(updateUrl);
        return await um.checkForUpdatesAsync();
    } catch (e) {
        console.error("Update check failed:", e);
        // Return null to signal "no update found" or "check failed" cleanly
        return null;
    }
});

ipcMain.handle("velopack:download-update", async (event, updateInfo) => {
    const um = new UpdateManager(updateUrl);
    await um.downloadUpdateAsync(updateInfo);
    return true;
});

ipcMain.handle("velopack:apply-update", async (event, updateInfo) => {
    const um = new UpdateManager(updateUrl);
    um.applyUpdateAndRestart(updateInfo);
    return true;
});

// --- Other IPC Handlers ---
ipcMain.on('clear-app-data', () => {
  store.clear();
});

// --- App Events ---
app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});