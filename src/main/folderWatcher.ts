import path from 'node:path';
import type { FSWatcher } from 'chokidar';
import { watch } from 'chokidar';
import type { WebContents } from 'electron';
import { IPC } from '../ipc/channels';

const DEBOUNCE_MS = 200;
const SELF_WRITE_SUPPRESS_MS = 500;

interface WatcherState {
  webContents: WebContents;
  watcher: FSWatcher;
  rootPath: string;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  pendingAdds: Set<string>;
  pendingUnlinks: Set<string>;
}

const watchers = new Map<number, WatcherState>();
const suppressedPaths = new Map<number, Map<string, number>>();

export function suppressPathForWatch(
  webContentsId: number,
  filePath: string,
): void {
  const normalized = path.normalize(filePath);
  let windowPaths = suppressedPaths.get(webContentsId);
  if (!windowPaths) {
    windowPaths = new Map();
    suppressedPaths.set(webContentsId, windowPaths);
  }
  windowPaths.set(normalized, Date.now());
}

function isSuppressed(webContentsId: number, filePath: string): boolean {
  const windowPaths = suppressedPaths.get(webContentsId);
  if (!windowPaths) {
    return false;
  }

  const normalized = path.normalize(filePath);
  const timestamp = windowPaths.get(normalized);
  if (!timestamp) {
    return false;
  }

  if (Date.now() - timestamp > SELF_WRITE_SUPPRESS_MS) {
    windowPaths.delete(normalized);
    return false;
  }

  return true;
}

export function broadcastFolderRenamed(
  rootPath: string,
  oldPath: string,
  newPath: string,
  excludeWebContentsId: number,
): void {
  for (const [id, state] of watchers) {
    if (
      id !== excludeWebContentsId &&
      state.rootPath === rootPath &&
      !state.webContents.isDestroyed()
    ) {
      state.webContents.send(IPC.FOLDER_RENAMED, { oldPath, newPath });
    }
  }
}

function flushPendingEvents(webContents: WebContents, state: WatcherState): void {
  if (webContents.isDestroyed()) {
    return;
  }

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
  if (isSuppressed(webContents.id, eventPath)) {
    return;
  }

  if (type === 'add') {
    state.pendingAdds.add(eventPath);
  } else if (type === 'unlink') {
    state.pendingUnlinks.add(eventPath);
  } else {
    if (!webContents.isDestroyed()) {
      webContents.send(IPC.FOLDER_CHANGED);
    }
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
    webContents,
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
  if (webContents.isDestroyed()) {
    return;
  }

  const state = watchers.get(webContents.id);
  if (!state) {
    return;
  }

  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
  }

  void state.watcher.close();
  watchers.delete(webContents.id);
  suppressedPaths.delete(webContents.id);
}
