import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuAction } from '../../ipc/channels';
import type { EditorTab, TabEditorHandle } from '../types/workspace';
import { confirmDiscardIfDirty } from '../utils/documentConfirm';

export interface TabManagerOptions {
  syncWindowTitle: (tabs: EditorTab[], activeTabId: string | null) => void;
  mapTabOnDirty?: (tab: EditorTab, dirty: boolean) => EditorTab;
  mapTabOnPathUpdate?: (tab: EditorTab, newPath: string) => EditorTab;
  onAfterPathUpdate?: () => void;
  clearDirtyOnSave?: boolean;
}

export function useTabManager({
  syncWindowTitle,
  mapTabOnDirty = (tab, dirty) => ({ ...tab, dirty }),
  mapTabOnPathUpdate = (tab, newPath) => ({
    ...tab,
    filePath: newPath,
    dirty: false,
  }),
  onAfterPathUpdate,
  clearDirtyOnSave = false,
}: TabManagerOptions) {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  const editorRegistryRef = useRef(new Map<string, TabEditorHandle>());

  tabsRef.current = tabs;
  activeTabIdRef.current = activeTabId;

  const syncTitle = useCallback(
    (nextTabs: EditorTab[], nextActiveId: string | null) => {
      syncWindowTitle(nextTabs, nextActiveId);
    },
    [syncWindowTitle],
  );

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

  const setTabDirty = useCallback(
    (tabId: string, dirty: boolean) => {
      setTabs((current) => {
        const next = current.map((tab) =>
          tab.id === tabId ? mapTabOnDirty(tab, dirty) : tab,
        );
        syncTitle(next, activeTabIdRef.current);
        return next;
      });
    },
    [mapTabOnDirty, syncTitle],
  );

  const updateTabFilePath = useCallback(
    (tabId: string, newPath: string) => {
      setTabs((current) => {
        const next = current.map((tab) =>
          tab.id === tabId ? mapTabOnPathUpdate(tab, newPath) : tab,
        );
        syncTitle(next, activeTabIdRef.current);
        return next;
      });
      onAfterPathUpdate?.();
    },
    [mapTabOnPathUpdate, onAfterPathUpdate, syncTitle],
  );

  const switchTab = useCallback(
    (tabId: string) => {
      if (tabId === activeTabIdRef.current) {
        return;
      }

      const targetTab = tabsRef.current.find((tab) => tab.id === tabId);
      if (!targetTab) {
        return;
      }

      setActiveTabId(tabId);
      syncTitle(tabsRef.current, tabId);
    },
    [syncTitle],
  );

  const closeTab = useCallback(
    async (tabId: string): Promise<boolean> => {
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
        syncTitle(filtered, null);
        return true;
      }

      if (isActive) {
        const closedIndex = tabsRef.current.findIndex((tab) => tab.id === tabId);
        const nextTab = filtered[Math.min(closedIndex, filtered.length - 1)];
        setActiveTabId(nextTab.id);
        syncTitle(filtered, nextTab.id);
      } else {
        syncTitle(filtered, activeTabIdRef.current);
      }

      return true;
    },
    [syncTitle],
  );

  const saveActiveDocument = useCallback(async (): Promise<boolean> => {
    const handle = getActiveHandle();
    if (!handle) {
      return false;
    }

    const saved = await handle.saveDocument();
    if (saved && clearDirtyOnSave) {
      setTabDirty(handle.tabId, false);
    }
    return saved;
  }, [clearDirtyOnSave, getActiveHandle, setTabDirty]);

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
      syncTitle(next, activeTabIdRef.current);
      return next;
    });
    return true;
  }, [syncTitle]);

  const setTabsState = useCallback(
    (
      updater: EditorTab[] | ((current: EditorTab[]) => EditorTab[]),
      nextActiveId?: string | null,
    ) => {
      setTabs((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater;
        const activeId =
          nextActiveId !== undefined ? nextActiveId : activeTabIdRef.current;
        if (nextActiveId !== undefined) {
          setActiveTabId(nextActiveId);
        }
        syncTitle(next, activeId);
        return next;
      });
    },
    [syncTitle],
  );

  useEffect(() => {
    syncTitle(tabs, activeTabId);
  }, [activeTabId, syncTitle, tabs]);

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
    tabsRef,
    activeTabIdRef,
    editorRegistryRef,
    setTabs,
    setActiveTabId,
    setTabsState,
    registerTabEditor,
    unregisterTabEditor,
    getActiveHandle,
    setTabDirty,
    updateTabFilePath,
    switchTab,
    closeTab,
    saveActiveDocument,
    saveActiveDocumentAs,
    closeActiveTab,
    saveAllDirtyTabs,
    syncTitle,
  };
}
