import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
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
    const activeItem = listRef.current?.querySelector(
      '.command-palette-item--active',
    );
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
      className="dialog-overlay command-palette-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="command-palette"
        role="dialog"
        aria-label="Quick Open"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          className="command-palette-input"
          value={query}
          placeholder="Search files and commands…"
          aria-label="Quick open search"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div ref={listRef} className="command-palette-list" role="listbox">
          {isLoading ? (
            <p className="command-palette-empty">Loading files…</p>
          ) : items.length === 0 ? (
            <p className="command-palette-empty">No matching results</p>
          ) : (
            items.map((item, index) => (
              <button
                key={getItemKey(item)}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                className={`command-palette-item${
                  index === selectedIndex ? ' command-palette-item--active' : ''
                }`}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => onSelect(item)}
              >
                <span className="command-palette-item-label">{item.label}</span>
                {item.kind === 'file' ? (
                  <span className="command-palette-item-detail">
                    {item.detail}
                  </span>
                ) : (
                  <span className="command-palette-item-badge">Command</span>
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
