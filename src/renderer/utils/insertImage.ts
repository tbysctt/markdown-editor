import type { Editor } from '@tiptap/react';
import type { QueuedImage } from './markdown';
import { isUntitledPath } from '../types/workspace';
import { isRemoteImageSrc } from './assetUrl';

interface InsertImageFromSourceOptions {
  editor: Editor;
  docPath: string;
  sourcePath: string;
  addQueuedImage: (image: QueuedImage) => void;
  markDirty: () => void;
  insertPos?: number;
}

interface InsertImageFromRelativePathOptions {
  editor: Editor;
  relativePath: string;
  addQueuedImage: (image: QueuedImage) => void;
  markDirty: () => void;
  insertPos?: number;
  staged?: QueuedImage;
}

export function insertImageNode(
  editor: Editor,
  src: string,
  insertPos?: number,
): void {
  const imageContent = {
    type: 'image',
    attrs: { src },
  };

  if (insertPos !== undefined) {
    editor.chain().focus().insertContentAt(insertPos, imageContent).run();
    return;
  }

  editor.chain().focus().setImage({ src }).run();
}

export async function insertImageFromSource({
  editor,
  docPath,
  sourcePath,
  addQueuedImage,
  markDirty,
  insertPos,
}: InsertImageFromSourceOptions): Promise<void> {
  if (isUntitledPath(docPath)) {
    const staged = await window.electronAPI.stageImage(sourcePath);
    insertImageFromRelativePath({
      editor,
      relativePath: staged.relativePath,
      addQueuedImage,
      markDirty,
      insertPos,
      staged,
    });
    return;
  }

  const { relativePath } = await window.electronAPI.copyImageForDocument(
    sourcePath,
    docPath,
  );
  insertImageFromRelativePath({
    editor,
    relativePath,
    addQueuedImage,
    markDirty,
    insertPos,
  });
}

export function insertImageFromRelativePath({
  editor,
  relativePath,
  addQueuedImage,
  markDirty,
  insertPos,
  staged,
}: InsertImageFromRelativePathOptions): void {
  insertImageNode(editor, relativePath, insertPos);

  if (staged) {
    addQueuedImage(staged);
    return;
  }

  markDirty();
}

export async function insertImageFromSavedResult(
  editor: Editor,
  docPath: string,
  result: { relativePath: string; tempPath?: string; fileUrl?: string },
  addQueuedImage: (image: QueuedImage) => void,
  markDirty: () => void,
  insertPos?: number,
): Promise<void> {
  if (result.tempPath && result.fileUrl) {
    insertImageFromRelativePath({
      editor,
      relativePath: result.relativePath,
      addQueuedImage,
      markDirty,
      insertPos,
      staged: {
        tempPath: result.tempPath,
        relativePath: result.relativePath,
        fileUrl: result.fileUrl,
      },
    });
    return;
  }

  insertImageFromRelativePath({
    editor,
    relativePath: result.relativePath,
    addQueuedImage,
    markDirty,
    insertPos,
  });
}

export function getImageFileFromFileList(files: FileList | File[]): File | null {
  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/')) {
      return file;
    }
  }

  return null;
}

export async function resolveImageSrcForDisplay(
  src: string,
  docPath: string,
  queuedImages: QueuedImage[],
): Promise<string> {
  if (!src || isRemoteImageSrc(src)) {
    return src;
  }

  if (isUntitledPath(docPath)) {
    const queued = queuedImages.find((image) => image.relativePath === src);
    if (queued) {
      return window.electronAPI.resolveAbsoluteAssetUrl(queued.tempPath);
    }
  }

  if (isUntitledPath(docPath)) {
    return src;
  }

  return window.electronAPI.resolveAssetUrl(docPath, src);
}
