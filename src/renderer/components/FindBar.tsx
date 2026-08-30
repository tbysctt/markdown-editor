import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';

interface FindBarProps {
  editor: Editor;
  initialQuery?: string;
  initialMatchIndex?: number;
  onClose: () => void;
}

function getSelectedText(editor: Editor): string {
  const { from, to } = editor.state.selection;
  if (from === to) {
    return '';
  }
  return editor.state.doc.textBetween(from, to, ' ');
}

function getFindState(editor: Editor) {
  const storage = editor.storage.findAndReplace;
  const resultCount = storage.results.length;
  const currentIndex = storage.currentIndex;

  return {
    resultCount,
    currentLabel:
      resultCount === 0 || currentIndex === null
        ? 'No results'
        : `${currentIndex + 1} of ${resultCount}`,
  };
}

async function navigateToMatchIndex(
  editor: Editor,
  matchIndex: number,
): Promise<void> {
  const storage = editor.storage.findAndReplace;
  if (storage.results.length === 0 || matchIndex <= 0) {
    return;
  }

  await new Promise((resolve) => {
    window.setTimeout(resolve, 200);
  });

  for (let index = 0; index < matchIndex; index += 1) {
    editor.commands.goToNextResult();
  }
}

const findBtnClass =
  'inline-flex min-w-[1.625rem] h-[1.625rem] cursor-pointer items-center justify-center rounded border-none bg-transparent px-1 text-[0.8125rem] leading-none text-gray-600 hover:bg-gray-100 hover:text-[#1a1a1a]';

export function FindBar({
  editor,
  initialQuery,
  initialMatchIndex,
  onClose,
}: FindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(
    initialQuery ?? getSelectedText(editor) ?? '',
  );
  const [caseSensitive, setCaseSensitive] = useState(
    editor.storage.findAndReplace.caseSensitive,
  );
  const [findState, setFindState] = useState(() => getFindState(editor));
  const pendingMatchIndexRef = useRef(initialMatchIndex ?? 0);

  const refreshFindState = useCallback(() => {
    setFindState(getFindState(editor));
  }, [editor]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    editor.commands.setCaseSensitive(caseSensitive);
  }, [caseSensitive, editor]);

  useEffect(() => {
    editor.commands.setSearchTerm(query);

    const matchIndex = pendingMatchIndexRef.current;
    if (matchIndex > 0 && query.trim()) {
      void navigateToMatchIndex(editor, matchIndex).then(() => {
        refreshFindState();
      });
    }
    pendingMatchIndexRef.current = 0;
  }, [editor, query, refreshFindState]);

  useEffect(() => {
    const handleTransaction = () => {
      refreshFindState();
    };

    editor.on('transaction', handleTransaction);
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor, refreshFindState]);

  const handleClose = useCallback(() => {
    editor.commands.clearSearch();
    onClose();
  }, [editor, onClose]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleClose();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        editor.commands.goToPreviousResult();
      } else {
        editor.commands.goToNextResult();
      }
      refreshFindState();
    }
  };

  return (
    <div
      className="absolute right-3 top-[calc(100%+0.375rem)] z-20 flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 shadow-md"
      role="search"
    >
      <input
        ref={inputRef}
        type="text"
        className="w-56 rounded border border-gray-300 px-2 py-1 text-[0.8125rem] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
        value={query}
        placeholder="Find"
        aria-label="Find in document"
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <span className="min-w-[4.5rem] whitespace-nowrap text-center text-xs text-gray-500" aria-live="polite">
        {findState.currentLabel}
      </span>
      <button
        type="button"
        className={findBtnClass}
        title="Previous match (Shift+Enter)"
        aria-label="Previous match"
        onClick={() => {
          editor.commands.goToPreviousResult();
          refreshFindState();
        }}
      >
        ↑
      </button>
      <button
        type="button"
        className={findBtnClass}
        title="Next match (Enter)"
        aria-label="Next match"
        onClick={() => {
          editor.commands.goToNextResult();
          refreshFindState();
        }}
      >
        ↓
      </button>
      <button
        type="button"
        className={cn(
          findBtnClass,
          caseSensitive && 'bg-gray-200 text-[#1a1a1a]',
        )}
        title="Match case"
        aria-label="Match case"
        aria-pressed={caseSensitive}
        onClick={() => setCaseSensitive((current) => !current)}
      >
        Aa
      </button>
      <button
        type="button"
        className={cn(findBtnClass, 'text-lg')}
        title="Close (Escape)"
        aria-label="Close find bar"
        onClick={handleClose}
      >
        ×
      </button>
    </div>
  );
}

export async function openFindInEditor(
  editor: Editor,
  query?: string,
  matchIndex?: number,
): Promise<void> {
  const term = query ?? getSelectedText(editor);
  editor.commands.setCaseSensitive(false);
  editor.commands.setSearchTerm(term);
  if (matchIndex && matchIndex > 0 && term.trim()) {
    await navigateToMatchIndex(editor, matchIndex);
  }
}
