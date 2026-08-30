import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CommandPalette,
  type CommandPaletteItem,
} from './components/shell/CommandPalette';
import { WelcomeScreen } from './components/shell/WelcomeScreen';
import { SingleDocumentView } from './components/SingleDocumentView';
import { WorkspaceView } from './components/WorkspaceView';
import { getFileName } from './utils/markdown';
import { addRecentPath, getRecentDisplayPath } from './utils/recentPaths';
import { collectMarkdownFiles } from './utils/workspaceSearch';
import { useMenuActions } from './hooks/useMenuActions';

type AppMode =
  | { kind: 'welcome' }
  | {
      kind: 'single';
      sessionKey: number;
      initialDocument?: { path: string; content: string } | null;
    }
  | { kind: 'folder'; rootPath: string };

const WELCOME_MENU_ACTIONS = ['command-palette', 'close'] as const;

const COMMAND_ITEMS: CommandPaletteItem[] = [
  { kind: 'command', id: 'open-folder', label: 'Open folder' },
  { kind: 'command', id: 'open-document', label: 'Open document' },
];

function buildFileItems(filePaths: string[]): CommandPaletteItem[] {
  return [...filePaths]
    .sort((left, right) =>
      getFileName(left).localeCompare(getFileName(right), undefined, {
        sensitivity: 'base',
      }),
    )
    .map((path) => ({
      kind: 'file' as const,
      path,
      label: getFileName(path),
      detail: getRecentDisplayPath(path),
    }));
}

export function App() {
  const [mode, setMode] = useState<AppMode>({ kind: 'welcome' });
  const [, setSingleSessionKey] = useState(0);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [paletteFilesLoading, setPaletteFilesLoading] = useState(false);
  const [paletteFilePaths, setPaletteFilePaths] = useState<string[]>([]);
  const workspaceActionsRef = useRef<{
    openFile: (path: string) => void;
  } | null>(null);

  const enterSingleMode = useCallback(
    (initialDocument?: { path: string; content: string } | null) => {
      if (initialDocument?.path) {
        addRecentPath(initialDocument.path, 'file');
      }

      setSingleSessionKey((current) => {
        const nextKey = current + 1;
        setMode({
          kind: 'single',
          sessionKey: nextKey,
          initialDocument: initialDocument ?? null,
        });
        return nextKey;
      });
    },
    [],
  );

  const openFolder = useCallback((rootPath: string) => {
    addRecentPath(rootPath, 'folder');
    setMode({ kind: 'folder', rootPath });
  }, []);

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

  const handleOpenRecentFile = async (path: string) => {
    try {
      const file = await window.electronAPI.readFolderFile(path);
      enterSingleMode({ path: file.path, content: file.content });
    } catch {
      // File may have been moved or deleted.
    }
  };

  const handleOpenRecentFolder = (path: string) => {
    openFolder(path);
  };

  const paletteItems = useMemo(() => {
    if (mode.kind !== 'folder') {
      return COMMAND_ITEMS;
    }

    return [...COMMAND_ITEMS, ...buildFileItems(paletteFilePaths)];
  }, [mode.kind, paletteFilePaths]);

  const handlePaletteSelect = useCallback(
    (item: CommandPaletteItem) => {
      setCommandPaletteOpen(false);

      if (item.kind === 'command') {
        if (item.id === 'open-folder') {
          void handleOpenFolder();
        } else {
          void handleOpenExisting();
        }
        return;
      }

      workspaceActionsRef.current?.openFile(item.path);
    },
    [handleOpenExisting, handleOpenFolder],
  );

  useEffect(() => {
    if (!commandPaletteOpen || mode.kind !== 'folder') {
      return;
    }

    let cancelled = false;
    setPaletteFilesLoading(true);

    void window.electronAPI
      .readFolderTree(mode.rootPath)
      .then((tree) => {
        if (cancelled) {
          return;
        }
        setPaletteFilePaths(collectMarkdownFiles(tree));
      })
      .finally(() => {
        if (!cancelled) {
          setPaletteFilesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [commandPaletteOpen, mode]);

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
  }, [enterSingleMode, mode.kind, openFolder]);

  const handleWelcomeMenuAction = useCallback(
    (action: (typeof WELCOME_MENU_ACTIONS)[number]) => {
      if (action === 'command-palette') {
        setCommandPaletteOpen(true);
        return;
      }

      if (mode.kind !== 'welcome') {
        return;
      }

      if (action === 'close') {
        window.electronAPI.requestClose();
      }
    },
    [mode.kind],
  );

  useMenuActions([...WELCOME_MENU_ACTIONS], handleWelcomeMenuAction);

  let content: ReactNode;

  if (mode.kind === 'welcome') {
    content = (
      <WelcomeScreen
        onCreateNew={handleCreateNew}
        onOpenExisting={() => void handleOpenExisting()}
        onOpenFolder={() => void handleOpenFolder()}
        onOpenRecentFile={(path) => void handleOpenRecentFile(path)}
        onOpenRecentFolder={handleOpenRecentFolder}
      />
    );
  } else if (mode.kind === 'folder') {
    content = (
      <WorkspaceView
        rootPath={mode.rootPath}
        onRegisterActions={(actions) => {
          workspaceActionsRef.current = actions;
        }}
      />
    );
  } else {
    content = (
      <SingleDocumentView
        key={mode.sessionKey}
        initialDocument={mode.initialDocument}
      />
    );
  }

  return (
    <>
      {content}
      {commandPaletteOpen && (
        <CommandPalette
          allItems={paletteItems}
          isLoading={mode.kind === 'folder' && paletteFilesLoading}
          onSelect={handlePaletteSelect}
          onClose={() => setCommandPaletteOpen(false)}
        />
      )}
    </>
  );
}
