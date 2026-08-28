export type RecentEntry = {
  path: string;
  type: 'file' | 'folder';
  openedAt: number;
};

const STORAGE_KEY = 'notebook.recent';
const MAX_RECENT = 10;
export const RECENTS_CHANGED = 'notebook-recents-changed';

function notifyRecentsChanged(): void {
  window.dispatchEvent(new Event(RECENTS_CHANGED));
}

function readStorage(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as RecentEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry) =>
        typeof entry.path === 'string' &&
        (entry.type === 'file' || entry.type === 'folder') &&
        typeof entry.openedAt === 'number',
    );
  } catch {
    return [];
  }
}

function writeStorage(entries: RecentEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

let snapshot: RecentEntry[] = readStorage();

export function getRecentSnapshot(): RecentEntry[] {
  return snapshot;
}

export function subscribeToRecents(onStoreChange: () => void): () => void {
  const handleRecentsChanged = () => {
    onStoreChange();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }
    snapshot = readStorage();
    onStoreChange();
  };

  window.addEventListener(RECENTS_CHANGED, handleRecentsChanged);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(RECENTS_CHANGED, handleRecentsChanged);
    window.removeEventListener('storage', handleStorage);
  };
}

export function getRecentPaths(): RecentEntry[] {
  return getRecentSnapshot();
}

export function addRecentPath(path: string, type: 'file' | 'folder'): void {
  const trimmed = path.trim();
  if (!trimmed) {
    return;
  }

  const withoutDuplicate = readStorage().filter((entry) => entry.path !== trimmed);
  const next: RecentEntry[] = [
    { path: trimmed, type, openedAt: Date.now() },
    ...withoutDuplicate,
  ].slice(0, MAX_RECENT);

  writeStorage(next);
  snapshot = next;
  notifyRecentsChanged();
}

export function getRecentDisplayPath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const macHome = normalized.match(/^\/Users\/[^/]+(?=\/)/);
  if (macHome) {
    return normalized.replace(macHome[0], '~');
  }

  const linuxHome = normalized.match(/^\/home\/[^/]+(?=\/)/);
  if (linuxHome) {
    return normalized.replace(linuxHome[0], '~');
  }

  return normalized;
}

export function getRecentEntryName(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}
