import { EditorContent, type Editor } from '@tiptap/react';
import { Toolbar } from './Toolbar';
import { FindBar } from './FindBar';
import { StatusBar } from '../shell/StatusBar';

interface EditorLayoutProps {
  editor: Editor;
  zoom: number;
  isActive: boolean;
  showFindBar: boolean;
  findBarRequestId: number;
  findBarQuery?: string;
  findBarMatchIndex?: number;
  onInsertLink: () => void;
  onInsertTable: () => void;
  onInsertImage: () => void;
  onInsertCode: () => void;
  onInsertMath: () => void;
  onCloseFindBar: () => void;
}

export function EditorLayout({
  editor,
  zoom,
  isActive,
  showFindBar,
  findBarRequestId,
  findBarQuery,
  findBarMatchIndex,
  onInsertLink,
  onInsertTable,
  onInsertImage,
  onInsertCode,
  onInsertMath,
  onCloseFindBar,
}: EditorLayoutProps) {
  return (
    <>
      <header className="relative shrink-0 border-b border-gray-200 bg-white">
        <Toolbar
          editor={editor}
          onInsertLink={onInsertLink}
          onInsertTable={onInsertTable}
          onInsertImage={onInsertImage}
          onInsertCode={onInsertCode}
          onInsertMath={onInsertMath}
        />
        {showFindBar && isActive && (
          <FindBar
            key={findBarRequestId}
            editor={editor}
            initialQuery={findBarQuery}
            initialMatchIndex={findBarMatchIndex}
            onClose={onCloseFindBar}
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
    </>
  );
}
