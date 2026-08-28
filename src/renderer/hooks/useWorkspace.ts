import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { MenuAction } from '../../ipc/channels';
import type { FileTreeNode } from '../types/electron';
import {
  createTabId,
  type EditorTab,
  type OpenTabOptions,
} from '../types/workspace';
import { confirmDiscardIfDirty } from '../utils/documentConfirm';
import {
  buildWorkspaceTitle,
  prepareMarkdownForEditor,
  prepareMarkdownForSave,
  type QueuedImage,
} from '../utils/markdown';

interface UseWorkspaceOptions {
  editor: Editor | null;
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

export function useWorkspace({ editor, rootPath }: UseWorkspaceOptions) {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tree, setTree] = useState<FileTreeNode | null>(null);
  const [queuedImages, setQueuedImages] = useState<QueuedImage[]>([]);
  const suppressDirtyRef = useRef(false);
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  const queuedImagesRef = useRef(queuedImages);

  tabsRef.current = tabs;
  activeTabIdRef.current = activeTabId;
  queuedImagesRef.current = queuedImages;

  const refreshTree = useCallback(async () => {
    const nextTree = await window.electronAPI.readFolderTree(rootPath);
    setTree(nextTree);
  }, [rootPath]);

  useEffect(() => {
    void refreshTree();
  }, [refreshTree]);

  useEffect(() => {
    void window.electronAPI.startFolderWatch(rootPath);

    const unsubChange = window.electronAPI.onFolderChanged(() => {
      void refreshTree();
    });

    const unsubRename = window.electronAPI.onFolderRenamed(
      ({ oldPath, newPath }) => {
        setTabs((current) =>
          current.map((tab) =>
            tab.filePath === oldPath ? { ...tab, filePath: newPath } : tab,
          ),
        );

        const activeTab = tabsRef.current.find(
          (tab) => tab.id === activeTabIdRef.current,
        );
        if (
          activeTab?.filePath === oldPath &&
          !activeTab.dirty &&
          editor
        ) {
          void window.electronAPI.readFolderFile(newPath).then((file) => {
            suppressDirtyRef.current = true;
            void prepareMarkdownForEditor(file.content, newPath).then(
              (prepared) => {
                editor.commands.setContent(prepared, { contentType: 'markdown' });
                setTabs((current) =>
                  current.map((tab) =>
                    tab.id === activeTabIdRef.current
                      ? { ...tab, editorMarkdown: file.content }
                      : tab,
                  ),
                );
                suppressDirtyRef.current = false;
              },
            );
          });
        }

        void refreshTree();
      },
    );

    return () => {
      unsubChange();
      unsubRename();
      void window.electronAPI.stopFolderWatch();
    };
  }, [editor, refreshTree, rootPath]);

  const getEditorMarkdown = useCallback((): string => {
    if (!editor) {
      return '';
    }
    return prepareMarkdownForSave(editor.getMarkdown(), queuedImagesRef.current);
  }, [editor]);

  const snapshotActiveTab = useCallback((): EditorTab[] => {
    const currentTabs = tabsRef.current;
    const currentActiveId = activeTabIdRef.current;
    if (!editor || !currentActiveId) {
      return currentTabs;
    }

    const markdown = getEditorMarkdown();
    return currentTabs.map((tab) =>
      tab.id === currentActiveId
        ? {
            ...tab,
            editorMarkdown: markdown,
            queuedImages: queuedImagesRef.current,
          }
        : tab,
    );
  }, [editor, getEditorMarkdown]);

  const loadTabIntoEditor = useCallback(
    async (tab: EditorTab) => {
      if (!editor) {
        return;
      }

      suppressDirtyRef.current = true;
      const prepared = await prepareMarkdownForEditor(
        tab.editorMarkdown,
        tab.filePath,
      );
      editor.commands.setContent(prepared, { contentType: 'markdown' });
      setQueuedImages(tab.queuedImages);
      suppressDirtyRef.current = false;
    },
    [editor],
  );

  const clearEditor = useCallback(() => {
    if (!editor) {
      return;
    }

    suppressDirtyRef.current = true;
    editor.commands.setContent('', { contentType: 'markdown' });
    setQueuedImages([]);
    suppressDirtyRef.current = false;
  }, [editor]);

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

  const markActiveTabDirty = useCallback(() => {
    if (suppressDirtyRef.current || !activeTabIdRef.current) {
      return;
    }

    setTabs((current) => {
      const next = current.map((tab) =>
        tab.id === activeTabIdRef.current
          ? { ...tab, dirty: true, isPreview: false }
          : tab,
      );
      syncWorkspaceWindowTitle(rootPath, next, activeTabIdRef.current);
      return next;
    });
  }, [rootPath]);

