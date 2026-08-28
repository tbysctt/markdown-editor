import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { MenuAction } from '../../ipc/channels';
import {
  buildWindowTitle,
  getFileName,
  prepareMarkdownForEditor,
  prepareMarkdownForSave,
  type QueuedImage,
} from '../utils/markdown';
import { confirmDiscardIfDirty } from '../utils/documentConfirm';

export interface DocumentState {
  filePath: string | null;
  fileName: string;
  dirty: boolean;
  queuedImages: QueuedImage[];
}

interface UseDocumentOptions {
  editor: Editor | null;
  onNavigateWelcome: () => void;
}

export function useDocument({ editor, onNavigateWelcome }: UseDocumentOptions) {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [queuedImages, setQueuedImages] = useState<QueuedImage[]>([]);
  const suppressDirtyRef = useRef(false);

  const fileName = getFileName(filePath);

  const syncWindowTitle = useCallback(
    (nextDirty: boolean, nextPath: string | null = filePath) => {
      window.electronAPI.setDirty(
        nextDirty,
        buildWindowTitle(nextPath, nextDirty),
      );
    },
    [filePath],
  );

  const markDirty = useCallback(() => {
    if (suppressDirtyRef.current) {
      return;
    }
    setDirty(true);
    syncWindowTitle(true);
  }, [syncWindowTitle]);

  const markClean = useCallback(
    (nextPath: string | null = filePath) => {
      setDirty(false);
      syncWindowTitle(false, nextPath);
    },
    [filePath, syncWindowTitle],
  );

  const getMarkdownContent = useCallback((): string => {
    if (!editor) {
      return '';
    }
    const raw = editor.getMarkdown();
    return prepareMarkdownForSave(raw, queuedImages);
  }, [editor, queuedImages]);

  const loadContent = useCallback(
    async (content: string, path: string | null) => {
      if (!editor) {
        return;
      }

      suppressDirtyRef.current = true;
      const prepared = path
        ? await prepareMarkdownForEditor(content, path)
        : content;

      editor.commands.setContent(prepared, { contentType: 'markdown' });
      setFilePath(path);
      setQueuedImages([]);
      markClean(path);
      suppressDirtyRef.current = false;
    },
    [editor, markClean],
  );

  const saveDocument = useCallback(async (): Promise<boolean> => {
    if (!editor) {
      return false;
    }

    let content = getMarkdownContent();
    let targetPath = filePath;

    if (!targetPath) {
      const result = await window.electronAPI.saveAs(content);
      if (!result) {
        return false;
      }
      targetPath = result.path;
    }

    if (queuedImages.length > 0) {
      const copied = await window.electronAPI.copyQueuedImages(
        targetPath,
        queuedImages.map((image) => ({
          tempPath: image.tempPath,
          relativePath: image.relativePath,
        })),
      );

      const updatedQueued = queuedImages.map((image, index) => ({
        ...image,
        relativePath: copied[index]?.relativePath ?? image.relativePath,
      }));

      content = prepareMarkdownForSave(editor.getMarkdown(), updatedQueued);
      setQueuedImages([]);
    }

    await window.electronAPI.saveFile(targetPath, content);
    setFilePath(targetPath);
    markClean(targetPath);

    return true;
  }, [editor, filePath, getMarkdownContent, markClean, queuedImages]);

  const saveAsDocument = useCallback(async (): Promise<boolean> => {
    if (!editor) {
      return false;
    }

    let content = getMarkdownContent();
    const result = await window.electronAPI.saveAs(content);
    if (!result) {
      return false;
    }

    const targetPath = result.path;

    if (queuedImages.length > 0) {
      const copied = await window.electronAPI.copyQueuedImages(
        targetPath,
        queuedImages.map((image) => ({
          tempPath: image.tempPath,
          relativePath: image.relativePath,
        })),
      );

      const updatedQueued = queuedImages.map((image, index) => ({
        ...image,
        relativePath: copied[index]?.relativePath ?? image.relativePath,
      }));

      content = prepareMarkdownForSave(editor.getMarkdown(), updatedQueued);
      setQueuedImages([]);
      await window.electronAPI.saveFile(targetPath, content);
    }

    setFilePath(targetPath);
    markClean(targetPath);
    return true;
  }, [editor, getMarkdownContent, markClean, queuedImages]);

  const requestNewDocument = useCallback(async () => {
    const result = await confirmDiscardIfDirty(dirty);
    if (result === 'cancel') {
      return;
    }

    if (result === 'save') {
      const saved = await saveDocument();
      if (!saved) {
        return;
      }
    }

    onNavigateWelcome();
  }, [dirty, onNavigateWelcome, saveDocument]);

  const requestCloseDocument = useCallback(async () => {
    const result = await confirmDiscardIfDirty(dirty);
    if (result === 'cancel') {
      return;
    }

    if (result === 'save') {
      const saved = await saveDocument();
      if (!saved) {
        return;
      }
    }

    onNavigateWelcome();
  }, [dirty, onNavigateWelcome, saveDocument]);

  const addQueuedImage = useCallback((image: QueuedImage) => {
    setQueuedImages((current) => [...current, image]);
    markDirty();
  }, [markDirty]);

  useEffect(() => {
    syncWindowTitle(dirty);
  }, [dirty, syncWindowTitle]);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onMenuAction(
      async (action: MenuAction) => {
        switch (action) {
          case 'new':
            await requestNewDocument();
            break;
          case 'save':
            await saveDocument();
            break;
          case 'save-as':
            await saveAsDocument();
            break;
          case 'save-and-close': {
            const saved = await saveDocument();
            if (saved) {
              window.electronAPI.notifyReadyToClose();
            } else {
              window.electronAPI.notifyAbortClose();
            }
            break;
          }
          case 'close':
            await requestCloseDocument();
            break;
          default:
            break;
        }
      },
    );

    return unsubscribe;
  }, [
    requestCloseDocument,
    requestNewDocument,
    saveAsDocument,
    saveDocument,
  ]);

  return {
    filePath,
    fileName,
    dirty,
    queuedImages,
    markDirty,
    markClean,
    loadContent,
    saveDocument,
    saveAsDocument,
    addQueuedImage,
    requestCloseDocument,
  };
}
