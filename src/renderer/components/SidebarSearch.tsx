import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../utils/cn';
import {
  listRowActiveClass,
  listRowClass,
  searchInputClass,
  searchToggleBtnClass,
  toggleBtnActiveClass,
} from '../styles/ui';
import type { FileTreeNode } from '../types/electron';
import { getFileName } from '../utils/markdown';
import {
  collectMarkdownFiles,
  getFlatMatchIndex,
  groupMatchesByFile,
  searchWorkspace,
  type WorkspaceMatch,
} from '../utils/workspaceSearch';

interface SidebarSearchProps {
  tree: FileTreeNode | null;
  focusRequest: number;
  activeMatchIndex: number;
  onActiveMatchIndexChange: (index: number) => void;
  onNavigateToMatch: (match: WorkspaceMatch, query: string) => void;
}

function renderLinePreview(match: WorkspaceMatch): ReactNode {
  const before = match.lineText.slice(0, match.matchStart);
  const highlighted = match.lineText.slice(match.matchStart, match.matchEnd);
  const after = match.lineText.slice(match.matchEnd);

  return (
    <>
      {before}
      <mark className="bg-yellow-300/55 text-inherit">{highlighted}</mark>
      {after}
    </>
  );
}

export function SidebarSearch({
  tree,
  focusRequest,
  activeMatchIndex,
  onActiveMatchIndexChange,
  onNavigateToMatch,
}: SidebarSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [matches, setMatches] = useState<WorkspaceMatch[]>([]);
  const [fileCount, setFileCount] = useState(0);
  const searchGenerationRef = useRef(0);

  const markdownFiles = useMemo(() => collectMarkdownFiles(tree), [tree]);
  const groupedResults = useMemo(
    () => groupMatchesByFile(matches),
    [matches],
  );

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusRequest]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setMatches([]);
      setFileCount(0);
      setIsSearching(false);
      onActiveMatchIndexChange(-1);
      return;
    }

    const generation = searchGenerationRef.current + 1;
    searchGenerationRef.current = generation;
    setIsSearching(true);

    const timeoutId = window.setTimeout(() => {
      void searchWorkspace(
        markdownFiles,
        trimmed,
        async (path) => {
          const file = await window.electronAPI.readFolderFile(path);
          return file.content;
        },
        caseSensitive,
        { generation },
        () => searchGenerationRef.current,
      ).then((result) => {
        if (searchGenerationRef.current !== generation) {
          return;
        }

        setMatches(result.matches);
        setFileCount(result.fileCount);
        setIsSearching(false);
        onActiveMatchIndexChange(result.matches.length > 0 ? 0 : -1);
      });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [caseSensitive, markdownFiles, onActiveMatchIndexChange, query]);

  const navigateRelative = useCallback(
    (direction: 1 | -1) => {
      if (matches.length === 0) {
        return;
      }

      const currentIndex =
        activeMatchIndex >= 0 ? activeMatchIndex : direction === 1 ? -1 : 0;
      const nextIndex =
        direction === 1
          ? (currentIndex + 1) % matches.length
          : (currentIndex - 1 + matches.length) % matches.length;
      const match = matches[nextIndex];
      onActiveMatchIndexChange(nextIndex);
      onNavigateToMatch(match, query.trim());
    },
    [
      activeMatchIndex,
      matches,
      onActiveMatchIndexChange,
      onNavigateToMatch,
      query,
    ],
  );

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      navigateRelative(event.shiftKey ? -1 : 1);
    }
  };

  const summaryText = useMemo(() => {
    if (!query.trim()) {
      return 'Type to search across markdown files';
    }
    if (isSearching) {
      return 'Searching…';
    }
    if (matches.length === 0) {
      return 'No results found';
    }
    return `${matches.length} result${matches.length === 1 ? '' : 's'} in ${fileCount} file${fileCount === 1 ? '' : 's'}`;
  }, [fileCount, isSearching, matches.length, query]);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-2">
        <input
          ref={inputRef}
          type="text"
          className={cn('min-w-0 flex-1', searchInputClass)}
          value={query}
          placeholder="Search"
          aria-label="Search in workspace"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
        />
        <button
          type="button"
          className={cn(
            searchToggleBtnClass,
            caseSensitive && toggleBtnActiveClass,
          )}
          title="Match case"
          aria-label="Match case"
          aria-pressed={caseSensitive}
          onClick={() => setCaseSensitive((current) => !current)}
        >
          Aa
        </button>
      </div>
      <p className="m-0 px-3 pb-2 text-xs text-gray-500">{summaryText}</p>
      <div className="flex-1 overflow-auto">
        {groupedResults.map((group) => (
          <section key={group.filePath} className="border-t border-gray-200">
            <header className="flex items-center justify-between gap-2 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
              <span className="truncate">{getFileName(group.filePath)}</span>
              <span className="shrink-0 text-gray-500">
                {group.matches.length}
              </span>
            </header>
            <ul className="m-0 list-none p-0">
              {group.matches.map((match) => {
                const flatIndex = getFlatMatchIndex(matches, match);
                const isActive = flatIndex === activeMatchIndex;

                return (
                  <li key={`${match.filePath}:${match.line}:${match.matchStart}`}>
                    <button
                      type="button"
                      className={cn(
                        listRowClass,
                        'items-start px-3 py-1.5 text-gray-700',
                        isActive && listRowActiveClass,
                      )}
                      onClick={() => {
                        onActiveMatchIndexChange(flatIndex);
                        onNavigateToMatch(match, query.trim());
                      }}
                    >
                      <span className="w-7 shrink-0 text-right text-xs text-gray-400">
                        {match.line}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[0.8125rem] leading-snug">
                        {renderLinePreview(match)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
