import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  net,
  protocol,
  shell,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import started from 'electron-squirrel-startup';
import { IPC } from './ipc/channels';
import type { DiscardChoice, DeleteConfirmChoice, WindowMode } from './ipc/channels';
import { readDirectoryTree } from './main/folderTree';
import {
  startFolderWatch,
  stopFolderWatch,
  suppressPathForWatch,
  broadcastFolderRenamed,
} from './main/folderWatcher';
import {
  createFolder,
  createMarkdownFile,
  deleteEntry,
  renameEntry,
  renamePath,
} from './main/folderOperations';
import packageJson from '../package.json';
import { APP_NAME } from './shared/appMeta';

if (started) {
  app.quit();
}

if (process.platform === 'darwin') {
  app.setName(APP_NAME);
}

const pendingOpenPaths: string[] = [];

interface WindowState {
  window: BrowserWindow;
  isDirty: boolean;
  hasDocument: boolean;
  mode: WindowMode;
}

interface InitialDocument {
  path: string;
  content: string;
}

interface InitialFolder {
  rootPath: string;
}

interface CreateWindowOptions {
  initialDocument?: InitialDocument;
  initialFolder?: InitialFolder;
  startUntitled?: boolean;
}

const windows = new Map<number, WindowState>();
const pendingCloseResolves = new Map<number, (value: boolean) => void>();
let isQuitting = false;

const MARKDOWN_FILTERS = [
  { name: 'Markdown', extensions: ['md', 'markdown'] },
];

const PDF_FILTERS = [{ name: 'PDF', extensions: ['pdf'] }];

const IMAGE_FILTERS = [
  { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
];

const ASSETS_DIR_NAME = 'assets';
const ASSET_PROTOCOL = 'notebook-asset';

protocol.registerSchemesAsPrivileged([
  {
    scheme: ASSET_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const toAssetProtocolUrl = (absolutePath: string): string =>
  `${ASSET_PROTOCOL}://asset/${encodeURIComponent(absolutePath)}`;

const registerAssetProtocol = (): void => {
  protocol.handle(ASSET_PROTOCOL, (request) => {
    const parsed = new URL(request.url);
    const absolutePath = decodeURIComponent(parsed.pathname.slice(1));
    return net.fetch(pathToFileURL(absolutePath).href);
  });
};

const getFocusedWindow = (): BrowserWindow => {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused) {
    return focused;
  }

  const firstWindow = BrowserWindow.getAllWindows()[0];
  if (firstWindow) {
    return firstWindow;
  }

  throw new Error('No window is available');
};

const getWindowFromSender = (
  sender: Electron.WebContents,
): BrowserWindow | null => BrowserWindow.fromWebContents(sender);

const getWindowState = (window: BrowserWindow): WindowState | undefined =>
  windows.get(window.id);

const sendMenuAction = (action: string): void => {
  getFocusedWindow().webContents.send(IPC.MENU_ACTION, action);
};

const ensureAssetsDir = async (docPath: string): Promise<string> => {
  const assetsDir = path.join(path.dirname(docPath), ASSETS_DIR_NAME);
  await fs.mkdir(assetsDir, { recursive: true });
  return assetsDir;
};

const assetsRelativePath = (fileName: string): string =>
  `${ASSETS_DIR_NAME}/${fileName}`;

const pastedImageFileName = (): string => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');

  return `Pasted image ${timestamp}.png`;
};

const uniqueAssetName = (fileName: string): string => {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  return `${base}-${Date.now()}${ext}`;
};

const renderPrintableDocument = async (
  html: string,
): Promise<BrowserWindow> => {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await printWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
  );

  return printWindow;
};

const showDiscardDialog = async (
  parentWindow: BrowserWindow,
): Promise<DiscardChoice> => {
  const { response } = await dialog.showMessageBox(parentWindow, {
    type: 'warning',
    buttons: ['Cancel', "Don't Save", 'Save'],
    defaultId: 2,
    cancelId: 0,
    message: 'Do you want to save changes to this document?',
  });

  if (response === 0) {
    return 'cancel';
  }

  if (response === 1) {
    return 'discard';
  }

  return 'save';
};

const handleFileNew = (): void => {
  createWindow({ startUntitled: true });
};

const handleFileOpen = async (): Promise<void> => {
  const focusedWindow = getFocusedWindow();

  const { canceled, filePaths } = await dialog.showOpenDialog(focusedWindow, {
    properties: ['openFile'],
    filters: MARKDOWN_FILTERS,
  });

  if (canceled || filePaths.length === 0) {
    return;
  }

  const filePath = filePaths[0];
  const content = await fs.readFile(filePath, 'utf-8');
  const document: InitialDocument = { path: filePath, content };

  focusedWindow.webContents.send(IPC.WINDOW_OPEN_DOCUMENT, document);
};

const isMarkdownPath = (filePath: string): boolean => {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.md' || ext === '.markdown';
};

const getLaunchMarkdownPaths = (): string[] => {
  const seen = new Set<string>();
  const paths: string[] = [];

  for (const arg of process.argv.slice(1)) {
    if (arg.startsWith('-') || seen.has(arg) || !isMarkdownPath(arg)) {
      continue;
    }

    const resolvedPath = path.resolve(arg);
    seen.add(resolvedPath);
    paths.push(resolvedPath);
  }

  return paths;
};

const openMarkdownPath = async (filePath: string): Promise<void> => {
  let content: string;

  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    return;
  }

  const document: InitialDocument = { path: filePath, content };
  const allWindows = BrowserWindow.getAllWindows();

  if (allWindows.length === 0) {
    createWindow({ initialDocument: document });
    return;
  }

  const focusedWindow = BrowserWindow.getFocusedWindow() ?? allWindows[0];
  const state = getWindowState(focusedWindow);

  if (state && !state.hasDocument) {
    focusedWindow.webContents.send(IPC.WINDOW_OPEN_DOCUMENT, document);
    return;
  }

  createWindow({ initialDocument: document });
};

