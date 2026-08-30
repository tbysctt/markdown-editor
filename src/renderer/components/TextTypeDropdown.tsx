import type { Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';
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

const menuItemClass =
  'flex w-full cursor-pointer items-center gap-2 rounded border-none bg-transparent px-2.5 py-1.5 text-left text-[0.8125rem] text-[#44546f] hover:bg-[#f0f2f5] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600';

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
    <div className="relative mr-0.5" ref={containerRef}>
      <button
        type="button"
        className="inline-flex h-8 min-w-[7.5rem] cursor-pointer items-center gap-1.5 rounded border-none bg-transparent px-2 pl-2.5 text-[0.8125rem] font-medium text-[#44546f] hover:bg-[#f0f2f5] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
        onClick={() => setOpen((current) => !current)}
        title="Text style"
        aria-label="Text style"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex-1 truncate text-left">{activeLabel}</span>
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[11.25rem] rounded-md border border-[#dfe1e6] bg-white p-1 shadow-lg"
          role="menu"
        >
          {TEXT_TYPE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              className={cn(
                menuItemClass,
                activeTextType === value && 'bg-blue-100 text-blue-700',
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
