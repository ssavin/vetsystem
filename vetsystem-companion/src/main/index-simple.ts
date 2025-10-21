import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create log file
const logPath = path.join(app.getPath('userData'), 'debug.log');
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(logPath, logMessage);
  } catch (e) {
    console.error('Failed to write log:', e);
  }
  console.log(message);
}

log('=== VetSystem Companion Starting ===');
log('App path: ' + app.getAppPath());
log('__dirname: ' + __dirname);
log('User data: ' + app.getPath('userData'));
log('Log file: ' + logPath);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  log('Creating window...');
  
  try {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      title: 'VetSystem Companion - Debug',
    });

    log('Window created');

    const htmlPath = path.join(__dirname, '../index.html');
    log('HTML path: ' + htmlPath);
    log('HTML exists: ' + fs.existsSync(htmlPath));

    // Listen to webContents events
    mainWindow.webContents.on('did-finish-load', () => {
      log('WebContents: did-finish-load');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      log('WebContents: did-fail-load - ' + errorCode + ' - ' + errorDescription);
    });

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      log('Console [' + level + ']: ' + message);
    });

    mainWindow.loadFile(htmlPath).then(() => {
      log('HTML loaded successfully - calling show()');
      mainWindow?.show();
      log('Window show() called');
      mainWindow?.webContents.openDevTools();
      log('DevTools opened');
      
      // Force window to front
      mainWindow?.focus();
      log('Window focused');
    }).catch((err) => {
      log('ERROR loading HTML: ' + err.message);
      log('Error stack: ' + err.stack);
    });

    mainWindow.on('closed', () => {
      log('Window closed');
      mainWindow = null;
    });

  } catch (error: any) {
    log('ERROR creating window: ' + error.message);
    log('Error stack: ' + error.stack);
  }
}

app.whenReady().then(() => {
  log('App ready');
  createWindow();
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  log('App activated');
  if (mainWindow === null) {
    createWindow();
  }
});

process.on('uncaughtException', (error) => {
  log('UNCAUGHT EXCEPTION: ' + error.message);
  log('Stack: ' + error.stack);
});

process.on('unhandledRejection', (reason: any) => {
  log('UNHANDLED REJECTION: ' + (reason?.message || reason));
  log('Stack: ' + (reason?.stack || ''));
});
