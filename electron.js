
const { app, BrowserWindow, ipcMain, screen, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;
let videoWindow;
let tray = null;
let isQuiting = false;

// आपकी Vercel लिंक (बिल्ड के बाद इसे अपने Vercel URL से बदलें)
const VERCEL_URL = 'https://your-vercel-link.vercel.app';

function createTray() {
  const iconPath = path.join(__dirname, 'icon.ico');
  tray = new Tray(iconPath);
  
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

  tray.setToolTip('My Floating AI Assistant');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) mainWindow.show();
  });
}

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
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      webSecurity: false
    },
  });

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
    title: "Live Camera Feed",
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const baseAppUrl = process.env.ELECTRON_START_URL || VERCEL_URL;
  // हम एक क्वेरी पैरामीटर भेज रहे हैं ताकि App.tsx समझ सके कि इसे केवल कैमरा दिखाना है
  const videoUrl = baseAppUrl.includes('?') ? `${baseAppUrl}&view=camera` : `${baseAppUrl}?view=camera`;
  
  videoWindow.loadURL(videoUrl);

  videoWindow.on('closed', () => {
    videoWindow = null;
  });
}

function setupAutostart() {
  // डेवलपमेंट के दौरान इसे स्किप किया जा सकता है
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe')
    });
  }
}

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

ipcMain.on('open-video-window', () => {
  createVideoWindow();
});

app.whenReady().then(() => {
  createMainWindow();
  createTray();
  setupAutostart();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else mainWindow.show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // ऐप ट्रे में चलता रहेगा
  }
});

app.on('before-quit', () => {
  isQuiting = true;
});
