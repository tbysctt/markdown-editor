import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuAction } from '../../ipc/channels';
import { TabBar } from './TabBar';
import { NamePromptDialog } from './NamePromptDialog';
import {
  WorkspaceTabPanel,
  type WorkspaceTabPanelHandle,
} from './WorkspaceTabPanel';
import { useStandaloneTabs } from '../hooks/useStandaloneTabs';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '../editor/editorConfig';
import { getFileName } from '../utils/markdown';
import { isUntitledPath } from '../types/workspace';

interface SingleDocumentViewProps {
  initialDocument?: { path: string; content: string } | null;
}

export function SingleDocumentView({
  initialDocument = null,
}: SingleDocumentViewProps) {
  const [zoom, setZoom] = useState(100);
  const [renamePrompt, setRenamePrompt] = useState<{
    tabId: string;
    defaultValue: string;
  } | null>(null);
  const panelHandlesRef = useRef(new Map<string, WorkspaceTabPanelHandle>());

  const {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    switchTab,
    registerTabEditor,
    unregisterTabEditor,
    setTabDirty,
    updateTabFilePath,
    renameTab,
    bootstrap,
  } = useStandaloneTabs();

  const registerPanelHandle = useCallback(
    (tabId: string, handle: WorkspaceTabPanelHandle) => {
      panelHandlesRef.current.set(tabId, handle);
    },
    [],
  );

  useEffect(() => {
    bootstrap(initialDocument);
  }, [bootstrap, initialDocument]);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onOpenDocument((document) => {
      void openTab(document.path, { content: document.content });
    });

    return unsubscribe;
  }, [openTab]);

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

  const handleRenameTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || isUntitledPath(tab.filePath)) {
        return;
      }

      setRenamePrompt({
        tabId,
        defaultValue: getFileName(tab.filePath),
      });
    },
    [tabs],
  );

  const handleRenameConfirm = useCallback(
    (name: string) => {
      if (!renamePrompt) {
        return;
      }

      void renameTab(renamePrompt.tabId, name);
      setRenamePrompt(null);
    },
    [renamePrompt, renameTab],
  );

  return (
    <div className="single-document-view">
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={switchTab}
        onCloseTab={(tabId) => void closeTab(tabId)}
        onRenameTab={handleRenameTab}
      />
      <div className="editor-view">
        {tabs.length === 0 ? (
          <div className="workspace-empty">
            <p>Open a markdown file or create a new document to begin editing.</p>
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

      {renamePrompt && (
        <NamePromptDialog
          title="Rename"
          label="Name"
          defaultValue={renamePrompt.defaultValue}
          confirmLabel="Rename"
          onConfirm={handleRenameConfirm}
          onCancel={() => setRenamePrompt(null)}
        />
      )}
    </div>
  );
}
