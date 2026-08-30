import { useEffect, useRef } from 'react';
import { cn } from '../utils/cn';
import { Z_CONTEXT_MENU } from '../styles/ui';

export interface ContextMenuItem {
  id: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed min-w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg',
        Z_CONTEXT_MENU,
      )}
      style={{ top: y, left: x }}
      role="menu"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className={cn(
            'block w-full cursor-pointer border-none bg-transparent px-3 py-1.5 text-left text-[0.8125rem] text-gray-700 hover:bg-gray-100',
            item.danger && 'text-red-600 hover:bg-red-50',
            item.disabled && 'cursor-default text-gray-400 hover:bg-transparent',
          )}
          disabled={item.disabled}
          onClick={() => {
            if (item.disabled) {
              return;
            }
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
