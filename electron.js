
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;
let videoWindow;

function createMainWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 320,
    height: 100,
    x: screenWidth - 340,
    y: screenHeight - 120,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    },
  });

  // In production, we would load the built index.html
  // For development, we load the dev server URL
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, './dist/index.html')}`;
  mainWindow.loadURL(startUrl);

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
    width: 640,
    height: 480,
    title: "Gemini Vision Feed",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, './dist/index.html#video')}`;
  videoWindow.loadURL(startUrl);

  videoWindow.on('closed', () => {
    videoWindow = null;
  });
}

// Handle video window requests from renderer
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
