import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuAction } from '../../ipc/channels';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { NamePromptDialog } from './NamePromptDialog';
import {
  WorkspaceTabPanel,
  type WorkspaceTabPanelHandle,
} from './WorkspaceTabPanel';
import { useWorkspace } from '../hooks/useWorkspace';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '../editor/editorConfig';
import type { OpenTabOptions } from '../types/workspace';

interface WorkspaceViewProps {
  rootPath: string;
}

export function WorkspaceView({ rootPath }: WorkspaceViewProps) {
  const [namePrompt, setNamePrompt] = useState<{
    type: 'file' | 'folder';
    parentDir: string;
  } | null>(null);
  const [zoom, setZoom] = useState(100);
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
  } = useWorkspace({ rootPath });

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

  const handleMenuAction = useCallback(
    (action: MenuAction) => {
      switch (action) {
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
    [activeTabId],
  );

  useEffect(() => {
    const unsubscribe = window.electronAPI.onMenuAction((action) => {
      const editorActions: MenuAction[] = [
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
        'format-body',
        'format-bullet-list',
        'format-ordered-list',
        'format-task-list',
        'format-blockquote',
        'format-link',
        'format-table',
        'format-image',
        'format-code-snippet',
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

  return (
    <div className="workspace-view">
      <Sidebar
        rootPath={rootPath}
        tree={tree}
        activeFilePath={activeFilePath}
        selectedPath={selectedPath}
        onSelect={setSelectedPath}
        onOpenFile={handleOpenFile}
        onNewFile={handleNewFile}
        onNewFolder={handleNewFolder}
        onDelete={handleDelete}
      />
      <div className="workspace-main">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={switchTab}
          onCloseTab={(tabId) => void closeTab(tabId)}
          onPinTab={pinTab}
        />
        <div className="editor-view">
          {tabs.length === 0 ? (
            <div className="workspace-empty">
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
    </div>
  );
}
