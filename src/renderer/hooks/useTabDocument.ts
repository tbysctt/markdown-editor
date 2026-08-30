import { useCallback, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  prepareMarkdownForSave,
  type QueuedImage,
} from '../utils/markdown';
import { isUntitledPath } from '../types/workspace';

interface UseTabDocumentOptions {
  editor: Editor | null;
  filePath: string;
  onDirtyChange: (dirty: boolean) => void;
}

async function persistDocumentContent(
  editor: Editor,
  targetPath: string,
  queuedImages: QueuedImage[],
): Promise<{ content: string; clearedQueued: boolean }> {
  let content = prepareMarkdownForSave(editor.getMarkdown(), queuedImages);

  if (queuedImages.length === 0) {
    return { content, clearedQueued: false };
  }

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
  return { content, clearedQueued: true };
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

  const saveDocumentAs = useCallback(async (): Promise<{
    success: boolean;
    path?: string;
  }> => {
    if (!editor) {
      return { success: false };
    }

    const result = await window.electronAPI.saveAs(getMarkdownContent());
    if (!result) {
      return { success: false };
    }

    const targetPath = result.path;
    const { content, clearedQueued } = await persistDocumentContent(
      editor,
      targetPath,
      queuedImages,
    );

    if (clearedQueued) {
      setQueuedImages([]);
    }

    await window.electronAPI.saveFile(targetPath, content);
    markClean();
    return { success: true, path: targetPath };
  }, [editor, getMarkdownContent, markClean, queuedImages]);

  const saveDocument = useCallback(async (): Promise<boolean> => {
    if (!editor) {
      return false;
    }

    if (isUntitledPath(filePath)) {
      const result = await saveDocumentAs();
      return result.success;
    }

    const { content, clearedQueued } = await persistDocumentContent(
      editor,
      filePath,
      queuedImages,
    );

    if (clearedQueued) {
      setQueuedImages([]);
    }

    await window.electronAPI.saveFile(filePath, content);
    markClean();
    return true;
  }, [editor, filePath, markClean, queuedImages, saveDocumentAs]);

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
