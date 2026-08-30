import { useEffect, useRef, type FormEvent } from 'react';
import { FormDialog } from './FormDialog';
import { dialogInputClass, dialogLabelClass } from '../styles/ui';

interface NamePromptDialogProps {
  title: string;
  label: string;
  defaultValue: string;
  confirmLabel: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function NamePromptDialog({
  title,
  label,
  defaultValue,
  confirmLabel,
  onConfirm,
  onCancel,
}: NamePromptDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    if (name) {
      onConfirm(name);
    }
  };

  return (
    <FormDialog
      title={title}
      titleId="name-prompt-title"
      submitLabel={confirmLabel}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <label htmlFor="name-prompt-input" className={dialogLabelClass}>
        {label}
      </label>
      <input
        ref={inputRef}
        id="name-prompt-input"
        name="name"
        type="text"
        className={dialogInputClass}
        defaultValue={defaultValue}
        autoFocus
        required
      />
    </FormDialog>
  );
}
