import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface UseDropdownMenuOptions {
  editor?: Editor | null;
}

export function useDropdownMenu({ editor }: UseDropdownMenuOptions = {}) {
  const [open, setOpen] = useState(false);
  const [, setRevision] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const refresh = () => {
      setRevision((current) => current + 1);
    };

    editor.on('selectionUpdate', refresh);
    editor.on('transaction', refresh);
    return () => {
      editor.off('selectionUpdate', refresh);
      editor.off('transaction', refresh);
    };
  }, [editor]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [open]);

  const toggle = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    open,
    setOpen,
    toggle,
    close,
    containerRef,
  };
}
