import { useEffect, useState } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { EditorView } from './components/EditorView';
import { WorkspaceView } from './components/WorkspaceView';

type AppMode =
  | { kind: 'welcome' }
  | { kind: 'single'; content: string; path: string | null }
  | { kind: 'folder'; rootPath: string };

export function App() {
  const [mode, setMode] = useState<AppMode>({ kind: 'welcome' });

  const openSingleEditor = (content: string, path: string | null) => {
    setMode({ kind: 'single', content, path });
  };

  const openFolder = (rootPath: string) => {
    setMode({ kind: 'folder', rootPath });
  };

  const handleCreateNew = () => {
    openSingleEditor('', null);
  };

  const handleOpenExisting = async () => {
    const result = await window.electronAPI.openFile();
    if (result) {
      openSingleEditor(result.content, result.path);
    }
  };

  const handleOpenFolder = async () => {
    const result = await window.electronAPI.openFolder();
    if (result) {
      openFolder(result.rootPath);
    }
  };

  useEffect(() => {
    if (mode.kind === 'welcome') {
      window.electronAPI.setSessionState(false, 'empty');
    } else if (mode.kind === 'single') {
      window.electronAPI.setSessionState(true, 'single');
    } else {
      window.electronAPI.setSessionState(true, 'folder');
    }
  }, [mode]);

  useEffect(() => {
    const unsubscribeInitial = window.electronAPI.onInitialDocument((document) => {
      openSingleEditor(document.content, document.path);
    });

    const unsubscribeOpen = window.electronAPI.onOpenDocument((document) => {
      if (mode.kind === 'folder') {
        return;
      }
      openSingleEditor(document.content, document.path);
    });

    const unsubscribeInitialFolder = window.electronAPI.onInitialFolder((folder) => {
      openFolder(folder.rootPath);
    });

    const unsubscribeOpenFolder = window.electronAPI.onOpenFolder((folder) => {
      openFolder(folder.rootPath);
    });

    return () => {
      unsubscribeInitial();
      unsubscribeOpen();
      unsubscribeInitialFolder();
      unsubscribeOpenFolder();
    };
  }, [mode.kind]);

  useEffect(() => {
    return window.electronAPI.onMenuAction((action) => {
      if (mode.kind !== 'welcome') {
        return;
      }

      if (action === 'new') {
        handleCreateNew();
      }
    });
  }, [mode.kind]);

  if (mode.kind === 'welcome') {
    return (
      <WelcomeScreen
        onCreateNew={handleCreateNew}
        onOpenExisting={() => void handleOpenExisting()}
        onOpenFolder={() => void handleOpenFolder()}
      />
    );
  }

  if (mode.kind === 'folder') {
    return <WorkspaceView rootPath={mode.rootPath} />;
  }

  return (
    <EditorView
      key={`${mode.path ?? 'new'}-${mode.content.length}`}
      initialContent={mode.content}
      initialPath={mode.path}
      onNavigateWelcome={() => setMode({ kind: 'welcome' })}
    />
  );
}
