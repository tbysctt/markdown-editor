import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  shell,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import started from 'electron-squirrel-startup';
import { IPC } from './ipc/channels';

if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let isDocumentDirty = false;
let isQuitting = false;
let pendingCloseResolve: ((value: boolean) => void) | null = null;

const MARKDOWN_FILTERS = [
  { name: 'Markdown', extensions: ['md', 'markdown'] },
];

const IMAGE_FILTERS = [
  { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
];

const getMainWindow = (): BrowserWindow => {
  if (!mainWindow) {
    throw new Error('Main window is not available');
  }
  return mainWindow;
};

const ensureAssetsDir = async (docPath: string): Promise<string> => {
  const assetsDir = path.join(path.dirname(docPath), 'assets');
  await fs.mkdir(assetsDir, { recursive: true });
  return assetsDir;
};

const uniqueAssetName = (fileName: string): string => {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  return `${base}-${Date.now()}${ext}`;
};

const buildMenu = (): Menu => {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => getMainWindow().webContents.send(IPC.MENU_ACTION, 'new'),
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: () => getMainWindow().webContents.send(IPC.MENU_ACTION, 'open'),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => getMainWindow().webContents.send(IPC.MENU_ACTION, 'save'),
        },
        {
          label: 'Save As',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () =>
            getMainWindow().webContents.send(IPC.MENU_ACTION, 'save-as'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
};

const registerIpcHandlers = (): void => {
  ipcMain.handle(IPC.FILE_OPEN, async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openFile'],
      filters: MARKDOWN_FILTERS,
    });

    if (canceled || filePaths.length === 0) {
      return null;
    }

    const filePath = filePaths[0];
    const content = await fs.readFile(filePath, 'utf-8');
    return { path: filePath, content };
  });

  ipcMain.handle(
    IPC.FILE_SAVE,
    async (_event, filePath: string, content: string) => {
      await fs.writeFile(filePath, content, 'utf-8');
    },
  );

  ipcMain.handle(IPC.FILE_SAVE_AS, async (_event, content: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog(getMainWindow(), {
      filters: MARKDOWN_FILTERS,
      defaultPath: 'Untitled.md',
    });

    if (canceled || !filePath) {
      return null;
    }

    await fs.writeFile(filePath, content, 'utf-8');
    return { path: filePath };
  });

  ipcMain.handle(IPC.FILE_OPEN_IMAGE, async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openFile'],
      filters: IMAGE_FILTERS,
    });

    if (canceled || filePaths.length === 0) {
      return null;
    }

    return filePaths[0];
  });

  ipcMain.handle(
    IPC.FILE_COPY_IMAGE,
    async (_event, sourcePath: string, docPath: string) => {
      const assetsDir = await ensureAssetsDir(docPath);
      const fileName = uniqueAssetName(path.basename(sourcePath));
      const destPath = path.join(assetsDir, fileName);
      await fs.copyFile(sourcePath, destPath);
      return { relativePath: `assets/${fileName}` };
    },
  );

  ipcMain.handle(IPC.FILE_STAGE_IMAGE, async (_event, sourcePath: string) => {
    const tempDir = path.join(app.getPath('temp'), 'markdown-editor-assets');
    await fs.mkdir(tempDir, { recursive: true });
    const fileName = uniqueAssetName(path.basename(sourcePath));
    const destPath = path.join(tempDir, fileName);
    await fs.copyFile(sourcePath, destPath);
    return {
      tempPath: destPath,
      relativePath: `assets/${fileName}`,
      fileUrl: pathToFileURL(destPath).href,
    };
  });

  ipcMain.handle(
    IPC.FILE_RESOLVE_ASSET_URL,
    (_event, docPath: string, relativePath: string) => {
      const absolutePath = path.join(path.dirname(docPath), relativePath);
      return pathToFileURL(absolutePath).href;
    },
  );

  ipcMain.handle(
    IPC.FILE_COPY_QUEUED_IMAGES,
    async (
      _event,
      docPath: string,
      images: Array<{ tempPath: string; relativePath: string }>,
    ) => {
      const assetsDir = await ensureAssetsDir(docPath);
      const results: Array<{ tempPath: string; relativePath: string }> = [];

      for (const image of images) {
        const fileName = path.basename(image.relativePath);
        const destPath = path.join(assetsDir, fileName);
        await fs.copyFile(image.tempPath, destPath);
        results.push({
          tempPath: image.tempPath,
          relativePath: `assets/${fileName}`,
        });
      }

      return results;
    },
  );

  ipcMain.on(
    IPC.DOC_DIRTY_CHANGED,
    (_event, payload: { dirty: boolean; title: string }) => {
      isDocumentDirty = payload.dirty;
      getMainWindow().setTitle(payload.title);
    },
  );

  ipcMain.on(IPC.DOC_READY_TO_CLOSE, () => {
    pendingCloseResolve?.(true);
    pendingCloseResolve = null;
  });

  ipcMain.on(IPC.DOC_ABORT_CLOSE, () => {
    pendingCloseResolve?.(false);
    pendingCloseResolve = null;
  });
};

const handleWindowClose = async (): Promise<boolean> => {
  if (!isDocumentDirty) {
    return true;
  }

  const { response } = await dialog.showMessageBox(getMainWindow(), {
    type: 'warning',
    buttons: ['Cancel', "Don't Save", 'Save'],
    defaultId: 2,
    cancelId: 0,
    message: 'Do you want to save changes to this document?',
  });

  if (response === 0) {
    return false;
  }

  if (response === 1) {
    return true;
  }

  return new Promise((resolve) => {
    pendingCloseResolve = resolve;
    getMainWindow().webContents.send(IPC.MENU_ACTION, 'save-and-close');
  });
};

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Markdown Editor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.on('close', async (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    const canClose = await handleWindowClose();
    if (canClose) {
      isQuitting = true;
      mainWindow?.destroy();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', () => {
  Menu.setApplicationMenu(buildMenu());
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    isQuitting = false;
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// Allow opening local asset images in the editor via file:// paths
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
});
