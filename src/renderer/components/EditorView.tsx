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
import { useDocument } from '../hooks/useDocument';
import { getPrintableHtml } from '../utils/print';
import { getFileName } from '../utils/markdown';
import { CodeBlockExtension } from '../extensions/codeBlockExtension';

interface EditorViewProps {
  initialContent?: string;
  initialPath?: string | null;
  onNavigateWelcome: () => void;
}

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

export function EditorView({
  initialContent = '',
  initialPath = null,
  onNavigateWelcome,
}: EditorViewProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
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
    filePath,
    fileName,
    dirty,
    markDirty,
    loadContent,
    addQueuedImage,
  } = useDocument({
    editor,
    onNavigateWelcome,
  });

  markDirtyRef.current = markDirty;

  useEffect(() => {
    if (!editor) {
      return;
    }

    void loadContent(initialContent, initialPath);
  }, [editor, initialContent, initialPath]);

  const handleInsertImage = useCallback(async () => {
    if (!editor) {
      return;
    }

    const sourcePath = await window.electronAPI.openImage();
    if (!sourcePath) {
      return;
    }

    if (filePath) {
      const { relativePath } = await window.electronAPI.copyImageForDocument(
        sourcePath,
        filePath,
      );
      const fileUrl = await window.electronAPI.resolveAssetUrl(
        filePath,
        relativePath,
      );
      editor.chain().focus().setImage({ src: fileUrl }).run();
      markDirty();
      return;
    }

    const staged = await window.electronAPI.stageImage(sourcePath);
    editor.chain().focus().setImage({ src: staged.fileUrl }).run();
    addQueuedImage(staged);
  }, [addQueuedImage, editor, filePath, markDirty]);

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
          const baseName = getFileName(filePath).replace(/\.md$/i, '') || 'Untitled';
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
    [editor, filePath, handleInsertCode, handleInsertImage],
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

  return (
    <div className="editor-view">
      <header className="editor-header">
        <div className="document-title">
          <span className="document-name">
            {dirty ? '*' : ''}
            {fileName}
          </span>
        </div>
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
    </div>
  );
}