  const saveActiveDocument = useCallback(async (): Promise<boolean> => {
    if (!editor || !activeTabIdRef.current) {
      return false;
    }

    const activeTab = tabsRef.current.find(
      (tab) => tab.id === activeTabIdRef.current,
    );
    if (!activeTab) {
      return false;
    }

    let content = getEditorMarkdown();
    const targetPath = activeTab.filePath;

    if (queuedImagesRef.current.length > 0) {
      const copied = await window.electronAPI.copyQueuedImages(
        targetPath,
        queuedImagesRef.current.map((image) => ({
          tempPath: image.tempPath,
          relativePath: image.relativePath,
        })),
      );

      const updatedQueued = queuedImagesRef.current.map((image, index) => ({
        ...image,
        relativePath: copied[index]?.relativePath ?? image.relativePath,
      }));

      content = prepareMarkdownForSave(editor.getMarkdown(), updatedQueued);
      setQueuedImages([]);
    }

    await window.electronAPI.saveFile(targetPath, content);

    setTabs((current) => {
      const next = current.map((tab) =>
        tab.id === activeTabIdRef.current
          ? {
              ...tab,
              dirty: false,
              isPreview: false,
              editorMarkdown: content,
              queuedImages: [],
            }
          : tab,
      );
      syncWorkspaceWindowTitle(rootPath, next, activeTabIdRef.current);
      return next;
    });
    return true;
  }, [editor, getEditorMarkdown, rootPath]);

  const switchTab = useCallback(
    async (tabId: string) => {
      if (tabId === activeTabIdRef.current) {
        return;
      }

      const snapshotted = snapshotActiveTab();
      const targetTab = snapshotted.find((tab) => tab.id === tabId);
      if (!targetTab) {
        return;
      }

      setTabs(snapshotted);
      setActiveTabId(tabId);
      await loadTabIntoEditor(targetTab);
      syncWorkspaceWindowTitle(rootPath, snapshotted, tabId);
    },
    [loadTabIntoEditor, rootPath, snapshotActiveTab],
  );

  const openTab = useCallback(
    async (filePath: string, options: OpenTabOptions = {}) => {
      const { preview = false, content } = options;
      const snapshotted = snapshotActiveTab();
      const existing = snapshotted.find((tab) => tab.filePath === filePath);
      if (existing) {
        await switchTab(existing.id);
        if (!preview) {
          pinTab(existing.id);
        }
        return;
      }

      const fileContent =
        content ?? (await window.electronAPI.readFolderFile(filePath)).content;

      const previewTab = snapshotted.find((tab) => tab.isPreview);

      if (!preview && previewTab && !previewTab.dirty) {
        const pinnedTab: EditorTab = {
          ...previewTab,
          filePath,
          dirty: false,
          isPreview: false,
          editorMarkdown: fileContent,
          queuedImages: [],
        };
        const nextTabs = snapshotted.map((tab) =>
          tab.id === previewTab.id ? pinnedTab : tab,
        );
        setTabs(nextTabs);
        setActiveTabId(pinnedTab.id);
        await loadTabIntoEditor(pinnedTab);
        syncWorkspaceWindowTitle(rootPath, nextTabs, pinnedTab.id);
        return;
      }

      if (preview && previewTab) {
        if (previewTab.dirty) {
          const pinnedTabs = snapshotted.map((tab) =>
            tab.id === previewTab.id ? { ...tab, isPreview: false } : tab,
          );
          const newTab: EditorTab = {
            id: createTabId(),
            filePath,
            dirty: false,
            isPreview: true,
            editorMarkdown: fileContent,
            queuedImages: [],
          };
          const nextTabs = [...pinnedTabs, newTab];
          setTabs(nextTabs);
          setActiveTabId(newTab.id);
          await loadTabIntoEditor(newTab);
          syncWorkspaceWindowTitle(rootPath, nextTabs, newTab.id);
          return;
        }

        const reusedTab: EditorTab = {
          ...previewTab,
          filePath,
          dirty: false,
          isPreview: true,
          editorMarkdown: fileContent,
          queuedImages: [],
        };
        const nextTabs = snapshotted.map((tab) =>
          tab.id === previewTab.id ? reusedTab : tab,
        );
        setTabs(nextTabs);
        setActiveTabId(reusedTab.id);
        await loadTabIntoEditor(reusedTab);
        syncWorkspaceWindowTitle(rootPath, nextTabs, reusedTab.id);
        return;
      }

      const newTab: EditorTab = {
        id: createTabId(),
        filePath,
        dirty: false,
        isPreview: preview,
        editorMarkdown: fileContent,
        queuedImages: [],
      };

      const nextTabs = [...snapshotted, newTab];
      setTabs(nextTabs);
      setActiveTabId(newTab.id);
      await loadTabIntoEditor(newTab);
      syncWorkspaceWindowTitle(rootPath, nextTabs, newTab.id);
    },
    [loadTabIntoEditor, pinTab, rootPath, snapshotActiveTab, switchTab],
  );

