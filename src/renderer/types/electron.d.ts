export type {
  ClipboardImageResult,
  CopyImageResult,
  ElectronAPI,
  FileTreeNode,
  FolderRenamedPayload,
  OpenFileResult,
  OpenFolderResult,
  QueuedImageCopy,
  SaveFileResult,
  StagedImageResult,
} from '../../shared/ipc-types';

declare global {
  interface Window {
    electronAPI: import('../../shared/ipc-types').ElectronAPI;
  }
}

export {};
