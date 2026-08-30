import { useCallback, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import type { MenuAction } from '../../../ipc/channels';
import { TabBar } from './TabBar';
import {
  WorkspaceTabPanel,
  type WorkspaceTabPanelHandle,
} from '../editor/WorkspaceTabPanel';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '../../editor/editorConfig';
import {
  EDITOR_FORMAT_ACTIONS,
  EDITOR_VIEW_ACTIONS,
} from '../../editor/formatMenuActions';
import { useMenuActions } from '../../hooks/useMenuActions';
import type { EditorTab, TabEditorHandle } from '../../types/workspace';
import { emptyStateClass } from '../../styles/ui';

export interface DocumentEditorShellProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  emptyMessage: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void | Promise<boolean>;
  onPinTab?: (tabId: string) => void;
  onRenameTab?: (tabId: string) => void;
  registerTabEditor: (handle: TabEditorHandle) => void;
  unregisterTabEditor: (tabId: string) => void;
  setTabDirty: (tabId: string, dirty: boolean) => void;
  updateTabFilePath: (tabId: string, newPath: string) => void;
  extraViewActions?: MenuAction[];
  onExtraViewAction?: (action: MenuAction) => void;
  onOpenDocument?: (document: { path: string; content: string }) => void;
  panelHandlesRef?: MutableRefObject<Map<string, WorkspaceTabPanelHandle>>;
  children?: ReactNode;
}

export function DocumentEditorShell({
  tabs,
  activeTabId,
  emptyMessage,
  onSelectTab,
  onCloseTab,
  onPinTab,
  onRenameTab,
  registerTabEditor,
  unregisterTabEditor,
  setTabDirty,
  updateTabFilePath,
  extraViewActions = [],
  onExtraViewAction,
  onOpenDocument,
  panelHandlesRef: externalPanelHandlesRef,
  children,
}: DocumentEditorShellProps) {
  const [zoom, setZoom] = useState(100);
  const internalPanelHandlesRef = useRef(new Map<string, WorkspaceTabPanelHandle>());
  const panelHandlesRef = externalPanelHandlesRef ?? internalPanelHandlesRef;
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const registerPanelHandle = useCallback(
    (tabId: string, handle: WorkspaceTabPanelHandle) => {
      panelHandlesRef.current.set(tabId, handle);
    },
    [],
  );

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

  const handleMenuAction = useCallback(
    (action: MenuAction) => {
      switch (action) {
        case 'find':
          openFindInActivePanel();
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

      if (onExtraViewAction?.(action)) {
        return;
      }

      if (!activeTabIdRef.current) {
        return;
      }

      panelHandlesRef.current
        .get(activeTabIdRef.current)
        ?.runMenuAction(action);
    },
    [onExtraViewAction, openFindInActivePanel],
  );

  const menuActions = [...EDITOR_VIEW_ACTIONS, ...extraViewActions, ...EDITOR_FORMAT_ACTIONS];

  useMenuActions(menuActions, handleMenuAction);

  useEffect(() => {
    if (!onOpenDocument) {
      return;
    }

    const unsubscribe = window.electronAPI.onOpenDocument(onOpenDocument);
    return unsubscribe;
  }, [onOpenDocument]);

  return (
    <>
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={onSelectTab}
        onCloseTab={(tabId) => void onCloseTab(tabId)}
        onPinTab={onPinTab}
        onRenameTab={onRenameTab}
      />
      <div className="relative flex min-h-0 flex-1 flex-col">
        {tabs.length === 0 ? (
          <div className={emptyStateClass}>
            <p>{emptyMessage}</p>
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
      {children}
    </>
  );
}

export function usePanelHandlesRef() {
  return useRef(new Map<string, WorkspaceTabPanelHandle>());
}
