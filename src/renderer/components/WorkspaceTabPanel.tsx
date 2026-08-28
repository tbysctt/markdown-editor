import { useEditor, EditorContent } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuAction } from '../../ipc/channels';
import { Toolbar } from './Toolbar';
import { LinkDialog } from './LinkDialog';
import { TableInsertDialog } from './TableInsertDialog';
import { StatusBar } from './StatusBar';
import { createEditorExtensions } from '../editor/editorExtensions';
import { editorProps } from '../editor/editorConfig';
import { useTabDocument } from '../hooks/useTabDocument';
import { getPrintableHtml } from '../utils/print';
import { getFileName, prepareMarkdownForEditor } from '../utils/markdown';
import type { EditorTab, TabEditorHandle } from '../types/workspace';
import { isUntitledPath } from '../types/workspace';

export interface WorkspaceTabPanelHandle {
  runMenuAction: (action: MenuAction) => boolean;
  openLinkDialog: () => void;
  openTableDialog: () => void;
  insertImage: () => void;
  insertCode: () => void;
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
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const markDirtyRef = useRef<(() => void) | null>(null);
  const loadedEpochRef = useRef(-1);
  const dirtyRef = useRef(tab.dirty);

  dirtyRef.current = tab.dirty;

  const handleDirtyChange = useCallback(
    (dirty: boolean) => {
      onDirtyChange(tab.id, dirty);
    },
    [onDirtyChange, tab.id],
  );

  const editor = useEditor({
    extensions: createEditorExtensions(),
    editorProps,
    onUpdate: () => {
      markDirtyRef.current?.();
    },
  });

  const {
    markDirty,
    getMarkdownContent,
    saveDocument,
    saveDocumentAs,
    addQueuedImage,
    setSuppressDirty,
  } = useTabDocument({
    editor,
    filePath: tab.filePath,
    onDirtyChange: handleDirtyChange,
  });

  markDirtyRef.current = markDirty;

