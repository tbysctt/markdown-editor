import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
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
      <mark>{highlighted}</mark>
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
    <div className="sidebar-search">
      <div className="sidebar-search-controls">
        <input
          ref={inputRef}
          type="text"
          className="sidebar-search-input"
          value={query}
          placeholder="Search"
          aria-label="Search in workspace"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
        />
        <button
          type="button"
          className={`sidebar-search-toggle${
            caseSensitive ? ' sidebar-search-toggle--active' : ''
          }`}
          title="Match case"
          aria-label="Match case"
          aria-pressed={caseSensitive}
          onClick={() => setCaseSensitive((current) => !current)}
        >
          Aa
        </button>
      </div>
      <p className="sidebar-search-summary">{summaryText}</p>
      <div className="sidebar-search-results">
        {groupedResults.map((group) => (
          <section key={group.filePath} className="sidebar-search-group">
            <header className="sidebar-search-group-header">
              <span className="sidebar-search-group-name">
                {getFileName(group.filePath)}
              </span>
              <span className="sidebar-search-group-count">
                {group.matches.length}
              </span>
            </header>
            <ul className="sidebar-search-match-list">
              {group.matches.map((match) => {
                const flatIndex = getFlatMatchIndex(matches, match);
                const isActive = flatIndex === activeMatchIndex;

                return (
                  <li key={`${match.filePath}:${match.line}:${match.matchStart}`}>
                    <button
                      type="button"
                      className={`sidebar-search-match${
                        isActive ? ' sidebar-search-match--active' : ''
                      }`}
                      onClick={() => {
                        onActiveMatchIndexChange(flatIndex);
                        onNavigateToMatch(match, query.trim());
                      }}
                    >
                      <span className="sidebar-search-match-line">
                        {match.line}
                      </span>
                      <span className="sidebar-search-match-preview">
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
