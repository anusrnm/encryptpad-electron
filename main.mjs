import { app, BrowserWindow, ipcMain, dialog, Menu, nativeTheme } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

let mainWindow;

const isMac = process.platform === 'darwin';

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(process.cwd(), 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const startUrl = url.pathToFileURL(path.join(process.cwd(), 'index.html')).href;
  await mainWindow.loadURL(startUrl);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('action:new') },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('action:open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('action:save') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('action:saveAs') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          { label: 'Speech', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] }
        ] : [
          { role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }
        ])
      ]
    },
    {
      label: 'Crypto',
      submenu: [
        { label: 'Encrypt', accelerator: 'CmdOrCtrl+E', click: () => mainWindow.webContents.send('action:encrypt') },
        { label: 'Decrypt', accelerator: 'CmdOrCtrl+D', click: () => mainWindow.webContents.send('action:decrypt') },
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      role: 'window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await import('node:child_process').then(({ exec }) => exec(process.platform === 'win32' ? 'start https://www.electronjs.org' : process.platform === 'darwin' ? 'open https://www.electronjs.org' : 'xdg-open https://www.electronjs.org'));
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC: file operations
ipcMain.handle('file:open', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text/PGP', extensions: ['txt', 'md', 'asc', 'pgp', 'gpg'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (canceled || !filePaths[0]) return { canceled: true };
  const filePath = filePaths[0];
  const content = await readFile(filePath, 'utf8');
  return { canceled: false, filePath, content };
});

ipcMain.handle('file:save', async (_, { content, filePath }) => {
  let target = filePath;
  if (!target) {
    const { canceled, filePath: chosen } = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'Text', extensions: ['txt', 'md'] },
        { name: 'PGP Armor', extensions: ['asc'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (canceled || !chosen) return { canceled: true };
    target = chosen;
  }
  await writeFile(target, content, 'utf8');
  return { canceled: false, filePath: target };
});

ipcMain.handle('app:theme', () => {
  return { shouldUseDarkColors: nativeTheme.shouldUseDarkColors };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
