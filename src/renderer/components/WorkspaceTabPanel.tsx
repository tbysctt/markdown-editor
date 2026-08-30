import { useEditor, EditorContent } from '@tiptap/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MenuAction } from '../../ipc/channels';
import { Toolbar } from './Toolbar';
import { FindBar } from './FindBar';
import { LinkDialog } from './LinkDialog';
import { MathDialog } from './MathDialog';
import { TableInsertDialog } from './TableInsertDialog';
import { StatusBar } from './StatusBar';
import { createEditorExtensions } from '../editor/editorExtensions';
import {
  DEFAULT_MATH_LATEX,
  setBlockMathClickHandler,
} from '../extensions/mathExtension';
import {
  setImageDocPathProvider,
  setImageRepairContext,
  setImageSrcResolver,
} from '../extensions/imageExtension';
import { editorProps } from '../editor/editorConfig';
import { cn } from '../utils/cn';
import { useTabDocument } from '../hooks/useTabDocument';
import { getPrintableHtml } from '../utils/print';
import { getFileName, prepareMarkdownForEditor, type QueuedImage } from '../utils/markdown';
import {
  getImageFileFromFileList,
  insertImageFromSavedResult,
  insertImageFromSource,
  resolveImageSrcForDisplay,
} from '../utils/insertImage';
import type { EditorTab, TabEditorHandle } from '../types/workspace';
import { isUntitledPath } from '../types/workspace';
import type { Editor } from '@tiptap/react';
import type { EditorView } from '@tiptap/pm/view';

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
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showMathDialog, setShowMathDialog] = useState(false);
  const [mathEditPos, setMathEditPos] = useState<number | null>(null);
  const [mathInitialLatex, setMathInitialLatex] = useState('');
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showFindBar, setShowFindBar] = useState(false);
  const [findBarQuery, setFindBarQuery] = useState<string | undefined>();
  const [findBarMatchIndex, setFindBarMatchIndex] = useState<number | undefined>();
  const [findBarRequestId, setFindBarRequestId] = useState(0);
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
    [],
  );

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

  useEffect(() => {
    if (!isActive) {
      setImageDocPathProvider(() => '');
      setImageSrcResolver(null);
      setImageRepairContext(null);
      return;
    }

    setImageDocPathProvider(() => tab.filePath);
    setImageSrcResolver((src) =>
      resolveImageSrcForDisplay(src, tab.filePath, imageContextRef.current.queuedImages),
    );
    setImageRepairContext({
      docPath: tab.filePath,
      addQueuedImage,
      markDirty,
    });

    return () => {
      setImageDocPathProvider(() => '');
      setImageSrcResolver(null);
      setImageRepairContext(null);
    };
  }, [addQueuedImage, isActive, markDirty, queuedImages, tab.filePath]);

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

  const handleInsertImage = useCallback(async () => {
    if (!editor) {
      return;
    }

    const sourcePath = await window.electronAPI.openImage();
    if (!sourcePath) {
      return;
    }

    await insertImageFromSource({
      editor,
      docPath: tab.filePath,
      sourcePath,
      addQueuedImage,
      markDirty,
    });
  }, [addQueuedImage, editor, markDirty, tab.filePath]);

  const handleInsertCode = useCallback(() => {
    editor?.chain().focus().setCodeBlock({ language: null }).run();
  }, [editor]);

  const handleInsertMath = useCallback(() => {
    editor?.chain().focus().insertBlockMath({ latex: DEFAULT_MATH_LATEX }).run();
  }, [editor]);

  const applyMath = useCallback(
    (latex: string) => {
      if (!editor || mathEditPos === null) {
        return;
      }

      const node = editor.state.doc.nodeAt(mathEditPos);
      if (!node) {
        return;
      }

      const chain = editor.chain().setNodeSelection(mathEditPos);
      if (node.type.name === 'inlineMath') {
        chain.updateInlineMath({ latex });
      } else {
        chain.updateBlockMath({ latex });
      }
      chain.focus().run();

      setShowMathDialog(false);
      setMathEditPos(null);
      setMathInitialLatex('');
    },
    [editor, mathEditPos],
  );

  useEffect(() => {
    if (!isActive) {
      setBlockMathClickHandler(null);
      return;
    }

    setBlockMathClickHandler((node, pos) => {
      setMathInitialLatex(node.attrs.latex);
      setMathEditPos(pos);
      setShowMathDialog(true);
    });

    return () => {
      setBlockMathClickHandler(null);
    };
  }, [isActive]);

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
    openFindBar: () => setShowFindBar(true),
    closeFindBar: () => setShowFindBar(false),
    openLinkDialog: () => setShowLinkDialog(true),
    openTableDialog: () => setShowTableDialog(true),
    insertImage: () => void handleInsertImage(),
    insertCode: handleInsertCode,
    insertMath: handleInsertMath,
  });

  panelHandleRef.current = {
    runMenuAction: (action: MenuAction) => {
      if (action === 'find') {
        setFindBarQuery(undefined);
        setFindBarMatchIndex(undefined);
        setFindBarRequestId((current) => current + 1);
        setShowFindBar(true);
        return true;
      }

      if (!editor) {
        return false;
      }
      return applyFormatMenuAction(action, editor, tab.filePath, {
        onInsertLink: () => setShowLinkDialog(true),
        onInsertTable: () => setShowTableDialog(true),
        onInsertImage: () => void handleInsertImage(),
        onInsertCode: handleInsertCode,
        onInsertMath: handleInsertMath,
      });
    },
    openFindBar: (query?: string, matchIndex?: number) => {
      setFindBarQuery(query);
      setFindBarMatchIndex(matchIndex);
      setFindBarRequestId((current) => current + 1);
      setShowFindBar(true);
    },
    closeFindBar: () => {
      setShowFindBar(false);
      setFindBarQuery(undefined);
      setFindBarMatchIndex(undefined);
    },
    openLinkDialog: () => setShowLinkDialog(true),
    openTableDialog: () => setShowTableDialog(true),
    insertImage: () => void handleInsertImage(),
    insertCode: handleInsertCode,
    insertMath: handleInsertMath,
  };

  useEffect(() => {
    onRegisterPanelHandle(panelHandleRef.current);
  }, [
    editor,
    handleInsertCode,
    handleInsertImage,
    handleInsertMath,
    onRegisterPanelHandle,
    tab.filePath,
  ]);

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
      <header className="relative shrink-0 border-b border-gray-200 bg-white">
        <Toolbar
          editor={editor}
          onInsertLink={() => setShowLinkDialog(true)}
          onInsertTable={() => setShowTableDialog(true)}
          onInsertImage={() => void handleInsertImage()}
          onInsertCode={handleInsertCode}
          onInsertMath={handleInsertMath}
        />
        {showFindBar && isActive && (
          <FindBar
            key={findBarRequestId}
            editor={editor}
            initialQuery={findBarQuery}
            initialMatchIndex={findBarMatchIndex}
            onClose={() => {
              setShowFindBar(false);
              setFindBarQuery(undefined);
              setFindBarMatchIndex(undefined);
            }}
          />
        )}
      </header>

      <main className="flex-1 overflow-auto px-4 py-8">
        <div
          className="mx-auto min-h-[calc(100vh-10rem)] max-w-[800px] origin-top rounded bg-white px-16 py-12 shadow-sm transition-transform duration-150"
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

      {showMathDialog && isActive && (
        <MathDialog
          initialLatex={mathInitialLatex}
          onConfirm={applyMath}
          onCancel={() => {
            setShowMathDialog(false);
            setMathEditPos(null);
            setMathInitialLatex('');
          }}
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
    onInsertMath: () => void;
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
    case 'format-heading-6':
      editor.chain().focus().toggleHeading({ level: 6 }).run();
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
    case 'format-math':
      handlers.onInsertMath();
      return true;
    default:
      return false;
  }
}
