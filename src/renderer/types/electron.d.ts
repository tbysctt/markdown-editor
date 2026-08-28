import type { MenuAction } from '../../ipc/channels';

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
  setDirty: (dirty: boolean, title: string) => void;
  notifyReadyToClose: () => void;
  notifyAbortClose: () => void;
  onMenuAction: (callback: (action: MenuAction) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
