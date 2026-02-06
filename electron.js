
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;
let videoWindow;

// Configuration for URLs
const ASSISTANT_URL = 'https://my-website.com/assistant';
const VIDEO_URL = 'https://my-website.com/video';

function createMainWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 320,
    height: 60, // Start small
    x: screenWidth - 340,
    y: screenHeight - 100,
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

  // Load the requested website URL directly
  mainWindow.loadURL(ASSISTANT_URL);

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

  // Load the requested video URL directly
  videoWindow.loadURL(VIDEO_URL);

  videoWindow.on('closed', () => {
    videoWindow = null;
  });
}

// Handle window resizing from renderer
ipcMain.on('resize-window', (event, expand) => {
  if (mainWindow) {
    const [width] = mainWindow.getSize();
    if (expand) {
      mainWindow.setSize(width, 100, true);
    } else {
      mainWindow.setSize(width, 60, true);
    }
  }
});

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
