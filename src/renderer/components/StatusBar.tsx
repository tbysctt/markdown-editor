import type { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { ZoomIcon } from './icons/ToolbarIcons';

interface StatusBarProps {
  editor: Editor;
  zoom: number;
}

export function StatusBar({ editor, zoom }: StatusBarProps) {
  const [stats, setStats] = useState({ words: 0, characters: 0 });

  useEffect(() => {
    const update = () => {
      setStats({
        words: editor.storage.characterCount.words(),
        characters: editor.storage.characterCount.characters(),
      });
    };

    update();
    editor.on('update', update);
    editor.on('selectionUpdate', update);

    return () => {
      editor.off('update', update);
      editor.off('selectionUpdate', update);
    };
  }, [editor]);

  return (
    <footer className="status-bar" aria-live="polite">
      <span className="status-bar-stats">
        {stats.words} {stats.words === 1 ? 'word' : 'words'} · {stats.characters}{' '}
        {stats.characters === 1 ? 'character' : 'characters'}
      </span>
      <span className="status-bar-zoom" title="Zoom level">
        <ZoomIcon />
        <span>{zoom}%</span>
      </span>
    </footer>
  );
}
