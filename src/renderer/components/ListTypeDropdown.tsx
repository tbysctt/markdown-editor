import type { Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
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
    <div className="toolbar-dropdown list-dropdown" ref={containerRef}>
      <div className="toolbar-split-control list-dropdown-control">
        <button
          type="button"
          className={`toolbar-split-main list-dropdown-main${
            activeListType ? ' active' : ''
          }`}
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
          className="toolbar-split-toggle list-dropdown-toggle"
          onClick={() => setOpen((current) => !current)}
          title="List options"
          aria-label="List options"
          aria-expanded={open}
        >
          <ChevronDownIcon />
        </button>
      </div>

      {open && (
        <div className="toolbar-dropdown-menu list-dropdown-menu" role="menu">
          {LIST_OPTIONS.map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              className={`toolbar-dropdown-item list-dropdown-item${
                activeListType === type ? ' active' : ''
              }`}
              onClick={() => handleSelect(type)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
