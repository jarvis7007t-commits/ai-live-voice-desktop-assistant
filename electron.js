
const { app, BrowserWindow, ipcMain, screen, Tray, Menu } = require('electron');
const path = require('path');

// NOTE: In a real production environment, you would: npm install robotjs
// For this implementation, we use a try-catch to handle environments where native modules might be restricted.
let robot;
try {
  robot = require('robotjs');
} catch (e) {
  console.warn("RobotJS not found. Automation will be logged but not executed.");
}

let mainWindow;
let videoWindow;
let tray = null;
let isQuiting = false;

const VERCEL_URL = 'https://your-vercel-link.vercel.app';

function createTray() {
  const iconPath = path.join(__dirname, 'icon.ico');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Assistant', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: 'Quit Entirely', click: () => { isQuiting = true; app.quit(); } }
  ]);

  tray.setToolTip('Lumina AI Assistant');
  tray.setContextMenu(contextMenu);
}

function createMainWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const winWidth = 360;
  const winHeight = 100;
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
  });
}

// --- Automation IPC Handlers ---
ipcMain.handle('automation:move', (event, { x, y }) => {
  console.log(`Automation: Moving mouse to ${x}, ${y}`);
  if (robot) {
    const { width, height } = screen.getPrimaryDisplay().size;
    // Map normalized 0-1000 coordinates if Gemini uses them, or use absolute
    robot.moveMouse(x, y);
  }
  return "ok";
});

ipcMain.handle('automation:click', (event, { button, double }) => {
  console.log(`Automation: Clicking ${button}`);
  if (robot) {
    robot.mouseClick(button || 'left', double || false);
  }
  return "ok";
});

ipcMain.handle('automation:type', (event, { text }) => {
  console.log(`Automation: Typing "${text}"`);
  if (robot) {
    robot.typeString(text);
  }
  return "ok";
});

ipcMain.handle('automation:scroll', (event, { direction, amount }) => {
  console.log(`Automation: Scrolling ${direction}`);
  if (robot) {
    // robotjs scroll direction is y, x. y is up/down.
    robot.scrollMouse(0, direction === 'up' ? amount : -amount);
  }
  return "ok";
});

ipcMain.on('resize-window', (event, expand) => {
  if (mainWindow) {
    const [width] = mainWindow.getSize();
    mainWindow.setSize(width, expand ? 100 : 80, true);
  }
});

ipcMain.on('open-video-window', () => {
  if (!videoWindow) {
    videoWindow = new BrowserWindow({
      width: 640, height: 480,
      autoHideMenuBar: true,
      backgroundColor: '#000000',
      webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    const baseAppUrl = process.env.ELECTRON_START_URL || VERCEL_URL;
    videoWindow.loadURL(`${baseAppUrl}?view=camera`);
    videoWindow.on('closed', () => { videoWindow = null; });
  }
});

app.whenReady().then(() => {
  createMainWindow();
  createTray();
});
