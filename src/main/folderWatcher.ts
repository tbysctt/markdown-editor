import path from 'node:path';
import type { FSWatcher } from 'chokidar';
import { watch } from 'chokidar';
import type { WebContents } from 'electron';
import { IPC } from '../ipc/channels';

const DEBOUNCE_MS = 200;
const SELF_WRITE_SUPPRESS_MS = 500;

interface WatcherState {
  watcher: FSWatcher;
  rootPath: string;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  pendingAdds: Set<string>;
  pendingUnlinks: Set<string>;
}

const watchers = new Map<number, WatcherState>();
const suppressedPaths = new Map<string, number>();

export function suppressPathForWatch(filePath: string): void {
  suppressedPaths.set(path.normalize(filePath), Date.now());
}

function isSuppressed(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  const timestamp = suppressedPaths.get(normalized);
  if (!timestamp) {
    return false;
  }

  if (Date.now() - timestamp > SELF_WRITE_SUPPRESS_MS) {
    suppressedPaths.delete(normalized);
    return false;
  }

  return true;
}

function flushPendingEvents(webContents: WebContents, state: WatcherState): void {
  const adds = [...state.pendingAdds];
  const unlinks = [...state.pendingUnlinks];
  state.pendingAdds.clear();
  state.pendingUnlinks.clear();

  if (adds.length === 1 && unlinks.length === 1) {
    const oldPath = unlinks[0];
    const newPath = adds[0];
    if (path.dirname(oldPath) === path.dirname(newPath)) {
      webContents.send(IPC.FOLDER_RENAMED, { oldPath, newPath });
      return;
    }
  }

  if (adds.length > 0 || unlinks.length > 0) {
    webContents.send(IPC.FOLDER_CHANGED);
  }
}

function scheduleFlush(webContents: WebContents, state: WatcherState): void {
  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
  }

  state.debounceTimer = setTimeout(() => {
    state.debounceTimer = null;
    flushPendingEvents(webContents, state);
  }, DEBOUNCE_MS);
}

function handleFilesystemEvent(
  webContents: WebContents,
  state: WatcherState,
  eventPath: string,
  type: 'add' | 'unlink' | 'change',
): void {
  if (isSuppressed(eventPath)) {
    return;
  }

  if (type === 'add') {
    state.pendingAdds.add(eventPath);
  } else if (type === 'unlink') {
    state.pendingUnlinks.add(eventPath);
  } else {
    webContents.send(IPC.FOLDER_CHANGED);
    return;
  }

  scheduleFlush(webContents, state);
}

export function startFolderWatch(
  webContents: WebContents,
  rootPath: string,
): void {
  stopFolderWatch(webContents);

  const watcher = watch(rootPath, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  const state: WatcherState = {
    watcher,
    rootPath,
    debounceTimer: null,
    pendingAdds: new Set(),
    pendingUnlinks: new Set(),
  };

  watcher.on('add', (eventPath) => {
    handleFilesystemEvent(webContents, state, eventPath, 'add');
  });

  watcher.on('unlink', (eventPath) => {
    handleFilesystemEvent(webContents, state, eventPath, 'unlink');
  });

  watcher.on('change', (eventPath) => {
    handleFilesystemEvent(webContents, state, eventPath, 'change');
  });

  watchers.set(webContents.id, state);
}

export function stopFolderWatch(webContents: WebContents): void {
  const state = watchers.get(webContents.id);
  if (!state) {
    return;
  }

  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
  }

  void state.watcher.close();
  watchers.delete(webContents.id);
}
