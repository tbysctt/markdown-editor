import type { DiscardChoice, MenuAction } from '../../ipc/channels';

export interface OpenFileResult {
  path: string;
  content: string;
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

export interface ElectronAPI {
  openFile: () => Promise<OpenFileResult | null>;
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
  setSessionState: (hasDocument: boolean) => void;
  confirmDiscardChanges: () => Promise<DiscardChoice>;
  notifyReadyToClose: () => void;
  notifyAbortClose: () => void;
  onMenuAction: (callback: (action: MenuAction) => void) => () => void;
  onOpenDocument: (callback: (document: OpenFileResult) => void) => () => void;
  onInitialDocument: (callback: (document: OpenFileResult) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
