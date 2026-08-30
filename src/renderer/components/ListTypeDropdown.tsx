import type { Editor } from '@tiptap/react';
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
  const { open, toggle, close, containerRef } = useDropdownMenu({ editor });

  const activeListType = getActiveListType(editor);
  const displayType = activeListType ?? 'bullet';
  const DisplayIcon =
    LIST_OPTIONS.find((option) => option.type === displayType)?.Icon ??
    BulletListIcon;

  const handleMainClick = () => {
    if (activeListType) {
      toggleOffList(editor);
      return;
    }

    applyListType(editor, 'bullet');
  };

  const handleSelect = (type: ListType) => {
    applyListType(editor, type);
    close();
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className={splitBtnWrapperClass}>
        <button
          type="button"
          className={cn(
            splitBtnMainClass,
            activeListType && toolbarIconBtnActiveClass,
          )}
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
          className={splitBtnToggleClass}
          onClick={toggle}
          title="List options"
          aria-label="List options"
          aria-expanded={open}
        >
          <ChevronDownIcon className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className={dropdownMenuPanelClass} role="menu">
          {LIST_OPTIONS.map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              className={cn(
                dropdownMenuItemClass,
                activeListType === type && dropdownMenuItemActiveClass,
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
