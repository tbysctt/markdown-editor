import type { Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from './icons/ToolbarIcons';

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
  const [open, setOpen] = useState(false);
  const [, setRevision] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTextType = getActiveTextType(editor);
  const activeLabel =
    TEXT_TYPE_OPTIONS.find((option) => option.value === activeTextType)?.label ??
    'Paragraph';

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

  const handleSelect = (textType: TextType) => {
    applyTextType(editor, textType);
    setOpen(false);
  };

  return (
    <div className="toolbar-dropdown toolbar-text-type" ref={containerRef}>
      <button
        type="button"
        className="toolbar-text-type-button"
        onClick={() => setOpen((current) => !current)}
        title="Text style"
        aria-label="Text style"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="toolbar-text-type-label">{activeLabel}</span>
        <ChevronDownIcon />
      </button>

      {open && (
        <div className="toolbar-dropdown-menu" role="menu">
          {TEXT_TYPE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              className={`toolbar-dropdown-item${
                activeTextType === value ? ' active' : ''
              }`}
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
