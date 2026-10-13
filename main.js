// Reactor Studio — Mac app shell. The editor itself is app/index.html; this file just gives it a window,
// a Dock icon, a Mac menu bar and native Save dialogs.
const { app, BrowserWindow, protocol, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, 'app');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

// app://reactor/… serves the files inside the app. A real (secure) origin keeps saved projects, audio worklets
// and the speech-recognition worker working exactly like they do in the browser.
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } }]);

let win = null, lastDir = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 680,
    title: 'Reactor Studio', backgroundColor: '#7b7b7b', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, backgroundThrottling: false, spellcheck: false },
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL('app://reactor/index.html');
  // links to other sites open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.on('closed', () => { win = null; });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  // Keyboard shortcuts like ⌘S, ⌘Z, ⌘M and ⌘N are handled by the editor itself, so they are not claimed here.
  const template = [
    ...(isMac ? [{ label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'services' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] }] : []),
    { label: 'Edit', submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'togglefullscreen' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }] },
    { label: 'Window', submenu: [{ label: 'Minimize', click: () => win && win.minimize() }, { role: 'zoom' }, ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }])] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  protocol.handle('app', async (req) => {
    const u = new URL(req.url); let p = decodeURIComponent(u.pathname); if (p === '/' || !p) p = '/index.html';
    const file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT)) return new Response('Not found', { status: 404 });
    try { const data = await fs.promises.readFile(file); return new Response(data, { headers: { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } }); }
    catch (e) { return new Response('Not found', { status: 404 }); }
  });

  // native Save dialog for renders, WAVs, snapshots, captions and project files
  ipcMain.handle('save-file', async (_e, filename, data) => {
    const ext = path.extname(filename).toLowerCase();
    const base = lastDir || app.getPath(['.mp4', '.webm', '.mov', '.wav', '.png'].includes(ext) ? 'videos' : 'documents');
    const { canceled, filePath } = await dialog.showSaveDialog(win, { defaultPath: path.join(base, filename) });
    if (canceled || !filePath) return { ok: false };
    await fs.promises.writeFile(filePath, Buffer.from(data));
    lastDir = path.dirname(filePath);
    return { ok: true, path: filePath };
  });
  ipcMain.handle('reveal', (_e, p) => { if (p) shell.showItemInFolder(p); });
  ipcMain.handle('open-path', (_e, p) => (p ? shell.openPath(p) : ''));

  buildMenu();
  createWindow();
  app.on('activate', () => { if (!win) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
