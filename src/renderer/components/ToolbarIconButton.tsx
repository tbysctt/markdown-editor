import type { ReactNode } from 'react';
import {
  toolbarIconBtnActiveClass,
  toolbarIconBtnClass,
} from '../styles/ui';
import { cn } from '../utils/cn';

interface ToolbarIconButtonProps {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}

export function ToolbarIconButton({
  title,
  onClick,
  active = false,
  children,
}: ToolbarIconButtonProps) {
  return (
    <button
      type="button"
      className={cn(toolbarIconBtnClass, active && toolbarIconBtnActiveClass)}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}
