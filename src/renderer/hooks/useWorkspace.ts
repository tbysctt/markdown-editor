import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileTreeNode } from '../types/electron';
import {
  createEditorTab,
  type EditorTab,
  isMarkdownFile,
  type OpenTabOptions,
} from '../types/workspace';
import { buildWorkspaceTitle, getFileName } from '../utils/markdown';
import { getParentDirForCreate } from '../utils/explorer';
import { remapPath } from '../utils/paths';
import { confirmDiscardIfDirty } from '../utils/documentConfirm';
import { useTabManager } from './useTabManager';

interface UseWorkspaceOptions {
  rootPath: string;
}

function syncWorkspaceWindowTitle(
  rootPath: string,
  tabs: EditorTab[],
  activeTabId: string | null,
): void {
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const anyDirty = tabs.some((tab) => tab.dirty);
  window.electronAPI.setDirty(
    anyDirty,
    buildWorkspaceTitle(
      rootPath,
      activeTab?.filePath ?? null,
      activeTab?.dirty ?? false,
    ),
  );
}

export function useWorkspace({ rootPath }: UseWorkspaceOptions) {
  const [tree, setTree] = useState<FileTreeNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const treeRef = useRef(tree);
  treeRef.current = tree;

  const refreshTree = useCallback(async () => {
    const nextTree = await window.electronAPI.readFolderTree(rootPath);
    setTree(nextTree);
  }, [rootPath]);

  useEffect(() => {
    void refreshTree();
  }, [refreshTree]);

  const tabManager = useTabManager({
    syncWindowTitle: (tabs, activeTabId) =>
      syncWorkspaceWindowTitle(rootPath, tabs, activeTabId),
    mapTabOnDirty: (tab, dirty) => ({
      ...tab,
      dirty,
      isPreview: dirty ? false : tab.isPreview,
    }),
    mapTabOnPathUpdate: (tab, newPath) => ({
      ...tab,
      filePath: newPath,
      dirty: false,
      isPreview: false,
    }),
    onAfterPathUpdate: () => {
      void refreshTree();
    },
    clearDirtyOnSave: true,
  });

  const {
    tabs,
    activeTabId,
    activeTab,
    tabsRef,
    activeTabIdRef,
    editorRegistryRef,
    setTabs,
    setActiveTabId,
    syncTitle,
    registerTabEditor,
    unregisterTabEditor,
    getActiveHandle,
    setTabDirty,
    updateTabFilePath,
    switchTab,
    closeTab,
    saveActiveDocument,
    saveActiveDocumentAs,
  } = tabManager;

  useEffect(() => {
    void window.electronAPI.startFolderWatch(rootPath);

    const unsubChange = window.electronAPI.onFolderChanged(() => {
      void refreshTree();
    });

    const unsubRename = window.electronAPI.onFolderRenamed(
      ({ oldPath, newPath }) => {
        setTabs((current) =>
          current.map((tab) => {
            const remapped = remapPath(tab.filePath, oldPath, newPath);
            if (remapped === tab.filePath) {
              return tab;
            }

            if (tab.dirty) {
              return { ...tab, filePath: remapped };
            }

            if (tab.filePath === oldPath) {
              void window.electronAPI.readFolderFile(remapped).then((file) => {
                setTabs((inner) =>
                  inner.map((innerTab) =>
                    innerTab.id === tab.id
                      ? {
                          ...innerTab,
                          filePath: remapped,
                          initialContent: file.content,
                          contentEpoch: innerTab.contentEpoch + 1,
                        }
                      : innerTab,
                  ),
                );
              });
            }

            return { ...tab, filePath: remapped };
          }),
        );

        setSelectedPath((current) =>
          current ? remapPath(current, oldPath, newPath) : current,
        );

        void refreshTree();
      },
    );

    return () => {
      unsubChange();
      unsubRename();
      void window.electronAPI.stopFolderWatch();
    };
  }, [refreshTree, rootPath, setTabs]);

  const pinTab = useCallback(
    (tabId: string) => {
      setTabs((current) => {
        const next = current.map((tab) =>
          tab.id === tabId ? { ...tab, isPreview: false } : tab,
        );
        syncTitle(next, activeTabIdRef.current);
        return next;
      });
    },
    [activeTabIdRef, setTabs, syncTitle],
  );

  const openTab = useCallback(
    async (filePath: string, options: OpenTabOptions = {}): Promise<string> => {
      if (!isMarkdownFile(filePath)) {
        return '';
      }

      const { preview = false, content } = options;
      const currentTabs = tabsRef.current;
      const existing = currentTabs.find((tab) => tab.filePath === filePath);
      if (existing) {
        switchTab(existing.id);
        if (!preview) {
          pinTab(existing.id);
        }
        return existing.id;
      }

      const fileContent =
        content ?? (await window.electronAPI.readFolderFile(filePath)).content;

      const previewTab = currentTabs.find((tab) => tab.isPreview);

      if (!preview && previewTab && !previewTab.dirty) {
        const pinnedTab: EditorTab = {
          ...previewTab,
          filePath,
          dirty: false,
          isPreview: false,
          initialContent: fileContent,
          contentEpoch: previewTab.contentEpoch + 1,
        };
        const nextTabs = currentTabs.map((tab) =>
          tab.id === previewTab.id ? pinnedTab : tab,
        );
        setTabs(nextTabs);
        setActiveTabId(pinnedTab.id);
        syncTitle(nextTabs, pinnedTab.id);
        return pinnedTab.id;
      }

      if (preview && previewTab) {
        if (previewTab.dirty) {
          const pinnedTabs = currentTabs.map((tab) =>
            tab.id === previewTab.id ? { ...tab, isPreview: false } : tab,
          );
          const newTab = createEditorTab(filePath, fileContent, { preview: true });
          const nextTabs = [...pinnedTabs, newTab];
          setTabs(nextTabs);
          setActiveTabId(newTab.id);
          syncTitle(nextTabs, newTab.id);
          return newTab.id;
        }

        const reusedTab: EditorTab = {
          ...previewTab,
          filePath,
          dirty: false,
          isPreview: true,
          initialContent: fileContent,
          contentEpoch: previewTab.contentEpoch + 1,
        };
        const nextTabs = currentTabs.map((tab) =>
          tab.id === previewTab.id ? reusedTab : tab,
        );
        setTabs(nextTabs);
        setActiveTabId(reusedTab.id);
        syncTitle(nextTabs, reusedTab.id);
        return reusedTab.id;
      }

      const newTab = createEditorTab(filePath, fileContent, { preview });
      const nextTabs = [...currentTabs, newTab];
      setTabs(nextTabs);
      setActiveTabId(newTab.id);
      syncTitle(nextTabs, newTab.id);
      return newTab.id;
    },
    [pinTab, setActiveTabId, setTabs, switchTab, syncTitle, tabsRef],
  );

  const getCreateParentDir = useCallback(
    (overrideParentDir?: string) => {
      if (overrideParentDir) {
        return overrideParentDir;
      }
      return getParentDirForCreate(
        rootPath,
        selectedPath,
        treeRef.current,
      );
    },
    [rootPath, selectedPath],
  );

  const createExplorerFile = useCallback(
    async (parentDir: string, name: string) => {
      const result = await window.electronAPI.createFolderFile({
        rootPath,
        parentDir,
        name,
      });
      await refreshTree();
      setSelectedPath(result.path);
      await openTab(result.path, { preview: false, content: '' });
    },
    [openTab, refreshTree, rootPath],
  );

  const createExplorerFolder = useCallback(
    async (parentDir: string, name: string) => {
      const result = await window.electronAPI.createFolderEntry({
        rootPath,
        parentDir,
        name,
      });
      await refreshTree();
      setSelectedPath(result.path);
    },
    [refreshTree, rootPath],
  );

  const deleteExplorerPath = useCallback(
    async (targetPath: string, isDirectory: boolean): Promise<boolean> => {
      const name = getFileName(targetPath);
      const confirmed = await window.electronAPI.confirmDeleteEntry({
        name,
        isDirectory,
      });
      if (confirmed !== 'confirm') {
        return false;
      }

      const currentTabs = tabsRef.current;
      const affectedTabs = currentTabs.filter((tab) => {
        if (isDirectory) {
          return (
            tab.filePath === targetPath ||
            tab.filePath.startsWith(`${targetPath}/`) ||
            tab.filePath.startsWith(`${targetPath}\\`)
          );
        }
        return tab.filePath === targetPath;
      });

      for (const tab of affectedTabs) {
        const handle = editorRegistryRef.current.get(tab.id);
        const isDirty = handle?.dirty ?? tab.dirty;
        const result = await confirmDiscardIfDirty(isDirty);
        if (result === 'cancel') {
          return false;
        }

        if (result === 'save' && handle) {
          const saved = await handle.saveDocument();
          if (!saved) {
            return false;
          }
        }
      }

      const affectedIds = new Set(affectedTabs.map((tab) => tab.id));
      const remaining = currentTabs.filter((tab) => !affectedIds.has(tab.id));
      const wasActiveClosed = affectedIds.has(activeTabIdRef.current ?? '');
      setTabs(remaining);

      if (wasActiveClosed) {
        if (remaining.length > 0) {
          const nextTab = remaining[remaining.length - 1];
          setActiveTabId(nextTab.id);
          syncTitle(remaining, nextTab.id);
        } else {
          setActiveTabId(null);
          syncTitle(remaining, null);
        }
      } else {
        syncTitle(remaining, activeTabIdRef.current);
      }

      await window.electronAPI.deleteFolderEntry({ rootPath, targetPath });

      if (
        selectedPath === targetPath ||
        (isDirectory &&
          selectedPath &&
          (selectedPath.startsWith(`${targetPath}/`) ||
            selectedPath.startsWith(`${targetPath}\\`)))
      ) {
        setSelectedPath(null);
      }

      await refreshTree();
      return true;
    },
    [
      activeTabIdRef,
      editorRegistryRef,
      refreshTree,
      rootPath,
      selectedPath,
      setActiveTabId,
      setTabs,
      syncTitle,
      tabsRef,
    ],
  );

  const renameExplorerEntry = useCallback(
    async (oldPath: string, newName: string): Promise<boolean> => {
      try {
        const result = await window.electronAPI.renameFolderEntry({
          rootPath,
          oldPath,
          newName,
        });

        setTabs((current) => {
          const next = current.map((tab) => ({
            ...tab,
            filePath: remapPath(tab.filePath, oldPath, result.path),
          }));
          syncTitle(next, activeTabIdRef.current);
          return next;
        });

        setSelectedPath((current) =>
          current ? remapPath(current, oldPath, result.path) : current,
        );

        await refreshTree();
        return true;
      } catch {
        return false;
      }
    },
    [activeTabIdRef, refreshTree, rootPath, setTabs, syncTitle],
  );

  const renameTab = useCallback(
    async (tabId: string, newName: string): Promise<boolean> => {
      const tab = tabsRef.current.find((t) => t.id === tabId);
      if (!tab) {
        return false;
      }
      return renameExplorerEntry(tab.filePath, newName);
    },
    [renameExplorerEntry, tabsRef],
  );

  const activeFilePath = activeTab?.filePath ?? null;

  return {
    tabs,
    activeTabId,
    activeTab,
    activeFilePath,
    tree,
    selectedPath,
    setSelectedPath,
    getCreateParentDir,
    createExplorerFile,
    createExplorerFolder,
    deleteExplorerPath,
    refreshTree,
    openTab,
    closeTab,
    switchTab,
    pinTab,
    saveActiveDocument,
    saveActiveDocumentAs,
    registerTabEditor,
    unregisterTabEditor,
    setTabDirty,
    updateTabFilePath,
    getActiveHandle,
    renameExplorerEntry,
    renameTab,
  };
}
