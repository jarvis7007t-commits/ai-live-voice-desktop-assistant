
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;
let videoWindow;

// आपकी Vercel लिंक यहाँ डालें
const VERCEL_URL = 'https://your-vercel-link.vercel.app';

function createMainWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  const winWidth = 320;
  const winHeight = 80;
  const margin = 20;

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: screenWidth - winWidth - margin,
    y: screenHeight - winHeight - margin,
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
      webSecurity: false
    },
  });

  // विंडो को हमेशा ऊपर रखने के लिए (Taskbar के भी ऊपर)
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // डेवलपमेंट में लोकलहोस्ट और प्रोडक्शन में Vercel लिंक लोड करें
  const startUrl = process.env.ELECTRON_START_URL || VERCEL_URL;
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
    width: 800,
    height: 600,
    title: "Gemini Vision Feed",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL || VERCEL_URL;
  videoWindow.loadURL(startUrl);

  videoWindow.on('closed', () => {
    videoWindow = null;
  });
}

// IPC: विंडो साइज बदलना
ipcMain.on('resize-window', (event, expand) => {
  if (mainWindow) {
    const [width] = mainWindow.getSize();
    if (expand) {
      mainWindow.setSize(width, 100, true);
    } else {
      mainWindow.setSize(width, 80, true);
    }
  }
});

// IPC: वीडियो विंडो खोलना
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
