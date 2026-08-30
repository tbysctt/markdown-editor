import { useState } from 'react';
import type { EditorTab } from '../../types/workspace';
import { getTabLabel, isUntitledPath } from '../../types/workspace';
import { cn } from '../../utils/cn';
import { ContextMenu, type ContextMenuItem } from '../ContextMenu';

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
      <div
        className="flex shrink-0 overflow-x-auto border-b border-gray-200 bg-app-tab-bar"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={cn(
                'flex max-w-[180px] cursor-pointer select-none items-center gap-1.5 border-r border-gray-300 bg-gray-200 py-1.5 pl-3 pr-2 text-[0.8125rem] text-gray-600 hover:bg-gray-100',
                isActive && '-mb-px border-b border-white bg-white text-app-text',
              )}
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
              <span
                className={cn(
                  'truncate',
                  tab.isPreview && 'italic',
                )}
              >
                {tab.dirty ? '*' : ''}
                {getTabLabel(tab.filePath)}
              </span>
              <button
                type="button"
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border-none bg-transparent p-0 text-base leading-none text-gray-500 hover:bg-gray-300 hover:text-app-text"
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
