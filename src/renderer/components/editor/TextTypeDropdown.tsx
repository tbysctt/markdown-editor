import type { Editor } from '@tiptap/react';
import { useDropdownMenu } from '../../hooks/useDropdownMenu';
import {
  dropdownMenuItemActiveClass,
  dropdownMenuItemClass,
  dropdownMenuPanelClass,
  dropdownTriggerClass,
} from '../../styles/ui';
import { cn } from '../../utils/cn';
import { ChevronDownIcon } from '../icons/ToolbarIcons';

type TextType =
  | 'body'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'heading-5'
  | 'heading-6';

interface TextTypeDropdownProps {
  editor: Editor;
}

const TEXT_TYPE_OPTIONS: Array<{ value: TextType; label: string }> = [
  { value: 'body', label: 'Paragraph' },
  { value: 'heading-1', label: 'Heading 1' },
  { value: 'heading-2', label: 'Heading 2' },
  { value: 'heading-3', label: 'Heading 3' },
  { value: 'heading-4', label: 'Heading 4' },
  { value: 'heading-5', label: 'Heading 5' },
  { value: 'heading-6', label: 'Heading 6' },
];

function getActiveTextType(editor: Editor): TextType {
  for (const level of [1, 2, 3, 4, 5, 6] as const) {
    if (editor.isActive('heading', { level })) {
      return `heading-${level}` as TextType;
    }
  }
  return 'body';
}

function applyTextType(editor: Editor, textType: TextType): void {
  if (textType === 'body') {
    editor.chain().focus().setParagraph().run();
    return;
  }

  const level = Number(textType.replace('heading-', '')) as
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6;
  editor.chain().focus().toggleHeading({ level }).run();
}

export function TextTypeDropdown({ editor }: TextTypeDropdownProps) {
  const { open, toggle, close, containerRef } = useDropdownMenu({ editor });

  const activeTextType = getActiveTextType(editor);
  const activeLabel =
    TEXT_TYPE_OPTIONS.find((option) => option.value === activeTextType)?.label ??
    'Paragraph';

  const handleSelect = (textType: TextType) => {
    applyTextType(editor, textType);
    close();
  };

  return (
    <div className="relative mr-0.5" ref={containerRef}>
      <button
        type="button"
        className={dropdownTriggerClass}
        onClick={toggle}
        title="Text style"
        aria-label="Text style"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex-1 truncate text-left">{activeLabel}</span>
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {open && (
        <div className={dropdownMenuPanelClass} role="menu">
          {TEXT_TYPE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              className={cn(
                dropdownMenuItemClass,
                activeTextType === value && dropdownMenuItemActiveClass,
              )}
              onClick={() => handleSelect(value)}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
