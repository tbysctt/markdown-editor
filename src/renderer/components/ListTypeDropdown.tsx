import type { Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';
import {
  BulletListIcon,
  ChevronDownIcon,
  OrderedListIcon,
  TaskListIcon,
} from './icons/ToolbarIcons';

type ListType = 'bullet' | 'ordered' | 'task';

interface ListTypeDropdownProps {
  editor: Editor;
}

const LIST_OPTIONS: Array<{
  type: ListType;
  label: string;
  Icon: typeof BulletListIcon;
}> = [
  { type: 'bullet', label: 'Bulleted list', Icon: BulletListIcon },
  { type: 'ordered', label: 'Numbered list', Icon: OrderedListIcon },
  { type: 'task', label: 'Task list', Icon: TaskListIcon },
];

const splitMainClass =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-l border-none bg-transparent p-0 text-[#44546f] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 [&_svg]:h-4 [&_svg]:w-4';

const splitToggleClass =
  'inline-flex h-8 w-5 cursor-pointer items-center justify-center rounded-r border-l border-[#dfe1e6] bg-transparent p-0 text-[#44546f] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 [&_svg]:h-4 [&_svg]:w-4';

const menuItemClass =
  'flex w-full cursor-pointer items-center gap-2 rounded border-none bg-transparent px-2.5 py-1.5 text-left text-[0.8125rem] text-[#44546f] hover:bg-[#f0f2f5] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600';

function getActiveListType(editor: Editor): ListType | null {
  if (editor.isActive('taskList')) {
    return 'task';
  }
  if (editor.isActive('orderedList')) {
    return 'ordered';
  }
  if (editor.isActive('bulletList')) {
    return 'bullet';
  }
  return null;
}

function applyListType(editor: Editor, target: ListType): void {
  const active = getActiveListType(editor);
  const chain = editor.chain().focus();

  if (!active) {
    switch (target) {
      case 'bullet':
        chain.toggleBulletList().run();
        break;
      case 'ordered':
        chain.toggleOrderedList().run();
        break;
      case 'task':
        chain.toggleTaskList().run();
        break;
      default:
        break;
    }
    return;
  }

  if (active === target) {
    return;
  }

  switch (active) {
    case 'bullet':
      chain.toggleBulletList();
      break;
    case 'ordered':
      chain.toggleOrderedList();
      break;
    case 'task':
      chain.toggleTaskList();
      break;
    default:
      break;
  }

  switch (target) {
    case 'bullet':
      chain.toggleBulletList();
      break;
    case 'ordered':
      chain.toggleOrderedList();
      break;
    case 'task':
      chain.toggleTaskList();
      break;
    default:
      break;
  }

  chain.run();
}

function toggleOffList(editor: Editor): void {
  const active = getActiveListType(editor);
  if (!active) {
    return;
  }

  const chain = editor.chain().focus();
  switch (active) {
    case 'bullet':
      chain.toggleBulletList().run();
      break;
    case 'ordered':
      chain.toggleOrderedList().run();
      break;
    case 'task':
      chain.toggleTaskList().run();
      break;
    default:
      break;
  }
}

export function ListTypeDropdown({ editor }: ListTypeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [, setRevision] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeListType = getActiveListType(editor);
  const displayType = activeListType ?? 'bullet';
  const DisplayIcon =
    LIST_OPTIONS.find((option) => option.type === displayType)?.Icon ??
    BulletListIcon;

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
    if (activeListType) {
      toggleOffList(editor);
      return;
    }

    applyListType(editor, 'bullet');
  };

  const handleSelect = (type: ListType) => {
    applyListType(editor, type);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-stretch rounded hover:bg-[#f0f2f5]">
        <button
          type="button"
          className={cn(splitMainClass, activeListType && 'bg-blue-100 text-blue-700')}
          onClick={handleMainClick}
          title={
            activeListType
              ? 'Remove list formatting'
              : 'Bulleted list'
          }
          aria-label={
            activeListType
              ? 'Remove list formatting'
              : 'Bulleted list'
          }
        >
          <DisplayIcon />
        </button>
        <button
          type="button"
          className={splitToggleClass}
          onClick={() => setOpen((current) => !current)}
          title="List options"
          aria-label="List options"
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
          {LIST_OPTIONS.map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              className={cn(
                menuItemClass,
                activeListType === type && 'bg-blue-100 text-blue-700',
              )}
              onClick={() => handleSelect(type)}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
