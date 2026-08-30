/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'notebook.recent';

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => store.delete(key),
    setItem: (key: string, value: string) => store.set(key, value),
  };
}

async function loadRecentPathsModule(
  initialEntries: Record<string, string> = {},
) {
  vi.resetModules();
  const storage = createLocalStorageMock();
  for (const [key, value] of Object.entries(initialEntries)) {
    storage.setItem(key, value);
  }
  vi.stubGlobal('localStorage', storage);
  return import('./recentPaths');
}

describe('recentPaths', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('adds recent paths with dedupe and max length', async () => {
    const mod = await loadRecentPathsModule();

    mod.addRecentPath('/tmp/a.md', 'file');
    mod.addRecentPath('/tmp/b.md', 'file');
    mod.addRecentPath('/tmp/a.md', 'file');

    expect(mod.getRecentPaths().map((entry) => entry.path)).toEqual([
      '/tmp/a.md',
      '/tmp/b.md',
    ]);
  });

  it('ignores empty paths', async () => {
    const mod = await loadRecentPathsModule();
    mod.addRecentPath('   ', 'file');
    expect(mod.getRecentPaths()).toEqual([]);
  });

  it('keeps only the 10 most recent entries', async () => {
    const mod = await loadRecentPathsModule();

    for (let index = 0; index < 12; index += 1) {
      mod.addRecentPath(`/tmp/file-${index}.md`, 'file');
    }

    expect(mod.getRecentPaths()).toHaveLength(10);
    expect(mod.getRecentPaths()[0].path).toBe('/tmp/file-11.md');
  });

  it('returns an empty list for malformed storage data', async () => {
    const mod = await loadRecentPathsModule({ [STORAGE_KEY]: '{not json' });
    expect(mod.getRecentPaths()).toEqual([]);
  });

  it('formats mac and linux home paths for display', async () => {
    const mod = await loadRecentPathsModule();
    expect(mod.getRecentDisplayPath('/Users/toby/git/project')).toBe('~/git/project');
    expect(mod.getRecentDisplayPath('/home/toby/git/project')).toBe(
      '~/git/project',
    );
  });

  it('extracts recent entry names', async () => {
    const mod = await loadRecentPathsModule();
    expect(mod.getRecentEntryName('/tmp/workspace/readme.md')).toBe('readme.md');
  });

  it('notifies subscribers on recents changes and storage events', async () => {
    const mod = await loadRecentPathsModule();
    const listener = vi.fn();
    const unsubscribe = mod.subscribeToRecents(listener);

    mod.addRecentPath('/tmp/a.md', 'file');
    expect(listener).toHaveBeenCalledTimes(1);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ path: '/tmp/b.md', type: 'file', openedAt: 1 }]),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(mod.getRecentPaths()[0].path).toBe('/tmp/b.md');

    unsubscribe();
  });
});
