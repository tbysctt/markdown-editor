import { useCallback, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  prepareMarkdownForSave,
  type QueuedImage,
} from '../utils/markdown';

interface UseTabDocumentOptions {
  editor: Editor | null;
  filePath: string;
  onDirtyChange: (dirty: boolean) => void;
}

export function useTabDocument({
  editor,
  filePath,
  onDirtyChange,
}: UseTabDocumentOptions) {
  const [queuedImages, setQueuedImages] = useState<QueuedImage[]>([]);
  const suppressDirtyRef = useRef(false);

  const markDirty = useCallback(() => {
    if (suppressDirtyRef.current) {
      return;
    }
    onDirtyChange(true);
  }, [onDirtyChange]);

  const markClean = useCallback(() => {
    onDirtyChange(false);
  }, [onDirtyChange]);

  const getMarkdownContent = useCallback((): string => {
    if (!editor) {
      return '';
    }
    return prepareMarkdownForSave(editor.getMarkdown(), queuedImages);
  }, [editor, queuedImages]);

  const saveDocument = useCallback(async (): Promise<boolean> => {
    if (!editor) {
      return false;
    }

    let content = getMarkdownContent();

    if (queuedImages.length > 0) {
      const copied = await window.electronAPI.copyQueuedImages(
        filePath,
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

    await window.electronAPI.saveFile(filePath, content);
    markClean();
    return true;
  }, [editor, filePath, getMarkdownContent, markClean, queuedImages]);

  const saveDocumentAs = useCallback(async (): Promise<{
    success: boolean;
    path?: string;
  }> => {
    if (!editor) {
      return { success: false };
    }

    let content = getMarkdownContent();
    const result = await window.electronAPI.saveAs(content);
    if (!result) {
      return { success: false };
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
    } else {
      await window.electronAPI.saveFile(targetPath, content);
    }

    markClean();
    return { success: true, path: targetPath };
  }, [editor, getMarkdownContent, markClean, queuedImages]);

  const addQueuedImage = useCallback(
    (image: QueuedImage) => {
      setQueuedImages((current) => [...current, image]);
      markDirty();
    },
    [markDirty],
  );

  const clearQueuedImages = useCallback(() => {
    setQueuedImages([]);
  }, []);

  const setSuppressDirty = useCallback((value: boolean) => {
    suppressDirtyRef.current = value;
  }, []);

  return {
    queuedImages,
    markDirty,
    markClean,
    getMarkdownContent,
    saveDocument,
    saveDocumentAs,
    addQueuedImage,
    clearQueuedImages,
    setSuppressDirty,
  };
}
