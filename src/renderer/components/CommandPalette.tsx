import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { cn } from '../utils/cn';
import { rankByFuzzyMatch } from '../utils/fuzzyMatch';

export type CommandPaletteItem =
  | { kind: 'command'; id: 'open-folder' | 'open-document'; label: string }
  | { kind: 'file'; path: string; label: string; detail: string };

interface CommandPaletteProps {
  allItems: CommandPaletteItem[];
  isLoading?: boolean;
  onSelect: (item: CommandPaletteItem) => void;
  onClose: () => void;
}

function getItemKey(item: CommandPaletteItem): string {
  return item.kind === 'command' ? item.id : item.path;
}

export function CommandPalette({
  allItems,
  isLoading = false,
  onSelect,
  onClose,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const items = filterCommandPaletteItems(allItems, query);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, items]);

  useEffect(() => {
    const activeItem = listRef.current?.querySelector('[data-active="true"]');
    activeItem?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, items]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (items.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown' || (event.key === 'n' && event.ctrlKey)) {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % items.length);
      return;
    }

    if (event.key === 'ArrowUp' || (event.key === 'p' && event.ctrlKey)) {
      event.preventDefault();
      setSelectedIndex(
        (current) => (current - 1 + items.length) % items.length,
      );
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = items[selectedIndex];
      if (selected) {
        onSelect(selected);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center bg-black/40 pt-[10vh]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-label="Quick Open"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          className="w-full border-none border-b border-gray-200 px-4 py-3.5 text-[0.9375rem] font-inherit focus:outline-none"
          value={query}
          placeholder="Search files and commands…"
          aria-label="Quick open search"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1.5" role="listbox">
          {isLoading ? (
            <p className="m-0 p-4 text-center text-sm text-gray-500">
              Loading files…
            </p>
          ) : items.length === 0 ? (
            <p className="m-0 p-4 text-center text-sm text-gray-500">
              No matching results
            </p>
          ) : (
            items.map((item, index) => (
              <button
                key={getItemKey(item)}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                data-active={index === selectedIndex ? 'true' : undefined}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-2 text-left font-inherit text-[#1a1a1a] hover:bg-indigo-50',
                  index === selectedIndex && 'bg-indigo-50',
                )}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => onSelect(item)}
              >
                <span className="max-w-[45%] shrink-0 truncate text-sm">
                  {item.label}
                </span>
                {item.kind === 'file' ? (
                  <span className="min-w-0 flex-1 truncate text-right text-[0.8125rem] text-gray-400">
                    {item.detail}
                  </span>
                ) : (
                  <span className="ml-auto shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-400">
                    Command
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function filterCommandPaletteItems(
  items: CommandPaletteItem[],
  query: string,
): CommandPaletteItem[] {
  const MAX_RESULTS = 50;
  const commands = items.filter((item) => item.kind === 'command');
  const files = items.filter((item) => item.kind === 'file');

  if (!query.trim()) {
    return [...commands, ...files.slice(0, MAX_RESULTS)];
  }

  const matchedCommands = rankByFuzzyMatch(commands, query, (item) => item.label);
  const matchedFiles = rankByFuzzyMatch(
    files,
    query,
    (item) => `${item.label} ${item.detail}`,
  );

  return [...matchedCommands, ...matchedFiles.slice(0, MAX_RESULTS)];
}
