import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuAction } from '../../ipc/channels';
import { Sidebar, getExplorerRenameDefaultValue, type SidebarView } from './Sidebar';
import { TabBar } from './TabBar';
import { NamePromptDialog } from './NamePromptDialog';
import {
  WorkspaceTabPanel,
  type WorkspaceTabPanelHandle,
} from './WorkspaceTabPanel';
import { useWorkspace } from '../hooks/useWorkspace';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '../editor/editorConfig';
import type { OpenTabOptions } from '../types/workspace';
import { getFileName } from '../utils/markdown';
import type { WorkspaceMatch } from '../utils/workspaceSearch';
import { emptyStateClass } from '../styles/ui';

interface WorkspaceViewProps {
  rootPath: string;
  onRegisterActions?: (actions: { openFile: (path: string) => void } | null) => void;
}

type RenamePromptState =
  | {
      kind: 'explorer';
      targetPath: string;
      isDirectory: boolean;
    }
  | {
      kind: 'tab';
      tabId: string;
    };

export function WorkspaceView({ rootPath, onRegisterActions }: WorkspaceViewProps) {
  const [namePrompt, setNamePrompt] = useState<{
    type: 'file' | 'folder';
    parentDir: string;
  } | null>(null);
  const [renamePrompt, setRenamePrompt] = useState<RenamePromptState | null>(
    null,
  );
  const [zoom, setZoom] = useState(100);
  const [sidebarView, setSidebarView] = useState<SidebarView>('explorer');
  const [searchFocusRequest, setSearchFocusRequest] = useState(0);
  const [activeSearchMatchIndex, setActiveSearchMatchIndex] = useState(-1);
  const panelHandlesRef = useRef(new Map<string, WorkspaceTabPanelHandle>());
  const activeTabIdRef = useRef<string | null>(null);

  const {
    tabs,
    activeTabId,
    activeFilePath,
    tree,
    selectedPath,
    setSelectedPath,
    getCreateParentDir,
    createExplorerFile,
    createExplorerFolder,
    deleteExplorerPath,
    openTab,
    closeTab,
    switchTab,
    pinTab,
    registerTabEditor,
    unregisterTabEditor,
    setTabDirty,
    updateTabFilePath,
    renameExplorerEntry,
    renameTab,
  } = useWorkspace({ rootPath });

  activeTabIdRef.current = activeTabId;

  useEffect(() => {
    onRegisterActions?.({
      openFile: (path) => {
        setSidebarView('explorer');
        setSelectedPath(path);
        void openTab(path, { preview: false });
      },
    });

    return () => {
      onRegisterActions?.(null);
    };
  }, [onRegisterActions, openTab, setSelectedPath]);

  const openFindInActivePanel = useCallback(
    (query?: string, matchIndex?: number) => {
      if (!activeTabIdRef.current) {
        return;
      }
      panelHandlesRef.current
        .get(activeTabIdRef.current)
        ?.openFindBar(query, matchIndex);
    },
    [],
  );

  const handleNavigateToSearchMatch = useCallback(
    async (match: WorkspaceMatch, query: string) => {
      const tabId = await openTab(match.filePath, { preview: false });
      window.setTimeout(() => {
        panelHandlesRef.current.get(tabId)?.openFindBar(query, match.indexInFile);
      }, 150);
    },
    [openTab],
  );

  const registerPanelHandle = useCallback(
    (tabId: string, handle: WorkspaceTabPanelHandle) => {
      panelHandlesRef.current.set(tabId, handle);
    },
    [],
  );

  const handleOpenFile = useCallback(
    (filePath: string, options?: OpenTabOptions) => {
      void openTab(filePath, options);
    },
    [openTab],
  );

  const handleNewFile = useCallback(
    (parentDir?: string) => {
      setNamePrompt({
        type: 'file',
        parentDir: getCreateParentDir(parentDir),
      });
    },
    [getCreateParentDir],
  );

  const handleNewFolder = useCallback(
    (parentDir?: string) => {
      setNamePrompt({
        type: 'folder',
        parentDir: getCreateParentDir(parentDir),
      });
    },
    [getCreateParentDir],
  );

  const handleDelete = useCallback(
    (targetPath: string, isDirectory: boolean) => {
      void deleteExplorerPath(targetPath, isDirectory);
    },
    [deleteExplorerPath],
  );

  const handleExplorerRename = useCallback(
    (targetPath: string, isDirectory: boolean) => {
      setRenamePrompt({
        kind: 'explorer',
        targetPath,
        isDirectory,
      });
    },
    [],
  );

  const handleRenameTab = useCallback((tabId: string) => {
    setRenamePrompt({ kind: 'tab', tabId });
  }, []);

  const handleNamePromptConfirm = useCallback(
    (name: string) => {
      if (!namePrompt) {
        return;
      }

      if (namePrompt.type === 'file') {
        void createExplorerFile(namePrompt.parentDir, name);
      } else {
        void createExplorerFolder(namePrompt.parentDir, name);
      }
      setNamePrompt(null);
    },
    [createExplorerFile, createExplorerFolder, namePrompt],
  );

  const handleRenameConfirm = useCallback(
    (name: string) => {
      if (!renamePrompt) {
        return;
      }

      if (renamePrompt.kind === 'explorer') {
        void renameExplorerEntry(renamePrompt.targetPath, name);
      } else {
        void renameTab(renamePrompt.tabId, name);
      }
      setRenamePrompt(null);
    },
    [renameExplorerEntry, renamePrompt, renameTab],
  );

  const handleMenuAction = useCallback(
    (action: MenuAction) => {
      switch (action) {
        case 'find':
          openFindInActivePanel();
          return;
        case 'find-in-workspace':
          setSidebarView('search');
          setSearchFocusRequest((current) => current + 1);
          return;
        case 'zoom-in':
          setZoom((current) => Math.min(ZOOM_MAX, current + ZOOM_STEP));
          return;
        case 'zoom-out':
          setZoom((current) => Math.max(ZOOM_MIN, current - ZOOM_STEP));
          return;
        case 'zoom-reset':
          setZoom(100);
          return;
        default:
          break;
      }

      if (!activeTabId) {
        return;
      }

      panelHandlesRef.current.get(activeTabId)?.runMenuAction(action);
    },
    [activeTabId, openFindInActivePanel],
  );

  useEffect(() => {
    const unsubscribe = window.electronAPI.onMenuAction((action) => {
      const editorActions: MenuAction[] = [
        'find',
        'find-in-workspace',
        'export-pdf',
        'print',
        'zoom-in',
        'zoom-out',
        'zoom-reset',
        'format-bold',
        'format-italic',
        'format-strikethrough',
        'format-heading-1',
        'format-heading-2',
        'format-heading-3',
        'format-heading-4',
        'format-heading-5',
        'format-heading-6',
        'format-body',
        'format-bullet-list',
        'format-ordered-list',
        'format-task-list',
        'format-blockquote',
        'format-link',
        'format-table',
        'format-image',
        'format-code-snippet',
        'format-math',
      ];

      if (editorActions.includes(action)) {
        handleMenuAction(action);
      }
    });

    return unsubscribe;
  }, [handleMenuAction]);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onOpenDocument((document) => {
      void openTab(document.path, { preview: false, content: document.content });
    });

    return unsubscribe;
  }, [openTab]);

  const renameDefaultValue =
    renamePrompt?.kind === 'explorer'
      ? getExplorerRenameDefaultValue(
          renamePrompt.targetPath,
          renamePrompt.isDirectory,
        )
      : renamePrompt?.kind === 'tab'
        ? getFileName(
            tabs.find((tab) => tab.id === renamePrompt.tabId)?.filePath ?? '',
          )
        : '';

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        rootPath={rootPath}
        tree={tree}
        view={sidebarView}
        onViewChange={setSidebarView}
        searchFocusRequest={searchFocusRequest}
        activeSearchMatchIndex={activeSearchMatchIndex}
        onActiveSearchMatchIndexChange={setActiveSearchMatchIndex}
        onNavigateToSearchMatch={handleNavigateToSearchMatch}
        activeFilePath={activeFilePath}
        selectedPath={selectedPath}
        onSelect={setSelectedPath}
        onOpenFile={handleOpenFile}
        onNewFile={handleNewFile}
        onNewFolder={handleNewFolder}
        onDelete={handleDelete}
        onRename={handleExplorerRename}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={switchTab}
          onCloseTab={(tabId) => void closeTab(tabId)}
          onPinTab={pinTab}
          onRenameTab={handleRenameTab}
        />
        <div className="relative flex min-h-0 flex-1 flex-col">
          {tabs.length === 0 ? (
            <div className={emptyStateClass}>
              <p>Select a markdown file from the sidebar to begin editing.</p>
            </div>
          ) : (
            tabs.map((tab) => (
              <WorkspaceTabPanel
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                zoom={zoom}
                onRegister={registerTabEditor}
                onUnregister={unregisterTabEditor}
                onDirtyChange={setTabDirty}
                onSaveAs={updateTabFilePath}
                onRegisterPanelHandle={(handle) =>
                  registerPanelHandle(tab.id, handle)
                }
              />
            ))
          )}
        </div>
      </div>

      {namePrompt && (
        <NamePromptDialog
          title={namePrompt.type === 'file' ? 'New File' : 'New Folder'}
          label={namePrompt.type === 'file' ? 'File name' : 'Folder name'}
          defaultValue={
            namePrompt.type === 'file' ? 'Untitled.md' : 'New Folder'
          }
          confirmLabel="Create"
          onConfirm={handleNamePromptConfirm}
          onCancel={() => setNamePrompt(null)}
        />
      )}

      {renamePrompt && (
        <NamePromptDialog
          title="Rename"
          label="Name"
          defaultValue={renameDefaultValue}
          confirmLabel="Rename"
          onConfirm={handleRenameConfirm}
          onCancel={() => setRenamePrompt(null)}
        />
      )}
    </div>
  );
}
