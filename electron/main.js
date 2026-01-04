import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import Store from "electron-store";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the store
const store = new Store();

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

  console.log("Electron window created. Dev mode:", !app.isPackaged);
}

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});