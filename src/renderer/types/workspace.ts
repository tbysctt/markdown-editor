import type { QueuedImage } from '../utils/markdown';

export interface EditorTab {
  id: string;
  filePath: string;
  dirty: boolean;
  isPreview: boolean;
  editorMarkdown: string;
  queuedImages: QueuedImage[];
}

export interface OpenTabOptions {
  preview?: boolean;
  content?: string;
}

export function isMarkdownFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.markdown');
}

export function createTabId(): string {
  return crypto.randomUUID();
}
