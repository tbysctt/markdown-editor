import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuAction } from '../../ipc/channels';
import type { FileTreeNode } from '../types/electron';
import {
  createEditorTab,
  type EditorTab,
  type OpenTabOptions,
  type TabEditorHandle,
} from '../types/workspace';
import { confirmDiscardIfDirty } from '../utils/documentConfirm';
import { buildWorkspaceTitle, getFileName } from '../utils/markdown';
import { getParentDirForCreate } from '../utils/explorer';
import { remapPath } from '../utils/paths';

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
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tree, setTree] = useState<FileTreeNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  const treeRef = useRef(tree);
  const editorRegistryRef = useRef(new Map<string, TabEditorHandle>());

  tabsRef.current = tabs;
  activeTabIdRef.current = activeTabId;
  treeRef.current = tree;

  const refreshTree = useCallback(async () => {
    const nextTree = await window.electronAPI.readFolderTree(rootPath);
    setTree(nextTree);
  }, [rootPath]);

  useEffect(() => {
    void refreshTree();
  }, [refreshTree]);

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
          tab.id === tabId
            ? { ...tab, dirty, isPreview: dirty ? false : tab.isPreview }
            : tab,
        );
        syncWorkspaceWindowTitle(rootPath, next, activeTabIdRef.current);
        return next;
      });
    },
    [rootPath],
  );

  const updateTabFilePath = useCallback(
    (tabId: string, newPath: string) => {
      setTabs((current) => {
        const next = current.map((tab) =>
          tab.id === tabId
            ? {
                ...tab,
                filePath: newPath,
                dirty: false,
                isPreview: false,
              }
            : tab,
        );
        syncWorkspaceWindowTitle(rootPath, next, activeTabIdRef.current);
        return next;
      });
      void refreshTree();
    },
    [refreshTree, rootPath],
  );

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
  }, [refreshTree, rootPath]);

  const pinTab = useCallback(
    (tabId: string) => {
      setTabs((current) => {
        const next = current.map((tab) =>
          tab.id === tabId ? { ...tab, isPreview: false } : tab,
        );
        syncWorkspaceWindowTitle(rootPath, next, activeTabIdRef.current);
        return next;
      });
    },
    [rootPath],
  );

  const saveActiveDocument = useCallback(async (): Promise<boolean> => {
    const handle = getActiveHandle();
    if (!handle) {
      return false;
    }

    const saved = await handle.saveDocument();
    if (saved) {
      setTabDirty(handle.tabId, false);
    }
    return saved;
  }, [getActiveHandle, setTabDirty]);

  const switchTab = useCallback((tabId: string) => {
    if (tabId === activeTabIdRef.current) {
      return;
    }

    const targetTab = tabsRef.current.find((tab) => tab.id === tabId);
    if (!targetTab) {
      return;
    }

    setActiveTabId(tabId);
    syncWorkspaceWindowTitle(rootPath, tabsRef.current, tabId);
  }, [rootPath]);

  const openTab = useCallback(
    async (filePath: string, options: OpenTabOptions = {}): Promise<string> => {
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
        syncWorkspaceWindowTitle(rootPath, nextTabs, pinnedTab.id);
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
          syncWorkspaceWindowTitle(rootPath, nextTabs, newTab.id);
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
        syncWorkspaceWindowTitle(rootPath, nextTabs, reusedTab.id);
        return reusedTab.id;
      }

      const newTab = createEditorTab(filePath, fileContent, { preview });
      const nextTabs = [...currentTabs, newTab];
      setTabs(nextTabs);
      setActiveTabId(newTab.id);
      syncWorkspaceWindowTitle(rootPath, nextTabs, newTab.id);
      return newTab.id;
    },
    [pinTab, rootPath, switchTab],
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

      if (result === 'save') {
        if (handle) {
          const saved = await handle.saveDocument();
          if (!saved) {
            return false;
          }
        }
      }

      const filtered = tabsRef.current.filter((tab) => tab.id !== tabId);
      setTabs(filtered);

      if (filtered.length === 0) {
        setActiveTabId(null);
        syncWorkspaceWindowTitle(rootPath, filtered, null);
        window.electronAPI.requestClose();
        return true;
      }

      if (isActive) {
        const closedIndex = tabsRef.current.findIndex(
          (tab) => tab.id === tabId,
        );
        const nextTab = filtered[Math.min(closedIndex, filtered.length - 1)];
        setActiveTabId(nextTab.id);
        syncWorkspaceWindowTitle(rootPath, filtered, nextTab.id);
      } else {
        syncWorkspaceWindowTitle(rootPath, filtered, activeTabIdRef.current);
      }

      return true;
    },
    [rootPath],
  );

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
      syncWorkspaceWindowTitle(rootPath, next, activeTabIdRef.current);
      return next;
    });
    return true;
  }, [rootPath]);

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
          syncWorkspaceWindowTitle(rootPath, remaining, nextTab.id);
        } else {
          setActiveTabId(null);
          syncWorkspaceWindowTitle(rootPath, remaining, null);
        }
      } else {
        syncWorkspaceWindowTitle(rootPath, remaining, activeTabIdRef.current);
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
    [refreshTree, rootPath, selectedPath],
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
          syncWorkspaceWindowTitle(rootPath, next, activeTabIdRef.current);
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
    [refreshTree, rootPath],
  );

  const renameTab = useCallback(
    async (tabId: string, newName: string): Promise<boolean> => {
      const tab = tabsRef.current.find((t) => t.id === tabId);
      if (!tab) {
        return false;
      }
      return renameExplorerEntry(tab.filePath, newName);
    },
    [renameExplorerEntry],
  );

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const activeFilePath = activeTab?.filePath ?? null;

  useEffect(() => {
    syncWorkspaceWindowTitle(rootPath, tabs, activeTabId);
  }, [activeTabId, rootPath, tabs]);

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
    closeActiveTab,
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
