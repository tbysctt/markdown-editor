import { useCallback, useEffect, useState } from 'react';
import { NamePromptDialog } from './dialogs/NamePromptDialog';
import { DocumentEditorShell } from './workspace/DocumentEditorShell';
import { useStandaloneTabs } from '../hooks/useStandaloneTabs';
import { getFileName } from '../utils/markdown';
import { isUntitledPath } from '../types/workspace';

interface SingleDocumentViewProps {
  initialDocument?: { path: string; content: string } | null;
}

export function SingleDocumentView({
  initialDocument = null,
}: SingleDocumentViewProps) {
  const [renamePrompt, setRenamePrompt] = useState<{
    tabId: string;
    defaultValue: string;
  } | null>(null);

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

  useEffect(() => {
    bootstrap(initialDocument);
  }, [bootstrap, initialDocument]);

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
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <DocumentEditorShell
        tabs={tabs}
        activeTabId={activeTabId}
        emptyMessage="Open a markdown file or create a new document to begin editing."
        onSelectTab={switchTab}
        onCloseTab={closeTab}
        onRenameTab={handleRenameTab}
        registerTabEditor={registerTabEditor}
        unregisterTabEditor={unregisterTabEditor}
        setTabDirty={setTabDirty}
        updateTabFilePath={updateTabFilePath}
        onOpenDocument={(document) => {
          void openTab(document.path, { content: document.content });
        }}
      />

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
