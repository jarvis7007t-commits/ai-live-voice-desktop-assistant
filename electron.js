
const { app, BrowserWindow, ipcMain, screen, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;
let videoWindow;
let tray = null;
let isQuiting = false;

// Update this to your deployed URL if not running locally
const VERCEL_URL = 'http://localhost:3000';

function createTray() {
  const iconPath = path.join(__dirname, 'icon.ico');
  // If icon doesn't exist, this might fail, using a placeholder check or try/catch is safer in production
  try {
    tray = new Tray(iconPath);
  } catch (e) {
    console.warn("Tray icon not found, skipping tray creation.");
    return;
  }
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show Assistant', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      } 
    },
    { type: 'separator' },
    { 
      label: 'Quit Entirely', 
      click: () => {
        isQuiting = true;
        app.quit();
      } 
    }
  ]);

  tray.setToolTip('Gemini Live Assistant');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) mainWindow.show();
  });
}

function createMainWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  const winWidth = 400;
  const winHeight = 100;
  const margin = 30;

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
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      webSecurity: false
    },
  });

  // Level 'screen-saver' keeps it above almost everything
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  const startUrl = process.env.ELECTRON_START_URL || VERCEL_URL;
  mainWindow.loadURL(startUrl);

  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

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
    title: "Live Vision Feed",
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const baseAppUrl = process.env.ELECTRON_START_URL || VERCEL_URL;
  const videoUrl = baseAppUrl.includes('?') ? `${baseAppUrl}&view=camera` : `${baseAppUrl}?view=camera`;
  
  videoWindow.loadURL(videoUrl);

  videoWindow.on('closed', () => {
    videoWindow = null;
  });
}

ipcMain.on('resize-window', (event, expand) => {
  if (mainWindow) {
    const [width] = mainWindow.getSize();
    // Providing a bit more vertical space for glows and animations when connected
    if (expand) {
      mainWindow.setSize(width, 120, true);
    } else {
      mainWindow.setSize(width, 100, true);
    }
  }
});

ipcMain.on('open-video-window', () => {
  createVideoWindow();
});

app.whenReady().then(() => {
  createMainWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else mainWindow.show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // App stays in tray
  }
});

app.on('before-quit', () => {
  isQuiting = true;
});
