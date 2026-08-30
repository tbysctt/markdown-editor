import { useCallback, useMemo, type MutableRefObject } from 'react';
import type { Editor } from '@tiptap/react';
import type { EditorView } from '@tiptap/pm/view';
import { editorProps } from '../editor/editorConfig';
import type { QueuedImage } from '../utils/markdown';
import { isUntitledPath } from '../types/workspace';
import {
  getImageFileFromFileList,
  insertImageFromSavedResult,
  insertImageFromSource,
} from '../utils/insertImage';

interface ImageContextState {
  docPath: string;
  addQueuedImage: ((image: QueuedImage) => void) | null;
  markDirty: (() => void) | null;
  queuedImages: QueuedImage[];
}

export function useEditorImageHandlers(
  editorRef: MutableRefObject<Editor | null>,
  imageContextRef: MutableRefObject<ImageContextState>,
) {
  const imageEditorProps = useMemo(
    () => ({
      ...editorProps,
      handleDrop: (
        view: EditorView,
        event: DragEvent,
        _slice: unknown,
        moved: boolean,
      ) => {
        if (moved) {
          return false;
        }

        const imageFile = getImageFileFromFileList(
          event.dataTransfer?.files ?? [],
        );
        if (!imageFile) {
          return false;
        }

        const editor = editorRef.current;
        if (!editor) {
          return false;
        }

        event.preventDefault();

        const coords = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        const ctx = imageContextRef.current;
        const addQueuedImage = ctx.addQueuedImage;
        const markDirtyFn = ctx.markDirty;
        if (!addQueuedImage || !markDirtyFn) {
          return false;
        }

        const sourcePath = window.electronAPI.getPathForFile(imageFile);
        if (sourcePath) {
          void insertImageFromSource({
            editor,
            docPath: ctx.docPath,
            sourcePath,
            addQueuedImage,
            markDirty: markDirtyFn,
            insertPos: coords?.pos,
          });
          return true;
        }

        void (async () => {
          const bytes = await imageFile.arrayBuffer();
          const docPath = isUntitledPath(ctx.docPath) ? null : ctx.docPath;
          const result = await window.electronAPI.saveImageBytes({
            bytes,
            fileName: imageFile.name || 'dropped-image.png',
            docPath,
          });
          await insertImageFromSavedResult(
            editor,
            ctx.docPath,
            result,
            addQueuedImage,
            markDirtyFn,
            coords?.pos,
          );
        })();

        return true;
      },
      handlePaste: (_view: EditorView, event: ClipboardEvent) => {
        const editor = editorRef.current;
        if (!editor || !event.clipboardData) {
          return false;
        }

        const ctx = imageContextRef.current;
        const addQueuedImage = ctx.addQueuedImage;
        const markDirtyFn = ctx.markDirty;
        if (!addQueuedImage || !markDirtyFn) {
          return false;
        }

        const plainText = event.clipboardData.getData('text/plain').trim();
        const imageFile = getImageFileFromFileList(event.clipboardData.files);

        const insertFromFile = async (file: File) => {
          const sourcePath = window.electronAPI.getPathForFile(file);
          if (sourcePath) {
            await insertImageFromSource({
              editor,
              docPath: ctx.docPath,
              sourcePath,
              addQueuedImage,
              markDirty: markDirtyFn,
            });
            return;
          }

          const bytes = await file.arrayBuffer();
          const docPath = isUntitledPath(ctx.docPath) ? null : ctx.docPath;
          const result = await window.electronAPI.saveImageBytes({
            bytes,
            fileName: file.name || 'pasted-image.png',
            docPath,
          });
          await insertImageFromSavedResult(
            editor,
            ctx.docPath,
            result,
            addQueuedImage,
            markDirtyFn,
          );
        };

        if (imageFile) {
          event.preventDefault();
          void insertFromFile(imageFile);
          return true;
        }

        if (!plainText) {
          event.preventDefault();
          void (async () => {
            const docPath = isUntitledPath(ctx.docPath) ? null : ctx.docPath;
            const result = await window.electronAPI.saveClipboardImage(docPath);
            if (!result) {
              return;
            }

            await insertImageFromSavedResult(
              editor,
              ctx.docPath,
              result,
              addQueuedImage,
              markDirtyFn,
            );
          })();
          return true;
        }

        return false;
      },
    }),
    [editorRef, imageContextRef],
  );

  const handleInsertImage = useCallback(
    async (
      editor: Editor | null,
      docPath: string,
      addQueuedImage: (image: QueuedImage) => void,
      markDirty: () => void,
    ) => {
      if (!editor) {
        return;
      }

      const sourcePath = await window.electronAPI.openImage();
      if (!sourcePath) {
        return;
      }

      await insertImageFromSource({
        editor,
        docPath,
        sourcePath,
        addQueuedImage,
        markDirty,
      });
    },
    [],
  );

  return { imageEditorProps, handleInsertImage };
}