const handleFolderOpen = async (): Promise<void> => {
  const focusedWindow = getFocusedWindow();
  const state = getWindowState(focusedWindow);

  const { canceled, filePaths } = await dialog.showOpenDialog(focusedWindow, {
    properties: ['openDirectory'],
  });

  if (canceled || filePaths.length === 0) {
    return;
  }

  const rootPath = filePaths[0];

  if (state?.hasDocument) {
    createWindow({ initialFolder: { rootPath } });
    return;
  }

  focusedWindow.webContents.send(IPC.WINDOW_OPEN_FOLDER, { rootPath });
};

const buildMenu = (): Menu => {
  const isMac = process.platform === 'darwin';

  const fileSubmenu: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'New',
      accelerator: 'CmdOrCtrl+N',
      click: () => handleFileNew(),
    },
    {
      label: 'Open…',
      accelerator: 'CmdOrCtrl+O',
      click: () => {
        void handleFileOpen();
      },
    },
    {
      label: 'Open Folder…',
      accelerator: 'CmdOrCtrl+Shift+O',
      click: () => {
        void handleFolderOpen();
      },
    },
    {
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      click: () => sendMenuAction('close'),
    },
    { type: 'separator' },
    {
      label: 'Save',
      accelerator: 'CmdOrCtrl+S',
      click: () => sendMenuAction('save'),
    },
    {
      label: 'Save As…',
      accelerator: 'CmdOrCtrl+Shift+S',
      click: () => sendMenuAction('save-as'),
    },
    { type: 'separator' },
    {
      label: 'Export as PDF…',
      click: () => sendMenuAction('export-pdf'),
    },
    {
      label: 'Print…',
      accelerator: 'CmdOrCtrl+P',
      click: () => sendMenuAction('print'),
    },
  ];

  if (!isMac) {
    fileSubmenu.push(
      { type: 'separator' },
      { role: 'quit', label: `Quit ${APP_NAME}` },
    );
  }

  const formatSubmenu: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Bold',
      accelerator: 'CmdOrCtrl+B',
      click: () => sendMenuAction('format-bold'),
    },
    {
      label: 'Italic',
      accelerator: 'CmdOrCtrl+I',
      click: () => sendMenuAction('format-italic'),
    },
    {
      label: 'Strikethrough',
      accelerator: 'CmdOrCtrl+Shift+X',
      click: () => sendMenuAction('format-strikethrough'),
    },
    { type: 'separator' },
    {
      label: 'Heading 1',
      click: () => sendMenuAction('format-heading-1'),
    },
    {
      label: 'Heading 2',
      click: () => sendMenuAction('format-heading-2'),
    },
    {
      label: 'Heading 3',
      click: () => sendMenuAction('format-heading-3'),
    },
    {
      label: 'Heading 4',
      click: () => sendMenuAction('format-heading-4'),
    },
    {
      label: 'Heading 5',
      click: () => sendMenuAction('format-heading-5'),
    },
    {
      label: 'Heading 6',
      click: () => sendMenuAction('format-heading-6'),
    },
    {
      label: 'Body Text',
      click: () => sendMenuAction('format-body'),
    },
    { type: 'separator' },
    {
      label: 'Bulleted List',
      click: () => sendMenuAction('format-bullet-list'),
    },
    {
      label: 'Numbered List',
      click: () => sendMenuAction('format-ordered-list'),
    },
    {
      label: 'Task List',
      click: () => sendMenuAction('format-task-list'),
    },
    {
      label: 'Block Quote',
      click: () => sendMenuAction('format-blockquote'),
    },
    { type: 'separator' },
    {
      label: 'Insert Link',
      click: () => sendMenuAction('format-link'),
    },
    {
      label: 'Insert Table',
      click: () => sendMenuAction('format-table'),
    },
    {
      label: 'Insert Image',
      click: () => sendMenuAction('format-image'),
    },
    {
      label: 'Insert Code Snippet',
      click: () => sendMenuAction('format-code-snippet'),
    },
    {
      label: 'Insert Equation',
      click: () => sendMenuAction('format-math'),
    },
  ];

  const viewSubmenu: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Zoom In',
      accelerator: 'CmdOrCtrl+=',
      click: () => sendMenuAction('zoom-in'),
    },
    {
      label: 'Zoom Out',
      accelerator: 'CmdOrCtrl+-',
      click: () => sendMenuAction('zoom-out'),
    },
    {
      label: 'Actual Size',
      accelerator: 'CmdOrCtrl+0',
      click: () => sendMenuAction('zoom-reset'),
    },
    { type: 'separator' },
    { role: 'togglefullscreen' },
  ];

  const showAbout = (): void => {
    void dialog.showMessageBox(getFocusedWindow(), {
      type: 'info',
      title: `About ${APP_NAME}`,
      message: APP_NAME,
      detail: `Version ${packageJson.version}\n\nA WYSIWYG markdown word processor.`,
      buttons: ['OK'],
    });
  };

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: APP_NAME,
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
    { label: 'File', submenu: fileSubmenu },
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
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => sendMenuAction('find'),
        },
        {
          label: 'Find in Workspace',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => sendMenuAction('find-in-workspace'),
        },
        {
          label: 'Quick Open…',
          accelerator: 'CmdOrCtrl+K',
          click: () => sendMenuAction('command-palette'),
        },
      ],
    },
    { label: 'Format', submenu: formatSubmenu },
    { label: 'View', submenu: viewSubmenu },
    ...(isMac
      ? [
          {
            label: 'Window',
            submenu: [
              { role: 'minimize' as const },
              { role: 'zoom' as const },
              { type: 'separator' as const },
              { role: 'front' as const },
            ],
          },
        ]
      : []),
    ...(!isMac
      ? [
          {
            label: 'Help',
            submenu: [
              {
                label: `About ${APP_NAME}`,
                click: showAbout,
              },
            ],
          },
        ]
      : []),
  ];

  return Menu.buildFromTemplate(template);
};

