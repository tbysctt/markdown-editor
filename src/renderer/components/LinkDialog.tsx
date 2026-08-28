import type { FormEvent } from 'react';

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
    <div className="dialog-overlay" role="presentation">
      <div className="dialog" role="dialog" aria-labelledby="link-dialog-title">
        <h2 id="link-dialog-title">Insert link</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="link-url">URL</label>
          <input
            id="link-url"
            name="url"
            type="url"
            defaultValue={initialUrl}
            placeholder="https://example.com"
            autoFocus
            required
          />
          <div className="dialog-actions">
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
