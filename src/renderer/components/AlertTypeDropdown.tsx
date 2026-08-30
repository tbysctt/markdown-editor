import type { Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import type { AlertType } from '../extensions/alertExtension';
import { cn } from '../utils/cn';
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

const splitMainClass =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-l border-none bg-transparent p-0 text-[#44546f] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 [&_svg]:h-4 [&_svg]:w-4';

const splitToggleClass =
  'inline-flex h-8 w-5 cursor-pointer items-center justify-center rounded-r border-l border-[#dfe1e6] bg-transparent p-0 text-[#44546f] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 [&_svg]:h-4 [&_svg]:w-4';

const menuItemClass =
  'flex w-full cursor-pointer items-center gap-2 rounded border-none bg-transparent px-2.5 py-1.5 text-left text-[0.8125rem] text-[#44546f] hover:bg-[#f0f2f5] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600';

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
    <AlertTypeIcon type={activeAlertType} className="h-4 w-4" />
  ) : (
    <NoteAlertIcon className="h-4 w-4" />
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
    <div className="relative" ref={containerRef}>
      <div className="flex items-stretch rounded hover:bg-[#f0f2f5]">
        <button
          type="button"
          className={cn(splitMainClass, activeAlertType && 'bg-blue-100 text-blue-700')}
          onClick={handleMainClick}
          title="Insert note"
          aria-label="Insert note"
        >
          {MainIcon}
        </button>
        <button
          type="button"
          className={splitToggleClass}
          onClick={() => setOpen((current) => !current)}
          title="Alert options"
          aria-label="Alert options"
          aria-expanded={open}
        >
          <ChevronDownIcon className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[11.25rem] rounded-md border border-[#dfe1e6] bg-white p-1 shadow-lg"
          role="menu"
        >
          {ALERT_OPTIONS.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              className={cn(
                menuItemClass,
                activeAlertType === type && 'bg-blue-100 text-blue-700',
              )}
              onClick={() => handleSelect(type)}
            >
              <AlertTypeIcon type={type} className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