  const closeTab = useCallback(
    async (tabId: string): Promise<boolean> => {
      const snapshotted = snapshotActiveTab();
      const tabToClose = snapshotted.find((tab) => tab.id === tabId);
      if (!tabToClose) {
        return false;
      }

      const result = await confirmDiscardIfDirty(tabToClose.dirty);
      if (result === 'cancel') {
        return false;
      }

      const isActive = tabId === activeTabIdRef.current;

      if (result === 'save') {
        if (isActive) {
          const saved = await saveActiveDocument();
          if (!saved) {
            return false;
          }
        } else {
          const content = prepareMarkdownForSave(
            tabToClose.editorMarkdown,
            tabToClose.queuedImages,
          );
          await window.electronAPI.saveFile(tabToClose.filePath, content);
        }
      }

      const filtered = snapshotted.filter((tab) => tab.id !== tabId);
      setTabs(filtered);

      if (isActive) {
        if (filtered.length > 0) {
          const closedIndex = snapshotted.findIndex((tab) => tab.id === tabId);
          const nextTab = filtered[Math.min(closedIndex, filtered.length - 1)];
          setActiveTabId(nextTab.id);
          await loadTabIntoEditor(nextTab);
          syncWorkspaceWindowTitle(rootPath, filtered, nextTab.id);
        } else {
          setActiveTabId(null);
          clearEditor();
          syncWorkspaceWindowTitle(rootPath, filtered, null);
        }
      } else {
        syncWorkspaceWindowTitle(rootPath, filtered, activeTabIdRef.current);
      }

      return true;
    },
    [
      clearEditor,
      loadTabIntoEditor,
      rootPath,
      saveActiveDocument,
      snapshotActiveTab,
    ],
  );

  const saveActiveDocumentAs = useCallback(async (): Promise<boolean> => {
    if (!editor || !activeTabIdRef.current) {
      return false;
    }

    let content = getEditorMarkdown();
    const result = await window.electronAPI.saveAs(content);
    if (!result) {
      return false;
    }

    const targetPath = result.path;

    if (queuedImagesRef.current.length > 0) {
      const copied = await window.electronAPI.copyQueuedImages(
        targetPath,
        queuedImagesRef.current.map((image) => ({
          tempPath: image.tempPath,
          relativePath: image.relativePath,
        })),
      );

      const updatedQueued = queuedImagesRef.current.map((image, index) => ({
        ...image,
        relativePath: copied[index]?.relativePath ?? image.relativePath,
      }));

      content = prepareMarkdownForSave(editor.getMarkdown(), updatedQueued);
      setQueuedImages([]);
      await window.electronAPI.saveFile(targetPath, content);
    }

    setTabs((current) => {
      const next = current.map((tab) =>
        tab.id === activeTabIdRef.current
          ? {
              ...tab,
              filePath: targetPath,
              dirty: false,
              isPreview: false,
              editorMarkdown: content,
              queuedImages: [],
            }
          : tab,
      );
      syncWorkspaceWindowTitle(rootPath, next, activeTabIdRef.current);
      return next;
    });
    setQueuedImages([]);
    void refreshTree();
    return true;
  }, [editor, getEditorMarkdown, refreshTree, rootPath]);

  const closeActiveTab = useCallback(async () => {
    if (!activeTabIdRef.current) {
      return;
    }
    await closeTab(activeTabIdRef.current);
  }, [closeTab]);

  const saveAllDirtyTabs = useCallback(async (): Promise<boolean> => {
    const snapshotted = snapshotActiveTab();

    for (const tab of snapshotted) {
      if (!tab.dirty) {
        continue;
      }

      if (tab.id === activeTabIdRef.current) {
        const saved = await saveActiveDocument();
        if (!saved) {
          return false;
        }
      } else {
        const content = prepareMarkdownForSave(
          tab.editorMarkdown,
          tab.queuedImages,
        );
        await window.electronAPI.saveFile(tab.filePath, content);
      }
    }

    setTabs((current) => {
      const next = current.map((tab) => ({ ...tab, dirty: false }));
      syncWorkspaceWindowTitle(rootPath, next, activeTabIdRef.current);
      return next;
    });
    return true;
  }, [rootPath, saveActiveDocument, snapshotActiveTab]);

  const addQueuedImage = useCallback(
    (image: QueuedImage) => {
      setQueuedImages((current) => [...current, image]);
      markActiveTabDirty();
    },
    [markActiveTabDirty],
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
    queuedImages,
    refreshTree,
    openTab,
    closeTab,
    switchTab,
    pinTab,
    closeActiveTab,
    markActiveTabDirty,
    saveActiveDocument,
    saveActiveDocumentAs,
    addQueuedImage,
  };
}
