import { useEditor } from '@tiptap/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { MenuAction } from '../../../ipc/channels';
import { LinkDialog } from '../dialogs/LinkDialog';
import { MathDialog } from '../dialogs/MathDialog';
import { TableInsertDialog } from '../dialogs/TableInsertDialog';
import { EditorLayout } from './EditorLayout';
import { createEditorExtensions } from '../../editor/editorExtensions';
import { applyFormatMenuAction } from '../../editor/formatMenuActions';
import {
  insertBlockMath,
  insertCodeBlock,
} from '../../editor/formatCommands';
import { setMathClickHandlerForEditor } from '../../extensions/mathExtension';
import { cn } from '../../utils/cn';
import { useTabDocument } from '../../hooks/useTabDocument';
import { useEditorImageHandlers } from '../../hooks/useEditorImageHandlers';
import { useEditorDialogs } from '../../hooks/useEditorDialogs';
import { prepareMarkdownForEditor, type QueuedImage } from '../../utils/markdown';
import { resolveImageSrcForDisplay } from '../../utils/insertImage';
import type { EditorTab, TabEditorHandle } from '../../types/workspace';
import { isUntitledPath } from '../../types/workspace';
import type { Editor } from '@tiptap/react';
import {
  EditorTabProvider,
  type EditorTabContextValue,
} from '../../contexts/EditorTabContext';

export interface WorkspaceTabPanelHandle {
  runMenuAction: (action: MenuAction) => boolean;
  openFindBar: (query?: string, matchIndex?: number) => void;
  closeFindBar: () => void;
  openLinkDialog: () => void;
  openTableDialog: () => void;
  insertImage: () => void;
  insertCode: () => void;
  insertMath: () => void;
}

interface WorkspaceTabPanelProps {
  tab: EditorTab;
  isActive: boolean;
  zoom: number;
  onRegister: (handle: TabEditorHandle) => void;
  onUnregister: (tabId: string) => void;
  onDirtyChange: (tabId: string, dirty: boolean) => void;
  onSaveAs: (tabId: string, newPath: string) => void;
  onRegisterPanelHandle: (handle: WorkspaceTabPanelHandle) => void;
}

