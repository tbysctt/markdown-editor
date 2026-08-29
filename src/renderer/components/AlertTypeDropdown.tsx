import type { Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import type { AlertType } from '../extensions/alertExtension';
import { AlertTypeIcon, NoteAlertIcon } from './icons/AlertIcons';
import { ChevronDownIcon } from './icons/ToolbarIcons';

interface AlertTypeDropdownProps {
  editor: Editor;
}

const ALERT_OPTIONS: Array<{ type: AlertType; label: string }> = [
  { type: 'note', label: 'Note' },
  { type: 'tip', label: 'Tip' },
  { type: 'important', label: 'Important' },
  { type: 'warning', label: 'Warning' },
  { type: 'caution', label: 'Caution' },
];

function getActiveAlertType(editor: Editor): AlertType | null {
  if (!editor.isActive('alert')) {
    return null;
  }

  const attrs = editor.getAttributes('alert');
  const type = attrs.type as AlertType | undefined;
  return ALERT_OPTIONS.some((option) => option.type === type)
    ? (type as AlertType)
    : 'note';
}

function insertAlert(editor: Editor, type: AlertType): void {
  editor.chain().focus().insertAlert(type).run();
}

export function AlertTypeDropdown({ editor }: AlertTypeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [, setRevision] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeAlertType = getActiveAlertType(editor);
  const MainIcon = activeAlertType ? (
    <AlertTypeIcon type={activeAlertType} />
  ) : (
    <NoteAlertIcon />
  );

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
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

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleMainClick = () => {
    insertAlert(editor, 'note');
  };

  const handleSelect = (type: AlertType) => {
    insertAlert(editor, type);
    setOpen(false);
  };

  return (
    <div className="list-dropdown" ref={containerRef}>
      <div className="list-dropdown-control">
        <button
          type="button"
          className={`list-dropdown-main${activeAlertType ? ' active' : ''}`}
          onClick={handleMainClick}
          title="Insert note"
          aria-label="Insert note"
        >
          {MainIcon}
        </button>
        <button
          type="button"
          className="list-dropdown-toggle"
          onClick={() => setOpen((current) => !current)}
          title="Alert options"
          aria-label="Alert options"
          aria-expanded={open}
        >
          <ChevronDownIcon />
        </button>
      </div>

      {open && (
        <div className="list-dropdown-menu" role="menu">
          {ALERT_OPTIONS.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              className={`list-dropdown-item${
                activeAlertType === type ? ' active' : ''
              }`}
              onClick={() => handleSelect(type)}
            >
              <AlertTypeIcon type={type} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
