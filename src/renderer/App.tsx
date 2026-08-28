import { useEffect, useState } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SingleDocumentView } from './components/SingleDocumentView';
import { WorkspaceView } from './components/WorkspaceView';

type AppMode =
  | { kind: 'welcome' }
  | {
      kind: 'single';
      sessionKey: number;
      initialDocument?: { path: string; content: string } | null;
    }
  | { kind: 'folder'; rootPath: string };

export function App() {
  const [mode, setMode] = useState<AppMode>({ kind: 'welcome' });
  const [singleSessionKey, setSingleSessionKey] = useState(0);

  const enterSingleMode = (
    initialDocument?: { path: string; content: string } | null,
  ) => {
    setSingleSessionKey((current) => {
      const nextKey = current + 1;
      setMode({
        kind: 'single',
        sessionKey: nextKey,
        initialDocument: initialDocument ?? null,
      });
      return nextKey;
    });
  };

  const openFolder = (rootPath: string) => {
    setMode({ kind: 'folder', rootPath });
  };

  const handleCreateNew = () => {
    enterSingleMode(null);
  };

  const handleOpenExisting = async () => {
    const result = await window.electronAPI.openFile();
    if (result) {
      enterSingleMode(result);
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
      enterSingleMode(document);
    });

    const unsubscribeInitialUntitled = window.electronAPI.onInitialUntitled(() => {
      enterSingleMode(null);
    });

    const unsubscribeOpen = window.electronAPI.onOpenDocument((document) => {
      if (mode.kind === 'folder') {
        return;
      }
      if (mode.kind === 'single') {
        return;
      }
      enterSingleMode(document);
    });

    const unsubscribeInitialFolder = window.electronAPI.onInitialFolder((folder) => {
      openFolder(folder.rootPath);
    });

    const unsubscribeOpenFolder = window.electronAPI.onOpenFolder((folder) => {
      openFolder(folder.rootPath);
    });

    return () => {
      unsubscribeInitial();
      unsubscribeInitialUntitled();
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

      if (action === 'close') {
        window.electronAPI.requestClose();
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
    <SingleDocumentView
      key={mode.sessionKey}
      initialDocument={mode.initialDocument}
    />
  );
}
