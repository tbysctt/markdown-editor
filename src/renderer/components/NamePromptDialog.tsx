import { useEffect, useRef, type FormEvent } from 'react';

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
    <div className="dialog-overlay" role="presentation">
      <div className="dialog" role="dialog" aria-labelledby="name-prompt-title">
        <h2 id="name-prompt-title">{title}</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="name-prompt-input">{label}</label>
          <input
            ref={inputRef}
            id="name-prompt-input"
            name="name"
            type="text"
            defaultValue={defaultValue}
            autoFocus
            required
          />
          <div className="dialog-actions">
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary">
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
