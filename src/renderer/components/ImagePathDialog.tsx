import type { FormEvent } from 'react';
import { FormDialog } from './FormDialog';
import { dialogInputClass, dialogLabelClass } from '../styles/ui';

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
    <FormDialog
      title="Edit image path"
      titleId="image-path-dialog-title"
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <label htmlFor="image-path" className={dialogLabelClass}>
        Path
      </label>
      <input
        id="image-path"
        name="path"
        type="text"
        className={dialogInputClass}
        defaultValue={initialPath}
        placeholder="assets/example.png"
        autoFocus
        required
      />
    </FormDialog>
  );
}