export function WorkspaceTabPanel({
  tab,
  isActive,
  zoom,
  onRegister,
  onUnregister,
  onDirtyChange,
  onSaveAs,
  onRegisterPanelHandle,
}: WorkspaceTabPanelProps) {
  const markDirtyRef = useRef<(() => void) | null>(null);
  const loadedEpochRef = useRef(-1);
  const dirtyRef = useRef(tab.dirty);
  const editorRef = useRef<Editor | null>(null);
  const imageContextRef = useRef<{
    docPath: string;
    addQueuedImage: ((image: QueuedImage) => void) | null;
    markDirty: (() => void) | null;
    queuedImages: QueuedImage[];
  }>({
    docPath: tab.filePath,
    addQueuedImage: null,
    markDirty: null,
    queuedImages: [],
  });

  dirtyRef.current = tab.dirty;

  const { imageEditorProps, handleInsertImage } = useEditorImageHandlers(
    editorRef,
    imageContextRef,
  );

  const dialogs = useEditorDialogs();

  const handleDirtyChange = useCallback(
    (dirty: boolean) => {
      onDirtyChange(tab.id, dirty);
    },
    [onDirtyChange, tab.id],
  );

  const editor = useEditor({
    extensions: createEditorExtensions(),
    editorProps: imageEditorProps,
    onUpdate: () => {
      markDirtyRef.current?.();
    },
  });

  editorRef.current = editor;

  const {
    markDirty,
    getMarkdownContent,
    saveDocument,
    saveDocumentAs,
    addQueuedImage,
    queuedImages,
    setSuppressDirty,
  } = useTabDocument({
    editor,
    filePath: tab.filePath,
    onDirtyChange: handleDirtyChange,
  });

  markDirtyRef.current = markDirty;

  useEffect(() => {
    imageContextRef.current = {
      docPath: tab.filePath,
      addQueuedImage,
      markDirty,
      queuedImages,
    };
  }, [addQueuedImage, markDirty, queuedImages, tab.filePath]);

  const tabContextValue = useMemo((): EditorTabContextValue => ({
    docPath: tab.filePath,
    resolveImageSrc: (src) =>
      resolveImageSrcForDisplay(src, tab.filePath, queuedImages),
    repairContext: {
      docPath: tab.filePath,
      addQueuedImage,
      markDirty,
    },
  }), [addQueuedImage, markDirty, queuedImages, tab.filePath]);

  const loadContent = useCallback(async () => {
    if (!editor) {
      return;
    }

    setSuppressDirty(true);
    const prepared = isUntitledPath(tab.filePath)
      ? tab.initialContent
      : await prepareMarkdownForEditor(tab.initialContent);
    editor.commands.setContent(prepared, { contentType: 'markdown' });
    loadedEpochRef.current = tab.contentEpoch;
    setSuppressDirty(false);
  }, [editor, setSuppressDirty, tab.contentEpoch, tab.filePath, tab.initialContent]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (loadedEpochRef.current !== tab.contentEpoch) {
      void loadContent();
    }
  }, [editor, loadContent, tab.contentEpoch]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handle: TabEditorHandle = {
      tabId: tab.id,
      filePath: tab.filePath,
      editor,
      get dirty() {
        return dirtyRef.current;
      },
      getMarkdownContent,
      saveDocument: async () => {
        if (isUntitledPath(tab.filePath)) {
          const result = await saveDocumentAs();
          if (result.success && result.path) {
            onSaveAs(tab.id, result.path);
          }
          return result.success;
        }
        return saveDocument();
      },
      saveDocumentAs: async () => {
        const result = await saveDocumentAs();
        if (result.success && result.path) {
          onSaveAs(tab.id, result.path);
        }
        return result.success;
      },
    };

    onRegister(handle);

    return () => {
      onUnregister(tab.id);
    };
  }, [
    editor,
    getMarkdownContent,
    onRegister,
    onSaveAs,
    onUnregister,
    saveDocument,
    saveDocumentAs,
    tab.filePath,
    tab.id,
  ]);

  const onInsertImage = useCallback(() => {
    void handleInsertImage(editor, tab.filePath, addQueuedImage, markDirty);
  }, [addQueuedImage, editor, handleInsertImage, markDirty, tab.filePath]);

  const onInsertCode = useCallback(() => {
    if (editor) {
      insertCodeBlock(editor);
    }
  }, [editor]);

  const onInsertMath = useCallback(() => {
    if (editor) {
      insertBlockMath(editor);
    }
  }, [editor]);

  useEffect(() => {
    if (!editor || !isActive) {
      if (editor) {
        setMathClickHandlerForEditor(editor, null);
      }
      return;
    }

    setMathClickHandlerForEditor(editor, (node, pos) => {
      dialogs.openMathEditor(node.attrs.latex, pos);
    });

    return () => {
      setMathClickHandlerForEditor(editor, null);
    };
  }, [dialogs, editor, isActive]);

  const insertHandlers = useMemo(
    () => ({
      onInsertLink: () => dialogs.setShowLinkDialog(true),
      onInsertTable: () => dialogs.setShowTableDialog(true),
      onInsertImage,
      onInsertCode,
      onInsertMath,
    }),
    [dialogs, onInsertCode, onInsertImage, onInsertMath],
  );

  const panelHandleRef = useRef<WorkspaceTabPanelHandle>({
    runMenuAction: () => false,
    openFindBar: dialogs.openFindBar,
    closeFindBar: dialogs.closeFindBar,
    openLinkDialog: () => dialogs.setShowLinkDialog(true),
    openTableDialog: () => dialogs.setShowTableDialog(true),
    insertImage: onInsertImage,
    insertCode: onInsertCode,
    insertMath: onInsertMath,
  });

  panelHandleRef.current = {
    runMenuAction: (action: MenuAction) => {
      if (action === 'find') {
        dialogs.openFindBar();
        return true;
      }

      if (!editor) {
        return false;
      }
      return applyFormatMenuAction(action, editor, tab.filePath, insertHandlers);
    },
    openFindBar: dialogs.openFindBar,
    closeFindBar: dialogs.closeFindBar,
    openLinkDialog: () => dialogs.setShowLinkDialog(true),
    openTableDialog: () => dialogs.setShowTableDialog(true),
    insertImage: onInsertImage,
    insertCode: onInsertCode,
    insertMath: onInsertMath,
  };

  useEffect(() => {
    onRegisterPanelHandle(panelHandleRef.current);
  }, [editor, insertHandlers, onRegisterPanelHandle, tab.filePath, dialogs]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute inset-0 flex min-h-0 flex-1 flex-col',
        !isActive && 'hidden',
      )}
      role="tabpanel"
      aria-hidden={!isActive}
    >
      <EditorTabProvider value={tabContextValue}>
        <EditorLayout
          editor={editor}
          zoom={zoom}
          isActive={isActive}
          showFindBar={dialogs.showFindBar}
          findBarRequestId={dialogs.findBarRequestId}
          findBarQuery={dialogs.findBarQuery}
          findBarMatchIndex={dialogs.findBarMatchIndex}
          onInsertLink={() => dialogs.setShowLinkDialog(true)}
          onInsertTable={() => dialogs.setShowTableDialog(true)}
          onInsertImage={onInsertImage}
          onInsertCode={onInsertCode}
          onInsertMath={onInsertMath}
          onCloseFindBar={dialogs.closeFindBar}
        />

        {dialogs.showLinkDialog && isActive && (
          <LinkDialog
            initialUrl={editor.getAttributes('link').href as string | undefined}
            onConfirm={(url) => dialogs.applyLink(editor, url)}
            onCancel={() => dialogs.setShowLinkDialog(false)}
          />
        )}

        {dialogs.showTableDialog && isActive && (
          <TableInsertDialog
            onConfirm={(rows, cols) =>
              dialogs.handleInsertTable(editor, rows, cols)
            }
            onCancel={() => dialogs.setShowTableDialog(false)}
          />
        )}

        {dialogs.showMathDialog && isActive && (
          <MathDialog
            initialLatex={dialogs.mathInitialLatex}
            onConfirm={(latex) => dialogs.applyMath(editor, latex)}
            onCancel={dialogs.closeMathEditor}
          />
        )}
      </EditorTabProvider>
    </div>
  );
}

// Re-export for backward compatibility during migration
export { applyFormatMenuAction } from '../../editor/formatMenuActions';
