import type { ReactNode } from 'react';
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
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded border-none bg-transparent text-[#44546f] hover:bg-[#f0f2f5] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 [&_svg]:h-4 [&_svg]:w-4',
        active && 'bg-blue-100 text-blue-700',
      )}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}
