import { useEffect, useRef, type FormEvent } from 'react';

const overlayClass =
  'fixed inset-0 z-[100] flex items-center justify-center bg-black/40';

const dialogClass = 'w-full max-w-[400px] rounded-xl bg-white p-6 shadow-2xl';

const inputClass =
  'mb-4 w-full rounded-md border border-gray-300 px-3 py-2 font-inherit focus:border-blue-600 focus:outline-2 focus:outline-offset-1 focus:outline-blue-600';

const labelClass = 'mb-1 block text-sm text-gray-600';

const actionsClass = 'flex justify-end gap-2';

const cancelBtnClass =
  'cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2';

const primaryBtnClass =
  'cursor-pointer rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-white hover:bg-blue-700';

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
    <div className={overlayClass} role="presentation">
      <div className={dialogClass} role="dialog" aria-labelledby="name-prompt-title">
        <h2 id="name-prompt-title" className="mb-4 mt-0 text-lg">
          {title}
        </h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="name-prompt-input" className={labelClass}>
            {label}
          </label>
          <input
            ref={inputRef}
            id="name-prompt-input"
            name="name"
            type="text"
            className={inputClass}
            defaultValue={defaultValue}
            autoFocus
            required
          />
          <div className={actionsClass}>
            <button type="button" className={cancelBtnClass} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={primaryBtnClass}>
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
