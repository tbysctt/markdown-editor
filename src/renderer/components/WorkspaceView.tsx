import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TableKit } from '@tiptap/extension-table';
import { CharacterCount } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuAction } from '../../ipc/channels';
import { Toolbar } from './Toolbar';
import { LinkDialog } from './LinkDialog';
import { TableInsertDialog } from './TableInsertDialog';
import { StatusBar } from './StatusBar';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { NamePromptDialog } from './NamePromptDialog';
import { useWorkspace } from '../hooks/useWorkspace';
import { getPrintableHtml } from '../utils/print';
import { getFileName } from '../utils/markdown';
import type { OpenTabOptions } from '../types/workspace';
import { CodeBlockExtension } from '../extensions/codeBlockExtension';

interface WorkspaceViewProps {
  rootPath: string;
}

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

export function WorkspaceView({ rootPath }: WorkspaceViewProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [namePrompt, setNamePrompt] = useState<{
    type: 'file' | 'folder';
    parentDir: string;
  } | null>(null);
  const [zoom, setZoom] = useState(100);
  const markDirtyRef = useRef<(() => void) | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5] },
        codeBlock: false,
      }),
      CodeBlockExtension,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TableKit.configure({
        table: { resizable: true },
      }),
      CharacterCount,
      Markdown,
    ],
    editorProps: {
      attributes: {
        class: 'editor-content',
      },
    },
    onUpdate: () => {
      markDirtyRef.current?.();
    },
  });

  const {
    tabs,
    activeTabId,
    activeFilePath,
    tree,
    selectedPath,
    setSelectedPath,
    getCreateParentDir,
    createExplorerFile,
    createExplorerFolder,
    deleteExplorerPath,
    openTab,
    closeTab,
    switchTab,
    pinTab,
    markActiveTabDirty,
  } = useWorkspace({ editor, rootPath });

  markDirtyRef.current = markActiveTabDirty;

  const handleOpenFile = useCallback(
    (filePath: string, options?: OpenTabOptions) => {
      void openTab(filePath, options);
    },
    [openTab],
  );

  const handleNewFile = useCallback(
    (parentDir?: string) => {
      setNamePrompt({
        type: 'file',
        parentDir: getCreateParentDir(parentDir),
      });
    },
    [getCreateParentDir],
  );

  const handleNewFolder = useCallback(
    (parentDir?: string) => {
      setNamePrompt({
        type: 'folder',
        parentDir: getCreateParentDir(parentDir),
      });
    },
    [getCreateParentDir],
  );

  const handleDelete = useCallback(
    (targetPath: string, isDirectory: boolean) => {
      void deleteExplorerPath(targetPath, isDirectory);
    },
    [deleteExplorerPath],
  );

  const handleNamePromptConfirm = useCallback(
    (name: string) => {
      if (!namePrompt) {
        return;
      }

      if (namePrompt.type === 'file') {
        void createExplorerFile(namePrompt.parentDir, name);
      } else {
        void createExplorerFolder(namePrompt.parentDir, name);
      }
      setNamePrompt(null);
    },
    [createExplorerFile, createExplorerFolder, namePrompt],
  );

  const handleInsertImage = useCallback(async () => {
    if (!editor || !activeFilePath) {
      return;
    }

    const sourcePath = await window.electronAPI.openImage();
    if (!sourcePath) {
      return;
    }

    const { relativePath } = await window.electronAPI.copyImageForDocument(
      sourcePath,
      activeFilePath,
    );
    const fileUrl = await window.electronAPI.resolveAssetUrl(
      activeFilePath,
      relativePath,
    );
    editor.chain().focus().setImage({ src: fileUrl }).run();
    markActiveTabDirty();
  }, [activeFilePath, editor, markActiveTabDirty]);

  const handleInsertCode = useCallback(() => {
    if (!editor) {
      return;
    }

    editor.chain().focus().setCodeBlock({ language: null }).run();
  }, [editor]);

  const handleMenuAction = useCallback(
    (action: MenuAction) => {
      if (!editor) {
        return;
      }

      switch (action) {
        case 'export-pdf': {
          if (!activeFilePath) {
            return;
          }
          const baseName =
            getFileName(activeFilePath).replace(/\.md$/i, '') || 'Untitled';
          void window.electronAPI.exportPdf({
            html: getPrintableHtml(editor),
            defaultFileName: `${baseName}.pdf`,
          });
          break;
        }
        case 'print':
          void window.electronAPI.printDocument({
            html: getPrintableHtml(editor),
          });
          break;
        case 'zoom-in':
          setZoom((current) => Math.min(ZOOM_MAX, current + ZOOM_STEP));
          break;
        case 'zoom-out':
          setZoom((current) => Math.max(ZOOM_MIN, current - ZOOM_STEP));
          break;
        case 'zoom-reset':
          setZoom(100);
          break;
        case 'format-bold':
          editor.chain().focus().toggleBold().run();
          break;
        case 'format-italic':
          editor.chain().focus().toggleItalic().run();
          break;
        case 'format-strikethrough':
          editor.chain().focus().toggleStrike().run();
          break;
        case 'format-heading-1':
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case 'format-heading-2':
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case 'format-heading-3':
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case 'format-heading-4':
          editor.chain().focus().toggleHeading({ level: 4 }).run();
          break;
        case 'format-heading-5':
          editor.chain().focus().toggleHeading({ level: 5 }).run();
          break;
        case 'format-body':
          editor.chain().focus().setParagraph().run();
          break;
        case 'format-bullet-list':
          editor.chain().focus().toggleBulletList().run();
          break;
        case 'format-ordered-list':
          editor.chain().focus().toggleOrderedList().run();
          break;
        case 'format-task-list':
          editor.chain().focus().toggleTaskList().run();
          break;
        case 'format-blockquote':
          editor.chain().focus().toggleBlockquote().run();
          break;
        case 'format-link':
          setShowLinkDialog(true);
          break;
        case 'format-table':
          setShowTableDialog(true);
          break;
        case 'format-image':
          void handleInsertImage();
          break;
        case 'format-code-snippet':
          handleInsertCode();
          break;
        default:
          break;
      }
    },
    [activeFilePath, editor, handleInsertCode, handleInsertImage],
  );

  useEffect(() => {
    const unsubscribe = window.electronAPI.onMenuAction((action) => {
      const editorActions: MenuAction[] = [
        'export-pdf',
        'print',
        'zoom-in',
        'zoom-out',
        'zoom-reset',
        'format-bold',
        'format-italic',
        'format-strikethrough',
        'format-heading-1',
        'format-heading-2',
        'format-heading-3',
        'format-heading-4',
        'format-heading-5',
        'format-body',
        'format-bullet-list',
        'format-ordered-list',
        'format-task-list',
        'format-blockquote',
        'format-link',
        'format-table',
        'format-image',
        'format-code-snippet',
      ];

      if (editorActions.includes(action)) {
        handleMenuAction(action);
      }
    });

    return unsubscribe;
  }, [handleMenuAction]);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onOpenDocument((document) => {
      void openTab(document.path, { preview: false, content: document.content });
    });

    return unsubscribe;
  }, [openTab]);

  const applyLink = (url: string) => {
    if (!editor) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }

    setShowLinkDialog(false);
  };

  const handleInsertTable = (rows: number, cols: number) => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run();
    setShowTableDialog(false);
  };

  if (!editor) {
    return null;
  }

  const hasActiveTab = activeTabId !== null;

  return (
    <div className="workspace-view">
      <Sidebar
        rootPath={rootPath}
        tree={tree}
        activeFilePath={activeFilePath}
        selectedPath={selectedPath}
        onSelect={setSelectedPath}
        onOpenFile={handleOpenFile}
        onNewFile={handleNewFile}
        onNewFolder={handleNewFolder}
        onDelete={handleDelete}
      />
      <div className="workspace-main">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={(tabId) => void switchTab(tabId)}
          onCloseTab={(tabId) => void closeTab(tabId)}
          onPinTab={pinTab}
        />
        <div className="editor-view">
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
            {hasActiveTab ? (
              <div
                className="editor-paper"
                style={{ transform: `scale(${zoom / 100})` }}
              >
                <EditorContent editor={editor} />
              </div>
            ) : (
              <div className="workspace-empty">
                <p>Select a markdown file from the sidebar to begin editing.</p>
              </div>
            )}
          </main>

          {hasActiveTab && <StatusBar editor={editor} zoom={zoom} />}
        </div>
      </div>

      {showLinkDialog && (
        <LinkDialog
          initialUrl={editor.getAttributes('link').href as string | undefined}
          onConfirm={applyLink}
          onCancel={() => setShowLinkDialog(false)}
        />
      )}

      {showTableDialog && (
        <TableInsertDialog
          onConfirm={handleInsertTable}
          onCancel={() => setShowTableDialog(false)}
        />
      )}

      {namePrompt && (
        <NamePromptDialog
          title={namePrompt.type === 'file' ? 'New File' : 'New Folder'}
          label={namePrompt.type === 'file' ? 'File name' : 'Folder name'}
          defaultValue={
            namePrompt.type === 'file' ? 'Untitled.md' : 'New Folder'
          }
          confirmLabel="Create"
          onConfirm={handleNamePromptConfirm}
          onCancel={() => setNamePrompt(null)}
        />
      )}
    </div>
  );
}
