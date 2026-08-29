import type { FormEvent } from 'react';

interface ImagePathDialogProps {
  initialPath?: string;
  onConfirm: (path: string) => void;
  onCancel: () => void;
}

export function ImagePathDialog({
  initialPath = '',
  onConfirm,
  onCancel,
}: ImagePathDialogProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const imagePath = String(formData.get('path') ?? '').trim();
    if (imagePath) {
      onConfirm(imagePath);
    }
  };

  return (
    <div className="dialog-overlay" role="presentation">
      <div className="dialog" role="dialog" aria-labelledby="image-path-dialog-title">
        <h2 id="image-path-dialog-title">Edit image path</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="image-path">Path</label>
          <input
            id="image-path"
            name="path"
            type="text"
            defaultValue={initialPath}
            placeholder="assets/example.png"
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
