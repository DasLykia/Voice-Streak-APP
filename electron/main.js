
import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import Store from "electron-store";
import electronUpdater from "electron-updater";

// ESM/CommonJS interop for electron-updater
const autoUpdater = electronUpdater.autoUpdater || electronUpdater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the store
const store = new Store();

// --- CONFIGURATION ---
autoUpdater.autoDownload = false; // We want to ask the user first
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = console; // Log to console for debugging

// Global reference
let mainWindow = null;
let isManualCheck = false;

// --- UPDATER EVENT LISTENERS ---

// 1. Checking
autoUpdater.on('checking-for-update', () => {
  console.log('[Updater] Checking for updates...');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', 'checking');
  }
});

// 2. Update Available
autoUpdater.on('update-available', (info) => {
  console.log('[Updater] Update available:', info);
  isManualCheck = false; // Reset flag
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', 'available');
    
    // Show Dialog
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available.\n\nDo you want to download it now?`,
      buttons: ['Yes, Download', 'No, Later'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) {
        console.log('[Updater] User accepted download.');
        autoUpdater.downloadUpdate();
      } else {
        console.log('[Updater] User rejected download.');
      }
    });
  }
});

// 3. Update Not Available
autoUpdater.on('update-not-available', (info) => {
  console.log('[Updater] No update available:', info);
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', 'not-available');
    
    // Only show dialog if user manually clicked the button
    if (isManualCheck) {
      isManualCheck = false;
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'You are up to date',
        message: `VoiceStride ${app.getVersion()} is the latest version.`,
        buttons: ['OK']
      });
    }
  }
});

// 4. Download Progress
autoUpdater.on('download-progress', (progressObj) => {
  console.log(`[Updater] Download progress: ${progressObj.percent}%`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', 'downloading');
  }
});

// 5. Update Downloaded
autoUpdater.on('update-downloaded', (info) => {
  console.log('[Updater] Update downloaded');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', 'downloaded');
    
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Ready to Install',
      message: 'The update has been downloaded. Restart the application now to apply updates?',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  }
});

// 6. Error
autoUpdater.on('error', (err) => {
  console.error('[Updater] Error:', err);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', 'error');
    
    if (isManualCheck) {
      isManualCheck = false;
      dialog.showErrorBox('Update Check Failed', 
        `An error occurred while checking for updates.\n\nPlease check your internet connection.\n\nError: ${err.message || 'Unknown error'}`
      );
    }
  }
});

function createWindow() {
  const defaultBounds = { width: 1200, height: 800 };
  const bounds = store.get("windowBounds", defaultBounds);

  const win = new BrowserWindow({
    ...bounds,
    icon: path.join(__dirname, "../build/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

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

  mainWindow = win;
}

app.whenReady().then(() => {
  createWindow();

  // IPC Handler
  ipcMain.on('check-for-updates', (event, manual) => {
    console.log(`[IPC] Check for updates requested. Manual: ${manual}`);
    isManualCheck = manual === true;

    if (!app.isPackaged) {
      console.log('[Updater] Skipped (Dev Mode)');
      if (isManualCheck) {
        isManualCheck = false;
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Development Mode',
          message: 'Auto-updates are disabled in development mode.\n\nPlease package the application to test updates.',
          buttons: ['OK']
        });
        // Tell UI we are done
        mainWindow.webContents.send('update-status', 'not-available');
      }
      return;
    }

    // Trigger the check
    autoUpdater.checkForUpdates().catch(err => {
      console.error('[Updater] checkForUpdates promise rejected:', err);
      // The 'error' event listener above should catch this, but just in case:
      if (isManualCheck) {
         isManualCheck = false;
         dialog.showErrorBox('Update Error', `Failed to check for updates: ${err.message}`);
         mainWindow.webContents.send('update-status', 'error');
      }
    });
  });
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
