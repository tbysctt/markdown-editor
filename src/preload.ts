import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './ipc/channels';
import type { DiscardChoice, DeleteConfirmChoice, MenuAction, WindowMode } from './ipc/channels';
import type {
  CopyImageResult,
  FileTreeNode,
  OpenFileResult,
  OpenFolderResult,
  QueuedImageCopy,
  SaveFileResult,
  StagedImageResult,
} from './renderer/types/electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (): Promise<OpenFileResult | null> =>
    ipcRenderer.invoke(IPC.FILE_OPEN),

  openFolder: (): Promise<OpenFolderResult | null> =>
    ipcRenderer.invoke(IPC.FOLDER_OPEN),

  readFolderTree: (dirPath: string): Promise<FileTreeNode> =>
    ipcRenderer.invoke(IPC.FOLDER_READ_TREE, dirPath),

  readFolderFile: (filePath: string): Promise<OpenFileResult> =>
    ipcRenderer.invoke(IPC.FOLDER_READ_FILE, filePath),

  startFolderWatch: (rootPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC.FOLDER_WATCH_START, rootPath),

  stopFolderWatch: (): Promise<void> =>
    ipcRenderer.invoke(IPC.FOLDER_WATCH_STOP),

  createFolderFile: (payload: {
    rootPath: string;
    parentDir: string;
    name: string;
  }): Promise<{ path: string }> =>
    ipcRenderer.invoke(IPC.FOLDER_CREATE_FILE, payload),

  createFolderEntry: (payload: {
    rootPath: string;
    parentDir: string;
    name: string;
  }): Promise<{ path: string }> =>
    ipcRenderer.invoke(IPC.FOLDER_CREATE_FOLDER, payload),

  deleteFolderEntry: (payload: {
    rootPath: string;
    targetPath: string;
  }): Promise<{ success: boolean }> =>
    ipcRenderer.invoke(IPC.FOLDER_DELETE, payload),

  confirmDeleteEntry: (payload: {
    name: string;
    isDirectory: boolean;
  }): Promise<DeleteConfirmChoice> =>
    ipcRenderer.invoke(IPC.FOLDER_CONFIRM_DELETE, payload),

  renameFolderEntry: (payload: {
    rootPath: string;
    oldPath: string;
    newName: string;
  }): Promise<{ path: string }> =>
    ipcRenderer.invoke(IPC.FOLDER_RENAME, payload),

  renameFile: (payload: {
    oldPath: string;
    newName: string;
  }): Promise<{ path: string }> =>
    ipcRenderer.invoke(IPC.FILE_RENAME, payload),

  saveFile: (path: string, content: string): Promise<void> =>
    ipcRenderer.invoke(IPC.FILE_SAVE, path, content),

  saveAs: (content: string): Promise<SaveFileResult | null> =>
    ipcRenderer.invoke(IPC.FILE_SAVE_AS, content),

  openImage: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.FILE_OPEN_IMAGE),

  copyImageForDocument: (
    sourcePath: string,
    docPath: string,
  ): Promise<CopyImageResult> =>
    ipcRenderer.invoke(IPC.FILE_COPY_IMAGE, sourcePath, docPath),

  stageImage: (sourcePath: string): Promise<StagedImageResult> =>
    ipcRenderer.invoke(IPC.FILE_STAGE_IMAGE, sourcePath),

  resolveAssetUrl: (docPath: string, relativePath: string): Promise<string> =>
    ipcRenderer.invoke(IPC.FILE_RESOLVE_ASSET_URL, docPath, relativePath),

  copyQueuedImages: (
    docPath: string,
    images: QueuedImageCopy[],
  ): Promise<QueuedImageCopy[]> =>
    ipcRenderer.invoke(IPC.FILE_COPY_QUEUED_IMAGES, docPath, images),

  exportPdf: (payload: {
    html: string;
    defaultFileName: string;
  }): Promise<{ success: boolean; path?: string }> =>
    ipcRenderer.invoke(IPC.EXPORT_PDF, payload),

  printDocument: (payload: {
    html: string;
  }): Promise<{ success: boolean }> =>
    ipcRenderer.invoke(IPC.PRINT_DOCUMENT, payload),

  setDirty: (dirty: boolean, title: string): void => {
    ipcRenderer.send(IPC.DOC_DIRTY_CHANGED, { dirty, title });
  },

  setSessionState: (hasDocument: boolean, mode: WindowMode): void => {
    ipcRenderer.send(IPC.DOC_SESSION_CHANGED, { hasDocument, mode });
  },

  confirmDiscardChanges: (): Promise<DiscardChoice> =>
    ipcRenderer.invoke(IPC.DOC_CONFIRM_DISCARD),

  notifyReadyToClose: (): void => {
    ipcRenderer.send(IPC.DOC_READY_TO_CLOSE);
  },

  notifyAbortClose: (): void => {
    ipcRenderer.send(IPC.DOC_ABORT_CLOSE);
  },

  requestClose: (): void => {
    ipcRenderer.send(IPC.WINDOW_REQUEST_CLOSE);
  },

  onMenuAction: (callback: (action: MenuAction) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      action: MenuAction,
    ) => {
      callback(action);
    };
    ipcRenderer.on(IPC.MENU_ACTION, listener);
    return () => {
      ipcRenderer.removeListener(IPC.MENU_ACTION, listener);
    };
  },

  onOpenDocument: (callback: (document: OpenFileResult) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      document: OpenFileResult,
    ) => {
      callback(document);
    };
    ipcRenderer.on(IPC.WINDOW_OPEN_DOCUMENT, listener);
    return () => {
      ipcRenderer.removeListener(IPC.WINDOW_OPEN_DOCUMENT, listener);
    };
  },

  onInitialDocument: (callback: (document: OpenFileResult) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      document: OpenFileResult,
    ) => {
      callback(document);
    };
    ipcRenderer.on(IPC.WINDOW_INITIAL_DOCUMENT, listener);
    return () => {
      ipcRenderer.removeListener(IPC.WINDOW_INITIAL_DOCUMENT, listener);
    };
  },

  onInitialUntitled: (callback: () => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on(IPC.WINDOW_INITIAL_UNTITLED, listener);
    return () => {
      ipcRenderer.removeListener(IPC.WINDOW_INITIAL_UNTITLED, listener);
    };
  },

  onOpenFolder: (callback: (folder: OpenFolderResult) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      folder: OpenFolderResult,
    ) => {
      callback(folder);
    };
    ipcRenderer.on(IPC.WINDOW_OPEN_FOLDER, listener);
    return () => {
      ipcRenderer.removeListener(IPC.WINDOW_OPEN_FOLDER, listener);
    };
  },

  onInitialFolder: (callback: (folder: OpenFolderResult) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      folder: OpenFolderResult,
    ) => {
      callback(folder);
    };
    ipcRenderer.on(IPC.WINDOW_INITIAL_FOLDER, listener);
    return () => {
      ipcRenderer.removeListener(IPC.WINDOW_INITIAL_FOLDER, listener);
    };
  },

  onFolderChanged: (callback: () => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on(IPC.FOLDER_CHANGED, listener);
    return () => {
      ipcRenderer.removeListener(IPC.FOLDER_CHANGED, listener);
    };
  },

  onFolderRenamed: (
    callback: (payload: { oldPath: string; newPath: string }) => void,
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: { oldPath: string; newPath: string },
    ) => {
      callback(payload);
    };
    ipcRenderer.on(IPC.FOLDER_RENAMED, listener);
    return () => {
      ipcRenderer.removeListener(IPC.FOLDER_RENAMED, listener);
    };
  },
});
