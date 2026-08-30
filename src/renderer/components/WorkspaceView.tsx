import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuAction } from '../../ipc/channels';
import { Sidebar, getExplorerRenameDefaultValue, type SidebarView } from './workspace/Sidebar';
import { NamePromptDialog } from './dialogs/NamePromptDialog';
import { DocumentEditorShell } from './workspace/DocumentEditorShell';
import type { WorkspaceTabPanelHandle } from './editor/WorkspaceTabPanel';
import { useWorkspace } from '../hooks/useWorkspace';
import type { OpenTabOptions } from '../types/workspace';
import { getFileName } from '../utils/markdown';
import type { WorkspaceMatch } from '../utils/workspaceSearch';

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
  const [sidebarView, setSidebarView] = useState<SidebarView>('explorer');
  const [searchFocusRequest, setSearchFocusRequest] = useState(0);
  const [activeSearchMatchIndex, setActiveSearchMatchIndex] = useState(-1);
  const panelHandlesRef = useRef(new Map<string, WorkspaceTabPanelHandle>());

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

  const handleNavigateToSearchMatch = useCallback(
    async (match: WorkspaceMatch, query: string) => {
      const tabId = await openTab(match.filePath, { preview: false });
      window.setTimeout(() => {
        panelHandlesRef.current.get(tabId)?.openFindBar(query, match.indexInFile);
      }, 150);
    },
    [openTab],
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

  const handleExtraViewAction = useCallback((action: MenuAction) => {
    if (action === 'find-in-workspace') {
      setSidebarView('search');
      setSearchFocusRequest((current) => current + 1);
      return true;
    }
    return false;
  }, []);

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
        <DocumentEditorShell
          tabs={tabs}
          activeTabId={activeTabId}
          emptyMessage="Select a markdown file from the sidebar to begin editing."
          onSelectTab={switchTab}
          onCloseTab={closeTab}
          onPinTab={pinTab}
          onRenameTab={handleRenameTab}
          registerTabEditor={registerTabEditor}
          unregisterTabEditor={unregisterTabEditor}
          setTabDirty={setTabDirty}
          updateTabFilePath={updateTabFilePath}
          extraViewActions={['find-in-workspace']}
          onExtraViewAction={handleExtraViewAction}
          onOpenDocument={(document) => {
            void openTab(document.path, { preview: false, content: document.content });
          }}
          panelHandlesRef={panelHandlesRef}
        />
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