const registerIpcHandlers = (): void => {
  ipcMain.handle(IPC.FOLDER_OPEN, async (event) => {
    const parentWindow = getWindowFromSender(event.sender) ?? getFocusedWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(parentWindow, {
      properties: ['openDirectory'],
    });

    if (canceled || filePaths.length === 0) {
      return null;
    }

    return { rootPath: filePaths[0] };
  });

  ipcMain.handle(IPC.FOLDER_READ_TREE, async (_event, dirPath: string) => {
    return readDirectoryTree(dirPath);
  });

  ipcMain.handle(IPC.FOLDER_READ_FILE, async (_event, filePath: string) => {
    const content = await fs.readFile(filePath, 'utf-8');
    return { path: filePath, content };
  });

  ipcMain.handle(IPC.FOLDER_WATCH_START, (event, rootPath: string) => {
    startFolderWatch(event.sender, rootPath);
  });

  ipcMain.handle(IPC.FOLDER_WATCH_STOP, (event) => {
    stopFolderWatch(event.sender);
  });

  ipcMain.handle(
    IPC.FOLDER_CREATE_FILE,
    async (
      event,
      payload: { rootPath: string; parentDir: string; name: string },
    ) => {
      const filePath = await createMarkdownFile(
        payload.rootPath,
        payload.parentDir,
        payload.name,
      );
      suppressPathForWatch(event.sender.id, filePath);
      return { path: filePath };
    },
  );

  ipcMain.handle(
    IPC.FOLDER_CREATE_FOLDER,
    async (
      event,
      payload: { rootPath: string; parentDir: string; name: string },
    ) => {
      const folderPath = await createFolder(
        payload.rootPath,
        payload.parentDir,
        payload.name,
      );
      suppressPathForWatch(event.sender.id, folderPath);
      return { path: folderPath };
    },
  );

  ipcMain.handle(
    IPC.FOLDER_DELETE,
    async (
      event,
      payload: { rootPath: string; targetPath: string },
    ) => {
      suppressPathForWatch(event.sender.id, payload.targetPath);
      await deleteEntry(payload.rootPath, payload.targetPath);
      return { success: true };
    },
  );

  ipcMain.handle(
    IPC.FOLDER_CONFIRM_DELETE,
    async (event, payload: { name: string; isDirectory: boolean }) => {
      const parentWindow =
        getWindowFromSender(event.sender) ?? getFocusedWindow();
      const { response } = await dialog.showMessageBox(parentWindow, {
        type: 'warning',
        buttons: ['Cancel', 'Delete'],
        defaultId: 0,
        cancelId: 0,
        message: `Delete "${payload.name}"?`,
        detail: payload.isDirectory
          ? 'This will permanently delete the folder and all its contents.'
          : 'This cannot be undone.',
      });

      return (response === 1 ? 'confirm' : 'cancel') as DeleteConfirmChoice;
    },
  );

  ipcMain.handle(
    IPC.FOLDER_RENAME,
    async (
      event,
      payload: { rootPath: string; oldPath: string; newName: string },
    ) => {
      const newPath = await renameEntry(
        payload.rootPath,
        payload.oldPath,
        payload.newName,
      );
      suppressPathForWatch(event.sender.id, payload.oldPath);
      suppressPathForWatch(event.sender.id, newPath);
      broadcastFolderRenamed(
        payload.rootPath,
        payload.oldPath,
        newPath,
        event.sender.id,
      );
      return { path: newPath };
    },
  );

  ipcMain.handle(
    IPC.FILE_RENAME,
    async (event, payload: { oldPath: string; newName: string }) => {
      const newPath = await renamePath(payload.oldPath, payload.newName);
      suppressPathForWatch(event.sender.id, payload.oldPath);
      suppressPathForWatch(event.sender.id, newPath);
      return { path: newPath };
    },
  );

  ipcMain.handle(IPC.FILE_OPEN, async (event) => {
    const parentWindow = getWindowFromSender(event.sender) ?? getFocusedWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(parentWindow, {
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
    async (event, filePath: string, content: string) => {
      suppressPathForWatch(event.sender.id, filePath);
      await fs.writeFile(filePath, content, 'utf-8');
    },
  );

  ipcMain.handle(IPC.FILE_SAVE_AS, async (event, content: string) => {
    const parentWindow = getWindowFromSender(event.sender) ?? getFocusedWindow();
    const { canceled, filePath } = await dialog.showSaveDialog(parentWindow, {
      filters: MARKDOWN_FILTERS,
      defaultPath: 'Untitled.md',
    });

    if (canceled || !filePath) {
      return null;
    }

    suppressPathForWatch(event.sender.id, filePath);
    await fs.writeFile(filePath, content, 'utf-8');
    return { path: filePath };
  });

  ipcMain.handle(IPC.FILE_OPEN_IMAGE, async (event) => {
    const parentWindow = getWindowFromSender(event.sender) ?? getFocusedWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(parentWindow, {
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
      return { relativePath: assetsRelativePath(fileName) };
    },
  );

  ipcMain.handle(IPC.FILE_STAGE_IMAGE, async (_event, sourcePath: string) => {
    const tempDir = path.join(app.getPath('temp'), 'notebook-assets');
    await fs.mkdir(tempDir, { recursive: true });
    const fileName = uniqueAssetName(path.basename(sourcePath));
    const destPath = path.join(tempDir, fileName);
    await fs.copyFile(sourcePath, destPath);
    return {
      tempPath: destPath,
      relativePath: assetsRelativePath(fileName),
      fileUrl: toAssetProtocolUrl(destPath),
    };
  });

  ipcMain.handle(
    IPC.FILE_RESOLVE_ASSET_URL,
    (_event, docPath: string, relativePath: string) => {
      const absolutePath = path.join(path.dirname(docPath), relativePath);
      return toAssetProtocolUrl(absolutePath);
    },
  );

  ipcMain.handle(
    IPC.FILE_RESOLVE_ABSOLUTE_ASSET_URL,
    (_event, absolutePath: string) => toAssetProtocolUrl(absolutePath),
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
          relativePath: assetsRelativePath(fileName),
        });
      }

      return results;
    },
  );

  ipcMain.handle(
    IPC.FILE_SAVE_CLIPBOARD_IMAGE,
    async (_event, docPath: string | null) => {
      const image = clipboard.readImage();
      if (image.isEmpty()) {
        return null;
      }

      const fileName = pastedImageFileName();
      const pngBuffer = image.toPNG();

      if (!docPath) {
        const tempDir = path.join(app.getPath('temp'), 'notebook-assets');
        await fs.mkdir(tempDir, { recursive: true });
        const destPath = path.join(tempDir, fileName);
        await fs.writeFile(destPath, pngBuffer);
        return {
          tempPath: destPath,
          relativePath: assetsRelativePath(fileName),
          fileUrl: toAssetProtocolUrl(destPath),
        };
      }

      const assetsDir = await ensureAssetsDir(docPath);
      const destPath = path.join(assetsDir, fileName);
      await fs.writeFile(destPath, pngBuffer);
      return {
        relativePath: assetsRelativePath(fileName),
        fileUrl: toAssetProtocolUrl(destPath),
      };
    },
  );

  ipcMain.handle(
    IPC.FILE_SAVE_IMAGE_BYTES,
    async (
      _event,
      payload: { bytes: ArrayBuffer; fileName: string; docPath: string | null },
    ) => {
      const { bytes, fileName, docPath } = payload;
      const buffer = Buffer.from(bytes);
      const resolvedName = uniqueAssetName(fileName || 'pasted-image.png');

      if (!docPath) {
        const tempDir = path.join(app.getPath('temp'), 'notebook-assets');
        await fs.mkdir(tempDir, { recursive: true });
        const destPath = path.join(tempDir, resolvedName);
        await fs.writeFile(destPath, buffer);
        return {
          tempPath: destPath,
          relativePath: assetsRelativePath(resolvedName),
          fileUrl: toAssetProtocolUrl(destPath),
        };
      }

      const assetsDir = await ensureAssetsDir(docPath);
      const destPath = path.join(assetsDir, resolvedName);
      await fs.writeFile(destPath, buffer);
      return {
        relativePath: assetsRelativePath(resolvedName),
        fileUrl: toAssetProtocolUrl(destPath),
      };
    },
  );

  ipcMain.handle(
    IPC.EXPORT_PDF,
    async (event, payload: { html: string; defaultFileName: string }) => {
      const parentWindow = getWindowFromSender(event.sender) ?? getFocusedWindow();
      const { canceled, filePath } = await dialog.showSaveDialog(parentWindow, {
        filters: PDF_FILTERS,
        defaultPath: payload.defaultFileName,
      });

      if (canceled || !filePath) {
        return { success: false };
      }

      const printWindow = await renderPrintableDocument(payload.html);
      try {
        const pdfBuffer = await printWindow.webContents.printToPDF({
          printBackground: true,
        });
        await fs.writeFile(filePath, pdfBuffer);
        return { success: true, path: filePath };
      } finally {
        printWindow.destroy();
      }
    },
  );

  ipcMain.handle(
    IPC.PRINT_DOCUMENT,
    async (_event, payload: { html: string }) => {
      const printWindow = await renderPrintableDocument(payload.html);
      try {
        await new Promise<void>((resolve, reject) => {
          printWindow.webContents.print(
            { silent: false, printBackground: true },
            (success, failureReason) => {
              if (success) {
                resolve();
              } else {
                reject(new Error(failureReason));
              }
            },
          );
        });
        return { success: true };
      } catch {
        return { success: false };
      } finally {
        printWindow.destroy();
      }
    },
  );

  ipcMain.handle(IPC.DOC_CONFIRM_DISCARD, async (event) => {
    const window = getWindowFromSender(event.sender);
    if (!window) {
      return 'cancel' as DiscardChoice;
    }

    const state = getWindowState(window);
    if (!state?.isDirty) {
      return 'discard' as DiscardChoice;
    }

    return showDiscardDialog(window);
  });

  ipcMain.on(
    IPC.DOC_DIRTY_CHANGED,
    (event, payload: { dirty: boolean; title: string }) => {
      const window = getWindowFromSender(event.sender);
      if (!window) {
        return;
      }

      const state = getWindowState(window);
      if (state) {
        state.isDirty = payload.dirty;
      }

      window.setTitle(payload.title);
    },
  );

  ipcMain.on(
    IPC.DOC_SESSION_CHANGED,
    (event, payload: { hasDocument: boolean; mode: WindowMode }) => {
      const window = getWindowFromSender(event.sender);
      if (!window) {
        return;
      }

      const state = getWindowState(window);
      if (state) {
        state.hasDocument = payload.hasDocument;
        state.mode = payload.mode;
      }
    },
  );

  ipcMain.on(IPC.DOC_READY_TO_CLOSE, (event) => {
    const window = getWindowFromSender(event.sender);
    if (!window) {
      return;
    }

    pendingCloseResolves.get(window.id)?.(true);
    pendingCloseResolves.delete(window.id);
  });

  ipcMain.on(IPC.DOC_ABORT_CLOSE, (event) => {
    const window = getWindowFromSender(event.sender);
    if (!window) {
      return;
    }

    pendingCloseResolves.get(window.id)?.(false);
    pendingCloseResolves.delete(window.id);
  });

  ipcMain.on(IPC.WINDOW_REQUEST_CLOSE, (event) => {
    const window = getWindowFromSender(event.sender);
    window?.close();
  });
};

const handleWindowClose = async (window: BrowserWindow): Promise<boolean> => {
  const state = getWindowState(window);
  if (!state?.isDirty) {
    return true;
  }

  const choice = await showDiscardDialog(window);

  if (choice === 'cancel') {
    return false;
  }

  if (choice === 'discard') {
    return true;
  }

  return new Promise((resolve) => {
    pendingCloseResolves.set(window.id, resolve);
    window.webContents.send(IPC.MENU_ACTION, 'save-and-close');
  });
};

const createWindow = (options: CreateWindowOptions = {}): BrowserWindow => {
  const { initialDocument, initialFolder, startUntitled } = options;
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  windows.set(window.id, {
    window,
    isDirty: false,
    hasDocument: Boolean(initialDocument || initialFolder || startUntitled),
    mode: initialFolder ? 'folder' : initialDocument || startUntitled ? 'single' : 'empty',
  });

  const sendInitialPayload = (): void => {
    if (initialDocument) {
      window.webContents.send(IPC.WINDOW_INITIAL_DOCUMENT, initialDocument);
    } else if (initialFolder) {
      window.webContents.send(IPC.WINDOW_INITIAL_FOLDER, initialFolder);
    } else if (startUntitled) {
      window.webContents.send(IPC.WINDOW_INITIAL_UNTITLED);
    }
  };

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL).then(sendInitialPayload);
    window.webContents.openDevTools();
  } else {
    void window
      .loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      )
      .then(sendInitialPayload);
  }

  window.on('close', async (event) => {
    const cleanupWindow = (): void => {
      stopFolderWatch(window.webContents);
      windows.delete(window.id);
      pendingCloseResolves.delete(window.id);
    };

    if (isQuitting) {
      cleanupWindow();
      return;
    }

    event.preventDefault();
    const canClose = await handleWindowClose(window);
    if (canClose) {
      cleanupWindow();
      window.destroy();
    }
  });

  return window;
};

app.on('open-file', (event, filePath) => {
  event.preventDefault();

  if (!isMarkdownPath(filePath)) {
    return;
  }

  if (app.isReady()) {
    void openMarkdownPath(filePath);
  } else {
    pendingOpenPaths.push(filePath);
  }
});

app.on('ready', () => {
  registerAssetProtocol();

  if (process.platform === 'darwin') {
    app.setAboutPanelOptions({
      applicationName: APP_NAME,
      applicationVersion: packageJson.version,
      version: packageJson.version,
      copyright: 'Copyright © 2026 Toby Scott',
    });
  }

  Menu.setApplicationMenu(buildMenu());
  registerIpcHandlers();

  const launchPaths = [
    ...new Set([...pendingOpenPaths, ...getLaunchMarkdownPaths()]),
  ];
  pendingOpenPaths.length = 0;

  if (launchPaths.length > 0) {
    for (const filePath of launchPaths) {
      void openMarkdownPath(filePath);
    }
  } else {
    createWindow();
  }
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

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
});
