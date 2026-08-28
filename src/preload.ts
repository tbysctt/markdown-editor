import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './ipc/channels';
import type { DiscardChoice, MenuAction } from './ipc/channels';
import type {
  CopyImageResult,
  OpenFileResult,
  QueuedImageCopy,
  SaveFileResult,
  StagedImageResult,
} from './renderer/types/electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (): Promise<OpenFileResult | null> =>
    ipcRenderer.invoke(IPC.FILE_OPEN),

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

  setSessionState: (hasDocument: boolean): void => {
    ipcRenderer.send(IPC.DOC_SESSION_CHANGED, { hasDocument });
  },

  confirmDiscardChanges: (): Promise<DiscardChoice> =>
    ipcRenderer.invoke(IPC.DOC_CONFIRM_DISCARD),

  notifyReadyToClose: (): void => {
    ipcRenderer.send(IPC.DOC_READY_TO_CLOSE);
  },

  notifyAbortClose: (): void => {
    ipcRenderer.send(IPC.DOC_ABORT_CLOSE);
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
});