  const loadContent = useCallback(async () => {
    if (!editor) {
      return;
    }

    setSuppressDirty(true);
    const prepared = isUntitledPath(tab.filePath)
      ? tab.initialContent
      : await prepareMarkdownForEditor(tab.initialContent, tab.filePath);
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

  const handleInsertImage = useCallback(async () => {
    if (!editor) {
      return;
    }

    const sourcePath = await window.electronAPI.openImage();
    if (!sourcePath) {
      return;
    }

    if (isUntitledPath(tab.filePath)) {
      const staged = await window.electronAPI.stageImage(sourcePath);
      editor.chain().focus().setImage({ src: staged.fileUrl }).run();
      addQueuedImage(staged);
      return;
    }

    const { relativePath } = await window.electronAPI.copyImageForDocument(
      sourcePath,
      tab.filePath,
    );
    const fileUrl = await window.electronAPI.resolveAssetUrl(
      tab.filePath,
      relativePath,
    );
    editor.chain().focus().setImage({ src: fileUrl }).run();
    markDirty();
  }, [addQueuedImage, editor, markDirty, tab.filePath]);

  const handleInsertCode = useCallback(() => {
    editor?.chain().focus().setCodeBlock({ language: null }).run();
  }, [editor]);

  const applyLink = useCallback(
    (url: string) => {
      if (!editor) {
        return;
      }

      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }

      setShowLinkDialog(false);
    },
    [editor],
  );

  const handleInsertTable = useCallback(
    (rows: number, cols: number) => {
      editor
        ?.chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
      setShowTableDialog(false);
    },
    [editor],
  );

  const panelHandleRef = useRef<WorkspaceTabPanelHandle>({
    runMenuAction: () => false,
    openLinkDialog: () => setShowLinkDialog(true),
    openTableDialog: () => setShowTableDialog(true),
    insertImage: () => void handleInsertImage(),
    insertCode: handleInsertCode,
  });

  panelHandleRef.current = {
    runMenuAction: (action: MenuAction) => {
      if (!editor) {
        return false;
      }
      return applyFormatMenuAction(action, editor, tab.filePath, {
        onInsertLink: () => setShowLinkDialog(true),
        onInsertTable: () => setShowTableDialog(true),
        onInsertImage: () => void handleInsertImage(),
        onInsertCode: handleInsertCode,
      });
    },
    openLinkDialog: () => setShowLinkDialog(true),
    openTableDialog: () => setShowTableDialog(true),
    insertImage: () => void handleInsertImage(),
    insertCode: handleInsertCode,
  };

  useEffect(() => {
    onRegisterPanelHandle(panelHandleRef.current);
  }, [
    editor,
    handleInsertCode,
    handleInsertImage,
    onRegisterPanelHandle,
    tab.filePath,
  ]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className={`workspace-tab-panel${
        isActive ? '' : ' workspace-tab-panel--hidden'
      }`}
      role="tabpanel"
      aria-hidden={!isActive}
    >
      <header className="editor-header">
        <Toolbar
          editor={editor}
          onInsertLink={() => setShowLinkDialog(true)}
          onInsertTable={() => setShowTableDialog(true)}
          onInsertImage={() => void handleInsertImage()}
          onInsertCode={handleInsertCode}
        />
      </header>

      <main className="editor-main">
        <div
          className="editor-paper"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          <EditorContent editor={editor} />
        </div>
      </main>

      <StatusBar editor={editor} zoom={zoom} />

      {showLinkDialog && isActive && (
        <LinkDialog
          initialUrl={editor.getAttributes('link').href as string | undefined}
          onConfirm={applyLink}
          onCancel={() => setShowLinkDialog(false)}
        />
      )}

      {showTableDialog && isActive && (
        <TableInsertDialog
          onConfirm={handleInsertTable}
          onCancel={() => setShowTableDialog(false)}
        />
      )}
    </div>
  );
}

export function applyFormatMenuAction(
  action: MenuAction,
  editor: TabEditorHandle['editor'],
  filePath: string,
  handlers: {
    onInsertLink: () => void;
    onInsertTable: () => void;
    onInsertImage: () => void;
    onInsertCode: () => void;
  },
): boolean {
  switch (action) {
    case 'export-pdf': {
      const baseName = getFileName(filePath).replace(/\.md$/i, '') || 'Untitled';
      void window.electronAPI.exportPdf({
        html: getPrintableHtml(editor),
        defaultFileName: `${baseName}.pdf`,
      });
      return true;
    }
    case 'print':
      void window.electronAPI.printDocument({
        html: getPrintableHtml(editor),
      });
      return true;
    case 'format-bold':
      editor.chain().focus().toggleBold().run();
      return true;
    case 'format-italic':
      editor.chain().focus().toggleItalic().run();
      return true;
    case 'format-strikethrough':
      editor.chain().focus().toggleStrike().run();
      return true;
    case 'format-heading-1':
      editor.chain().focus().toggleHeading({ level: 1 }).run();
      return true;
    case 'format-heading-2':
      editor.chain().focus().toggleHeading({ level: 2 }).run();
      return true;
    case 'format-heading-3':
      editor.chain().focus().toggleHeading({ level: 3 }).run();
      return true;
    case 'format-heading-4':
      editor.chain().focus().toggleHeading({ level: 4 }).run();
      return true;
    case 'format-heading-5':
      editor.chain().focus().toggleHeading({ level: 5 }).run();
      return true;
    case 'format-body':
      editor.chain().focus().setParagraph().run();
      return true;
    case 'format-bullet-list':
      editor.chain().focus().toggleBulletList().run();
      return true;
    case 'format-ordered-list':
      editor.chain().focus().toggleOrderedList().run();
      return true;
    case 'format-task-list':
      editor.chain().focus().toggleTaskList().run();
      return true;
    case 'format-blockquote':
      editor.chain().focus().toggleBlockquote().run();
      return true;
    case 'format-link':
      handlers.onInsertLink();
      return true;
    case 'format-table':
      handlers.onInsertTable();
      return true;
    case 'format-image':
      handlers.onInsertImage();
      return true;
    case 'format-code-snippet':
      handlers.onInsertCode();
      return true;
    default:
      return false;
  }
}
