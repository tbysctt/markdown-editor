import type { EditorTab } from '../types/workspace';
import { getFileName } from '../utils/markdown';

interface TabBarProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onPinTab: (tabId: string) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onPinTab,
}: TabBarProps) {
  if (tabs.length === 0) {
    return null;
  }

  return (
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
            onDoubleClick={() => onPinTab(tab.id)}
            onMouseDown={(event) => {
              if (event.button === 1) {
                event.preventDefault();
                void onCloseTab(tab.id);
              }
            }}
          >
            <span className="tab-label">
              {tab.dirty ? '*' : ''}
              {getFileName(tab.filePath)}
            </span>
            <button
              type="button"
              className="tab-close"
              aria-label={`Close ${getFileName(tab.filePath)}`}
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
  );
}
