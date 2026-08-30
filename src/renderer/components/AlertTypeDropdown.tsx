import type { Editor } from '@tiptap/react';
import type { AlertType } from '../extensions/alertExtension';
import { useDropdownMenu } from '../hooks/useDropdownMenu';
import {
  dropdownMenuItemActiveClass,
  dropdownMenuItemClass,
  dropdownMenuPanelClass,
  splitBtnMainClass,
  splitBtnToggleClass,
  splitBtnWrapperClass,
  toolbarIconBtnActiveClass,
} from '../styles/ui';
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
  const { open, toggle, close, containerRef } = useDropdownMenu({ editor });

  const activeAlertType = getActiveAlertType(editor);
  const MainIcon = activeAlertType ? (
    <AlertTypeIcon type={activeAlertType} className="h-4 w-4" />
  ) : (
    <NoteAlertIcon className="h-4 w-4" />
  );

  const handleMainClick = () => {
    insertAlert(editor, 'note');
  };

  const handleSelect = (type: AlertType) => {
    insertAlert(editor, type);
    close();
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className={splitBtnWrapperClass}>
        <button
          type="button"
          className={cn(
            splitBtnMainClass,
            activeAlertType && toolbarIconBtnActiveClass,
          )}
          onClick={handleMainClick}
          title="Insert note"
          aria-label="Insert note"
        >
          {MainIcon}
        </button>
        <button
          type="button"
          className={splitBtnToggleClass}
          onClick={toggle}
          title="Alert options"
          aria-label="Alert options"
          aria-expanded={open}
        >
          <ChevronDownIcon className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className={dropdownMenuPanelClass} role="menu">
          {ALERT_OPTIONS.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              className={cn(
                dropdownMenuItemClass,
                activeAlertType === type && dropdownMenuItemActiveClass,
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
