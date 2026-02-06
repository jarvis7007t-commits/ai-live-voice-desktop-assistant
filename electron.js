
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;
let floatingWindow;

const isDev = process.env.ELECTRON_START_URL ? true : false;
const BASE_URL = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'dist/index.html')}`;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Start hidden as per requirements
    title: "Gemini Live Vision - Dashboard",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL(BASE_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createFloatingWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  floatingWindow = new BrowserWindow({
    width: 320,
    height: 100,
    x: screenWidth - 340,
    y: screenHeight - 120,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    skipTaskbar: true, // Professional toolbar behavior
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
    },
  });

  // Load with a query parameter to trigger "Floating Mode" in React
  const floatingUrl = isDev ? `${BASE_URL}?view=floating` : `${BASE_URL}#/?view=floating`;
  floatingWindow.loadURL(floatingUrl);

  floatingWindow.on('closed', () => {
    floatingWindow = null;
    if (mainWindow) mainWindow.close();
  });
}

// IPC Handlers
ipcMain.on('toggle-main-window', () => {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  }
});

ipcMain.on('close-app', () => {
  app.quit();
});

app.whenReady().then(() => {
  createMainWindow();
  createFloatingWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createFloatingWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
