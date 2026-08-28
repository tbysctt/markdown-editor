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

  const openDocument = useCallback(async (): Promise<boolean> => {
    const result = await window.electronAPI.openFile();
    if (!result) {
      return false;
    }

    await loadContent(result.content, result.path);
    return true;
  }, [loadContent]);

  const createNewDocument = useCallback(async () => {
    await loadContent('', null);
  }, [loadContent]);

  const requestNewDocument = useCallback(async () => {
    if (dirty) {
      const shouldDiscard = window.confirm(
        'You have unsaved changes. Discard them and create a new document?',
      );
      if (!shouldDiscard) {
        return;
      }
    }

    onNavigateWelcome();
  }, [dirty, onNavigateWelcome]);

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
          case 'open': {
            if (dirty) {
              const shouldDiscard = window.confirm(
                'You have unsaved changes. Discard them and open another file?',
              );
              if (!shouldDiscard) {
                return;
              }
            }
            await openDocument();
            break;
          }
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
          default:
            break;
        }
      },
    );

    return unsubscribe;
  }, [
    dirty,
    openDocument,
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
    createNewDocument,
    openDocument,
    saveDocument,
    saveAsDocument,
    addQueuedImage,
  };
}
