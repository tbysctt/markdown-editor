import type { FormEvent, ReactNode } from 'react';
import {
  dialogActionsClass,
  dialogCancelBtnClass,
  dialogOverlayClass,
  dialogPanelClass,
  dialogPrimaryBtnClass,
  dialogTitleClass,
} from '../styles/ui';

interface FormDialogProps {
  title: string;
  titleId: string;
  submitLabel?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  children: ReactNode;
}

export function FormDialog({
  title,
  titleId,
  submitLabel = 'Apply',
  onSubmit,
  onCancel,
  children,
}: FormDialogProps) {
  return (
    <div className={dialogOverlayClass} role="presentation">
      <div className={dialogPanelClass} role="dialog" aria-labelledby={titleId}>
        <h2 id={titleId} className={dialogTitleClass}>
          {title}
        </h2>
        <form onSubmit={onSubmit}>
          {children}
          <div className={dialogActionsClass}>
            <button type="button" className={dialogCancelBtnClass} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={dialogPrimaryBtnClass}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
