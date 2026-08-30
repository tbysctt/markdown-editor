import type { FormEvent } from 'react';
import { FormDialog } from './FormDialog';
import { dialogLabelClass, dialogTextareaClass } from '../styles/ui';

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
    <FormDialog
      title="Edit equation"
      titleId="math-dialog-title"
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <label htmlFor="math-latex" className={dialogLabelClass}>
        LaTeX
      </label>
      <textarea
        id="math-latex"
        name="latex"
        className={dialogTextareaClass}
        defaultValue={initialLatex}
        placeholder="E = mc^2"
        rows={4}
        autoFocus
        required
      />
    </FormDialog>
  );
}
