import type { FormEvent } from 'react';

const overlayClass =
  'fixed inset-0 z-[100] flex items-center justify-center bg-black/40';

const dialogClass = 'w-full max-w-[400px] rounded-xl bg-white p-6 shadow-2xl';

const textareaClass =
  'mb-4 min-h-24 w-full resize-y rounded-md border border-gray-300 px-3 py-2 font-inherit focus:border-blue-600 focus:outline-2 focus:outline-offset-1 focus:outline-blue-600';

const labelClass = 'mb-1 block text-sm text-gray-600';

const actionsClass = 'flex justify-end gap-2';

const cancelBtnClass =
  'cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2';

const primaryBtnClass =
  'cursor-pointer rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-white hover:bg-blue-700';

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
    <div className={overlayClass} role="presentation">
      <div className={dialogClass} role="dialog" aria-labelledby="math-dialog-title">
        <h2 id="math-dialog-title" className="mb-4 mt-0 text-lg">
          Edit equation
        </h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="math-latex" className={labelClass}>
            LaTeX
          </label>
          <textarea
            id="math-latex"
            name="latex"
            className={textareaClass}
            defaultValue={initialLatex}
            placeholder="E = mc^2"
            rows={4}
            autoFocus
            required
          />
          <div className={actionsClass}>
            <button type="button" className={cancelBtnClass} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={primaryBtnClass}>
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
