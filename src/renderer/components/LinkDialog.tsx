import type { FormEvent } from 'react';
import { FormDialog } from './FormDialog';
import { dialogInputClass, dialogLabelClass } from '../styles/ui';

interface LinkDialogProps {
  initialUrl?: string;
  onConfirm: (url: string) => void;
  onCancel: () => void;
}

export function LinkDialog({
  initialUrl = '',
  onConfirm,
  onCancel,
}: LinkDialogProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const url = String(formData.get('url') ?? '').trim();
    if (url) {
      onConfirm(url);
    }
  };

  return (
    <FormDialog
      title="Insert link"
      titleId="link-dialog-title"
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <label htmlFor="link-url" className={dialogLabelClass}>
        URL
      </label>
      <input
        id="link-url"
        name="url"
        type="url"
        className={dialogInputClass}
        defaultValue={initialUrl}
        placeholder="https://example.com"
        autoFocus
        required
      />
    </FormDialog>
  );
}
