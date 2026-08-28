import type { DiscardChoice, DeleteConfirmChoice, MenuAction, WindowMode } from '../../ipc/channels';

export interface OpenFileResult {
  path: string;
  content: string;
}

export interface OpenFolderResult {
  rootPath: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

export interface SaveFileResult {
  path: string;
}

export interface CopyImageResult {
  relativePath: string;
}

export interface StagedImageResult {
  tempPath: string;
  relativePath: string;
  fileUrl: string;
}

export interface QueuedImageCopy {
  tempPath: string;
  relativePath: string;
}

export interface FolderRenamedPayload {
  oldPath: string;
  newPath: string;
}

export interface ElectronAPI {
  openFile: () => Promise<OpenFileResult | null>;
  openFolder: () => Promise<OpenFolderResult | null>;
  readFolderTree: (dirPath: string) => Promise<FileTreeNode>;
  readFolderFile: (filePath: string) => Promise<OpenFileResult>;
  startFolderWatch: (rootPath: string) => Promise<void>;
  stopFolderWatch: () => Promise<void>;
  createFolderFile: (payload: {
    rootPath: string;
    parentDir: string;
    name: string;
  }) => Promise<{ path: string }>;
  createFolderEntry: (payload: {
    rootPath: string;
    parentDir: string;
    name: string;
  }) => Promise<{ path: string }>;
  deleteFolderEntry: (payload: {
    rootPath: string;
    targetPath: string;
  }) => Promise<{ success: boolean }>;
  confirmDeleteEntry: (payload: {
    name: string;
    isDirectory: boolean;
  }) => Promise<DeleteConfirmChoice>;
  renameFolderEntry: (payload: {
    rootPath: string;
    oldPath: string;
    newName: string;
  }) => Promise<{ path: string }>;
  renameFile: (payload: {
    oldPath: string;
    newName: string;
  }) => Promise<{ path: string }>;
  saveFile: (path: string, content: string) => Promise<void>;
  saveAs: (content: string) => Promise<SaveFileResult | null>;
  openImage: () => Promise<string | null>;
  copyImageForDocument: (
    sourcePath: string,
    docPath: string,
  ) => Promise<CopyImageResult>;
  stageImage: (sourcePath: string) => Promise<StagedImageResult>;
  resolveAssetUrl: (docPath: string, relativePath: string) => Promise<string>;
  copyQueuedImages: (
    docPath: string,
    images: QueuedImageCopy[],
  ) => Promise<QueuedImageCopy[]>;
  exportPdf: (payload: {
    html: string;
    defaultFileName: string;
  }) => Promise<{ success: boolean; path?: string }>;
  printDocument: (payload: {
    html: string;
  }) => Promise<{ success: boolean }>;
  setDirty: (dirty: boolean, title: string) => void;
  setSessionState: (hasDocument: boolean, mode: WindowMode) => void;
  confirmDiscardChanges: () => Promise<DiscardChoice>;
  notifyReadyToClose: () => void;
  notifyAbortClose: () => void;
  requestClose: () => void;
  onMenuAction: (callback: (action: MenuAction) => void) => () => void;
  onOpenDocument: (callback: (document: OpenFileResult) => void) => () => void;
  onInitialDocument: (callback: (document: OpenFileResult) => void) => () => void;
  onInitialUntitled: (callback: () => void) => () => void;
  onOpenFolder: (callback: (folder: OpenFolderResult) => void) => () => void;
  onInitialFolder: (callback: (folder: OpenFolderResult) => void) => () => void;
  onFolderChanged: (callback: () => void) => () => void;
  onFolderRenamed: (
    callback: (payload: FolderRenamedPayload) => void,
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
