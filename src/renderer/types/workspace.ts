import type { Editor } from '@tiptap/react';
import { getFileName } from '../utils/markdown';

export interface EditorTab {
  id: string;
  filePath: string;
  dirty: boolean;
  isPreview: boolean;
  initialContent: string;
  contentEpoch: number;
}

export interface OpenTabOptions {
  preview?: boolean;
  content?: string;
}

export interface TabEditorHandle {
  tabId: string;
  filePath: string;
  editor: Editor;
  dirty: boolean;
  getMarkdownContent: () => string;
  saveDocument: () => Promise<boolean>;
  saveDocumentAs: () => Promise<boolean>;
}

export function getTabLabel(filePath: string): string {
  if (isUntitledPath(filePath)) {
    return 'Untitled';
  }
  return getFileName(filePath);
}

export function isMarkdownFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.markdown');
}

export function createTabId(): string {
  return crypto.randomUUID();
}

export function createEditorTab(
  filePath: string,
  initialContent: string,
  options: { preview?: boolean } = {},
): EditorTab {
  return {
    id: createTabId(),
    filePath,
    dirty: false,
    isPreview: options.preview ?? false,
    initialContent,
    contentEpoch: 0,
  };
}

export function isUntitledPath(filePath: string): boolean {
  return filePath.startsWith('untitled:');
}

export function createUntitledPath(tabId: string): string {
  return `untitled:${tabId}`;
}

export function createUntitledTab(initialContent = ''): EditorTab {
  const id = createTabId();
  return {
    id,
    filePath: createUntitledPath(id),
    dirty: false,
    isPreview: false,
    initialContent,
    contentEpoch: 0,
  };
}
