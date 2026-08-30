import { useCallback, useRef } from 'react';
import {
  createEditorTab,
  createUntitledTab,
  isUntitledPath,
  type EditorTab,
} from '../types/workspace';
import { buildWindowTitle } from '../utils/markdown';
import { useTabManager } from './useTabManager';

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
  const bootstrappedRef = useRef(false);

  const tabManager = useTabManager({
    syncWindowTitle: syncStandaloneWindowTitle,
  });

  const {
    tabs,
    activeTabId,
    activeTab,
    tabsRef,
    setTabs,
    setActiveTabId,
    syncTitle,
    registerTabEditor,
    unregisterTabEditor,
    setTabDirty,
    updateTabFilePath,
    switchTab,
    closeTab,
  } = tabManager;

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
        syncTitle(currentTabs, existing.id);
        return;
      }

      const fileContent =
        content ??
        (await window.electronAPI.readFolderFile(filePath)).content;

      const newTab = createEditorTab(filePath, fileContent, { preview: false });
      const nextTabs = [...currentTabs, newTab];
      setTabs(nextTabs);
      setActiveTabId(newTab.id);
      syncTitle(nextTabs, newTab.id);
    },
    [setActiveTabId, setTabs, syncTitle, tabsRef],
  );

  const openUntitledTab = useCallback(() => {
    const newTab = createUntitledTab('');
    const nextTabs = [...tabsRef.current, newTab];
    setTabs(nextTabs);
    setActiveTabId(newTab.id);
    syncTitle(nextTabs, newTab.id);
  }, [setActiveTabId, setTabs, syncTitle, tabsRef]);

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

        updateTabFilePath(tabId, result.path);
        return true;
      } catch {
        return false;
      }
    },
    [tabsRef, updateTabFilePath],
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
