
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { fileURLToPath } = require('url');

// Handle ES modules __dirname equivalent
const __dirname_dist = path.resolve();

let mainWindow;
let videoWindow;

function createMainWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 320,
    height: 90, // Slightly taller to accommodate the glow/shadows
    x: screenWidth - 340,
    y: screenHeight - 120,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      webSecurity: false // Necessary for local file loading with some API configs
    },
  });

  // Use environment variable for dev, fallback to local file for prod
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname_dist, 'dist/index.html')}`;
  mainWindow.loadURL(startUrl);

  // Allow clicking through transparent areas if needed (optional)
  // mainWindow.setIgnoreMouseEvents(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (videoWindow) videoWindow.close();
  });
}

function createVideoWindow() {
  if (videoWindow) {
    videoWindow.focus();
    return;
  }

  videoWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: "Gemini Vision Feed",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname_dist, 'dist/index.html')}`;
  videoWindow.loadURL(startUrl);

  videoWindow.on('closed', () => {
    videoWindow = null;
  });
}

// IPC: Resizing window dynamically
ipcMain.on('resize-window', (event, expand) => {
  if (mainWindow) {
    const [width] = mainWindow.getSize();
    // Logic to handle expansion if you add sub-menus later
    if (expand) {
      mainWindow.setSize(width, 120, true);
    } else {
      mainWindow.setSize(width, 90, true);
    }
  }
});

// IPC: Toggle Video Window
ipcMain.on('open-video-window', () => {
  createVideoWindow();
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
