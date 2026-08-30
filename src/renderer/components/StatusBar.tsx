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
    <footer
      className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 py-1.5 text-xs text-gray-500"
      aria-live="polite"
    >
      <span>
        {stats.words} {stats.words === 1 ? 'word' : 'words'} · {stats.characters}{' '}
        {stats.characters === 1 ? 'character' : 'characters'}
      </span>
      <span className="inline-flex items-center gap-1.5" title="Zoom level">
        <ZoomIcon className="h-3.5 w-3.5" />
        <span>{zoom}%</span>
      </span>
    </footer>
  );
}
