
import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import Store from "electron-store";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the store
const store = new Store();

// Configure Auto Updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
// Enable logging to console for debugging
autoUpdater.logger = console;

let mainWindow;
let isManualUpdateCheck = false;

function createWindow() {
  // 1. Get saved bounds or default to 1200x800
  const defaultBounds = { width: 1200, height: 800 };
  const bounds = store.get("windowBounds", defaultBounds);

  const win = new BrowserWindow({
    // 2. Apply saved bounds (width, height, x, y)
    ...bounds,
    // 3. Set the window icon (This path assumes 'build/icon.ico' exists in project root)
    icon: path.join(__dirname, "../build/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 4. Save window state on resize or move
  const saveState = () => {
    if (!win.isDestroyed()) {
      store.set("windowBounds", win.getBounds());
    }
  };

  // Debounce could be added here for performance, but for simple apps this is fine
  win.on("resize", saveState);
  win.on("move", saveState);
  win.on("close", saveState);

  if (!app.isPackaged) {
    // DEV mode
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    // PRODUCTION mode
    const indexHtml = path.join(__dirname, "../dist/index.html");
    win.loadFile(indexHtml);
  }

  mainWindow = win;
  console.log("Electron window created. Dev mode:", !app.isPackaged);
}

app.whenReady().then(() => {
  createWindow();

  // Updater IPC
  ipcMain.on('check-for-updates', (event, manual) => {
    isManualUpdateCheck = manual === true;
    
    if (app.isPackaged) {
      console.log('Checking for updates... Manual:', isManualUpdateCheck);
      autoUpdater.checkForUpdates();
    } else {
      console.log('Update check skipped (not packaged)');
      if (isManualUpdateCheck) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Development Mode',
          message: 'Update functionality is disabled in development mode. Package the app to test updates.'
        });
      }
    }
  });
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* --- Auto Updater Events --- */

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available. Do you want to download it now?`,
    buttons: ['Yes', 'No']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
  isManualUpdateCheck = false;
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
  if (isManualUpdateCheck) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'No Updates',
      message: 'You are currently running the latest version.',
    });
    isManualUpdateCheck = false;
  }
});

autoUpdater.on('update-downloaded', () => {
  console.log('Update downloaded');
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded. Restart the application to apply updates?',
    buttons: ['Restart', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
  // Always show error dialog so the user knows why it failed
  dialog.showErrorBox('Update Error', 'Failed to check for updates.\n\n' + (err.message || err.toString()));
  isManualUpdateCheck = false;
});
