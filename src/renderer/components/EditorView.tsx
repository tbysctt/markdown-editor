import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import { useEffect, useRef, useState } from 'react';
import { Toolbar } from './Toolbar';
import { LinkDialog } from './LinkDialog';
import { TableInsertDialog } from './TableInsertDialog';
import { useDocument } from '../hooks/useDocument';

interface EditorViewProps {
  initialContent?: string;
  initialPath?: string | null;
  onNavigateWelcome: () => void;
}

export function EditorView({
  initialContent = '',
  initialPath = null,
  onNavigateWelcome,
}: EditorViewProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const markDirtyRef = useRef<(() => void) | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5] },
      }),
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
  }, [editor, initialContent, initialPath, loadContent]);

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

  const handleInsertImage = async () => {
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
        />
      </header>

      <main className="editor-main">
        <div className="editor-paper">
          <EditorContent editor={editor} />
        </div>
      </main>

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
