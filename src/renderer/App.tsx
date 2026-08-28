import { useEffect, useState } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { EditorView } from './components/EditorView';

type AppView = 'welcome' | 'editor';

interface EditorSession {
  content: string;
  path: string | null;
}

export function App() {
  const [view, setView] = useState<AppView>('welcome');
  const [session, setSession] = useState<EditorSession>({
    content: '',
    path: null,
  });

  const openEditor = (content: string, path: string | null) => {
    setSession({ content, path });
    setView('editor');
  };

  const handleCreateNew = () => {
    openEditor('', null);
  };

  const handleOpenExisting = async () => {
    const result = await window.electronAPI.openFile();
    if (result) {
      openEditor(result.content, result.path);
    }
  };

  useEffect(() => {
    return window.electronAPI.onMenuAction((action) => {
      if (view !== 'welcome') {
        return;
      }

      if (action === 'new') {
        handleCreateNew();
      }

      if (action === 'open') {
        void handleOpenExisting();
      }
    });
  }, [view]);

  if (view === 'welcome') {
    return (
      <WelcomeScreen
        onCreateNew={handleCreateNew}
        onOpenExisting={() => void handleOpenExisting()}
      />
    );
  }

  return (
    <EditorView
      key={`${session.path ?? 'new'}-${session.content.length}`}
      initialContent={session.content}
      initialPath={session.path}
      onNavigateWelcome={() => setView('welcome')}
    />
  );
}
