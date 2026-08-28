import type { ReactNode } from 'react';

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
      className={`toolbar-icon-button${active ? ' active' : ''}`}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}
