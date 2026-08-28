import { useState } from 'react';
import type { EditorTab } from '../types/workspace';
import { getTabLabel, isUntitledPath } from '../types/workspace';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';

interface TabBarProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onPinTab?: (tabId: string) => void;
  onRenameTab?: (tabId: string) => void;
}

interface TabContextMenuState {
  x: number;
  y: number;
  tab: EditorTab;
}

export function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onPinTab,
  onRenameTab,
}: TabBarProps) {
  const [contextMenu, setContextMenu] = useState<TabContextMenuState | null>(
    null,
  );

  if (tabs.length === 0) {
    return null;
  }

  const contextMenuItems: ContextMenuItem[] = contextMenu
    ? [
        {
          id: 'rename',
          label: 'Rename',
          disabled:
            !onRenameTab || isUntitledPath(contextMenu.tab.filePath),
          onClick: () => onRenameTab?.(contextMenu.tab.id),
        },
        {
          id: 'close',
          label: 'Close',
          onClick: () => onCloseTab(contextMenu.tab.id),
        },
      ]
    : [];

  return (
    <>
      <div className="tab-bar" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`tab${isActive ? ' tab--active' : ''}${
                tab.isPreview ? ' tab--preview' : ''
              }`}
              onClick={() => onSelectTab(tab.id)}
              onDoubleClick={() => onPinTab?.(tab.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  tab,
                });
              }}
              onMouseDown={(event) => {
                if (event.button === 1) {
                  event.preventDefault();
                  void onCloseTab(tab.id);
                }
              }}
            >
              <span className="tab-label">
                {tab.dirty ? '*' : ''}
                {getTabLabel(tab.filePath)}
              </span>
              <button
                type="button"
                className="tab-close"
                aria-label={`Close ${getTabLabel(tab.filePath)}`}
                onClick={(event) => {
                  event.stopPropagation();
                  void onCloseTab(tab.id);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
