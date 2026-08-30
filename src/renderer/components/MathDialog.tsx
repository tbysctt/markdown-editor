import type { FormEvent } from 'react';

interface MathDialogProps {
  initialLatex?: string;
  onConfirm: (latex: string) => void;
  onCancel: () => void;
}

export function MathDialog({
  initialLatex = '',
  onConfirm,
  onCancel,
}: MathDialogProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const latex = String(formData.get('latex') ?? '').trim();
    if (latex) {
      onConfirm(latex);
    }
  };

  return (
    <div className="dialog-overlay" role="presentation">
      <div className="dialog" role="dialog" aria-labelledby="math-dialog-title">
        <h2 id="math-dialog-title">Edit equation</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="math-latex">LaTeX</label>
          <textarea
            id="math-latex"
            name="latex"
            defaultValue={initialLatex}
            placeholder="E = mc^2"
            rows={4}
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
