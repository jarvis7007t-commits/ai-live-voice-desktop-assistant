
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, shell, desktopCapturer } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

// --- Native PowerShell Automation Bridge ---
const runPowerShell = (script) => {
  return new Promise((resolve, reject) => {
    const command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; ${script}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`PowerShell Error: ${error.message}`);
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
};

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
  const winWidth = 400;
  const winHeight = 120;
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
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  const startUrl = process.env.ELECTRON_START_URL || VERCEL_URL;
  mainWindow.loadURL(startUrl);
  
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'display-capture', 'mediaKeySystem'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// --- Automation IPC Handlers ---
ipcMain.handle('automation:move', async (event, { x, y }) => {
  console.log(`Automation: Moving mouse to ${x}, ${y}`);
  try {
    await runPowerShell(`[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(x)}, ${Math.round(y)})`);
    return "ok";
  } catch (e) {
    return `error: ${e.message}`;
  }
});

ipcMain.handle('automation:click', async (event, { button, double }) => {
  console.log(`Automation: Clicking ${button}`);
  try {
    const clickCode = button === 'right' ? '0x0008 | 0x0010' : '0x0002 | 0x0004';
    const script = `
      $signature = '[DllImport(\"user32.dll\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);';
      $type = Add-Type -MemberDefinition $signature -Name \"Win32MouseEvent\" -Namespace \"Win32Functions\" -PassThru;
      $type::mouse_event(${clickCode}, 0, 0, 0, 0);
      ${double ? `Start-Sleep -Milliseconds 100; $type::mouse_event(${clickCode}, 0, 0, 0, 0);` : ''}
    `;
    await runPowerShell(script);
    return "ok";
  } catch (e) {
    return `error: ${e.message}`;
  }
});

ipcMain.handle('automation:type', async (event, { text }) => {
  console.log(`Automation: Typing "${text}"`);
  try {
    // Escape special characters for SendKeys
    const escapedText = text.replace(/([+^%~{}()\[\]])/g, '{$1}');
    await runPowerShell(`[System.Windows.Forms.SendKeys]::SendWait('${escapedText}')`);
    return "ok";
  } catch (e) {
    return `error: ${e.message}`;
  }
});

ipcMain.handle('automation:scroll', async (event, { direction, amount }) => {
  console.log(`Automation: Scrolling ${direction}`);
  try {
    const scrollAmount = direction === 'up' ? amount : -amount;
    const script = `
      $signature = '[DllImport(\"user32.dll\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);';
      $type = Add-Type -MemberDefinition $signature -Name \"Win32ScrollEvent\" -Namespace \"Win32Functions\" -PassThru;
      $type::mouse_event(0x0800, 0, 0, ${scrollAmount}, 0);
    `;
    await runPowerShell(script);
    return "ok";
  } catch (e) {
    return `error: ${e.message}`;
  }
});

ipcMain.handle('automation:open_url', (event, { url }) => {
  console.log(`Automation: Opening URL ${url}`);
  if (url) {
    shell.openExternal(url);
  }
  return "ok";
});

ipcMain.handle('automation:system_power', (event, { action }) => {
  console.log(`Automation: System Power Action ${action}`);
  if (action === 'shutdown') {
    exec('shutdown /s /t 0');
  } else if (action === 'restart') {
    exec('shutdown /r /t 0');
  }
  return "ok";
});

ipcMain.handle('automation:get_screen_source', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
  // Return the ID of the primary screen
  return sources[0]?.id;
});

ipcMain.handle('automation:open_app', (event, { name }) => {
  console.log(`Automation: Opening app ${name}`);
  // Try to open via start command (Windows)
  exec(`start "" "${name}"`, (err) => {
    if (err) {
      // Fallback for common apps if simple start fails
      if (name.toLowerCase().includes('code') || name.toLowerCase().includes('vs code')) {
        exec('code .');
      } else if (name.toLowerCase().includes('whatsapp')) {
        exec('start whatsapp:');
      }
    }
  });
  return "ok";
});

ipcMain.handle('automation:press_key', async (event, { key }) => {
  console.log(`Automation: Pressing key ${key}`);
  try {
    const keyMap = {
      'enter': '{ENTER}',
      'tab': '{TAB}',
      'escape': '{ESC}',
      'esc': '{ESC}',
      'backspace': '{BACKSPACE}',
      'up': '{UP}',
      'down': '{DOWN}',
      'left': '{LEFT}',
      'right': '{RIGHT}',
      'space': ' '
    };
    const sendKey = keyMap[key.toLowerCase()] || key;
    await runPowerShell(`[System.Windows.Forms.SendKeys]::SendWait('${sendKey}')`);
    return "ok";
  } catch (e) {
    return `error: ${e.message}`;
  }
});

ipcMain.handle('automation:manage_file', (event, { action, filePath, content }) => {
  console.log(`Automation: File ${action} on ${filePath}`);
  try {
    if (action === 'create' || action === 'write') {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, content || '');
    } else if (action === 'delete') {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    return "ok";
  } catch (e) {
    return `error: ${e.message}`;
  }
});

ipcMain.on('resize-window', (event, expand) => {
  if (mainWindow) {
    if (expand) {
      mainWindow.setSize(450, 650);
      mainWindow.setResizable(true);
    } else {
      mainWindow.setSize(400, 120);
      mainWindow.setResizable(false);
    }
    mainWindow.center();
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
