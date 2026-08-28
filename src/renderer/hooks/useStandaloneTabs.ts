import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuAction } from '../../ipc/channels';
import {
  createEditorTab,
  createUntitledTab,
  isUntitledPath,
  type EditorTab,
  type TabEditorHandle,
} from '../types/workspace';
import { confirmDiscardIfDirty } from '../utils/documentConfirm';
import { buildWindowTitle } from '../utils/markdown';

function syncStandaloneWindowTitle(
  tabs: EditorTab[],
  activeTabId: string | null,
): void {
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const anyDirty = tabs.some((tab) => tab.dirty);
  const activePath = activeTab?.filePath ?? null;
  const activeDirty = activeTab?.dirty ?? false;
  window.electronAPI.setDirty(
    anyDirty,
    buildWindowTitle(
      activePath && !isUntitledPath(activePath) ? activePath : null,
      activeDirty,
    ),
  );
}

export function useStandaloneTabs() {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  const editorRegistryRef = useRef(new Map<string, TabEditorHandle>());
  const bootstrappedRef = useRef(false);

  tabsRef.current = tabs;
  activeTabIdRef.current = activeTabId;

  const registerTabEditor = useCallback((handle: TabEditorHandle) => {
    editorRegistryRef.current.set(handle.tabId, handle);
  }, []);

  const unregisterTabEditor = useCallback((tabId: string) => {
    editorRegistryRef.current.delete(tabId);
  }, []);

  const getActiveHandle = useCallback((): TabEditorHandle | null => {
    if (!activeTabIdRef.current) {
      return null;
    }
    return editorRegistryRef.current.get(activeTabIdRef.current) ?? null;
  }, []);

  const setTabDirty = useCallback((tabId: string, dirty: boolean) => {
    setTabs((current) => {
      const next = current.map((tab) =>
        tab.id === tabId ? { ...tab, dirty } : tab,
      );
      syncStandaloneWindowTitle(next, activeTabIdRef.current);
      return next;
    });
  }, []);

  const updateTabFilePath = useCallback((tabId: string, newPath: string) => {
    setTabs((current) => {
      const next = current.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              filePath: newPath,
              dirty: false,
            }
          : tab,
      );
      syncStandaloneWindowTitle(next, activeTabIdRef.current);
      return next;
    });
  }, []);

  const openTab = useCallback(
    async (
      filePath: string,
      options: { content?: string; preview?: boolean } = {},
    ) => {
      const { content } = options;
      const currentTabs = tabsRef.current;
      const existing = currentTabs.find((tab) => tab.filePath === filePath);
      if (existing) {
        setActiveTabId(existing.id);
        syncStandaloneWindowTitle(currentTabs, existing.id);
        return;
      }

      const fileContent =
        content ??
        (await window.electronAPI.readFolderFile(filePath)).content;

      const newTab = createEditorTab(filePath, fileContent, { preview: false });
      const nextTabs = [...currentTabs, newTab];
      setTabs(nextTabs);
      setActiveTabId(newTab.id);
      syncStandaloneWindowTitle(nextTabs, newTab.id);
    },
    [],
  );

  const openUntitledTab = useCallback(() => {
    const newTab = createUntitledTab('');
    const nextTabs = [...tabsRef.current, newTab];
    setTabs(nextTabs);
    setActiveTabId(newTab.id);
    syncStandaloneWindowTitle(nextTabs, newTab.id);
  }, []);

  const switchTab = useCallback((tabId: string) => {
    if (tabId === activeTabIdRef.current) {
      return;
    }

    const targetTab = tabsRef.current.find((tab) => tab.id === tabId);
    if (!targetTab) {
      return;
    }

    setActiveTabId(tabId);
    syncStandaloneWindowTitle(tabsRef.current, tabId);
  }, []);

  const closeTab = useCallback(async (tabId: string): Promise<boolean> => {
    const tabToClose = tabsRef.current.find((tab) => tab.id === tabId);
    if (!tabToClose) {
      return false;
    }

    const handle = editorRegistryRef.current.get(tabId);
    const isDirty = handle?.dirty ?? tabToClose.dirty;
    const result = await confirmDiscardIfDirty(isDirty);
    if (result === 'cancel') {
      return false;
    }

    const isActive = tabId === activeTabIdRef.current;

    if (result === 'save' && handle) {
      const saved = await handle.saveDocument();
      if (!saved) {
        return false;
      }
    }

    const filtered = tabsRef.current.filter((tab) => tab.id !== tabId);
    setTabs(filtered);

    if (filtered.length === 0) {
      setActiveTabId(null);
      syncStandaloneWindowTitle(filtered, null);
      window.electronAPI.requestClose();
      return true;
    }

    if (isActive) {
      const closedIndex = tabsRef.current.findIndex((tab) => tab.id === tabId);
      const nextTab = filtered[Math.min(closedIndex, filtered.length - 1)];
      setActiveTabId(nextTab.id);
      syncStandaloneWindowTitle(filtered, nextTab.id);
    } else {
      syncStandaloneWindowTitle(filtered, activeTabIdRef.current);
    }

    return true;
  }, []);

  const saveActiveDocument = useCallback(async (): Promise<boolean> => {
    const handle = getActiveHandle();
    if (!handle) {
      return false;
    }
    return handle.saveDocument();
  }, [getActiveHandle]);

  const saveActiveDocumentAs = useCallback(async (): Promise<boolean> => {
    const handle = getActiveHandle();
    if (!handle) {
      return false;
    }
    return handle.saveDocumentAs();
  }, [getActiveHandle]);

  const closeActiveTab = useCallback(async () => {
    if (!activeTabIdRef.current) {
      window.electronAPI.requestClose();
      return;
    }
    await closeTab(activeTabIdRef.current);
  }, [closeTab]);

  const saveAllDirtyTabs = useCallback(async (): Promise<boolean> => {
    for (const tab of tabsRef.current) {
      if (!tab.dirty) {
        continue;
      }

      const handle = editorRegistryRef.current.get(tab.id);
      if (!handle) {
        continue;
      }

      const saved = await handle.saveDocument();
      if (!saved) {
        return false;
      }
    }

    setTabs((current) => {
      const next = current.map((tab) => ({ ...tab, dirty: false }));
      syncStandaloneWindowTitle(next, activeTabIdRef.current);
      return next;
    });
    return true;
  }, []);

  const renameTab = useCallback(
    async (tabId: string, newName: string): Promise<boolean> => {
      const tab = tabsRef.current.find((t) => t.id === tabId);
      if (!tab || isUntitledPath(tab.filePath)) {
        return false;
      }

      try {
        const result = await window.electronAPI.renameFile({
          oldPath: tab.filePath,
          newName,
        });

        setTabs((current) => {
          const next = current.map((t) =>
            t.id === tabId ? { ...t, filePath: result.path } : t,
          );
          syncStandaloneWindowTitle(next, activeTabIdRef.current);
          return next;
        });
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const bootstrap = useCallback(
    (document?: { path: string; content: string } | null) => {
      if (bootstrappedRef.current) {
        return;
      }
      bootstrappedRef.current = true;

      if (document) {
        void openTab(document.path, { content: document.content });
      } else {
        openUntitledTab();
      }
    },
    [openTab, openUntitledTab],
  );

  useEffect(() => {
    syncStandaloneWindowTitle(tabs, activeTabId);
  }, [activeTabId, tabs]);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onMenuAction(
      async (action: MenuAction) => {
        switch (action) {
          case 'save':
            await saveActiveDocument();
            break;
          case 'save-as':
            await saveActiveDocumentAs();
            break;
          case 'save-and-close': {
            const saved = await saveAllDirtyTabs();
            if (saved) {
              window.electronAPI.notifyReadyToClose();
            } else {
              window.electronAPI.notifyAbortClose();
            }
            break;
          }
          case 'close':
            await closeActiveTab();
            break;
          default:
            break;
        }
      },
    );

    return unsubscribe;
  }, [
    closeActiveTab,
    saveActiveDocument,
    saveActiveDocumentAs,
    saveAllDirtyTabs,
  ]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;

  return {
    tabs,
    activeTabId,
    activeTab,
    openTab,
    openUntitledTab,
    closeTab,
    switchTab,
    registerTabEditor,
    unregisterTabEditor,
    setTabDirty,
    updateTabFilePath,
    renameTab,
    bootstrap,
  };
}
