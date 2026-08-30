import type { FormEvent } from 'react';
import { FormDialog } from './FormDialog';
import { dialogInputClass, dialogLabelClass } from '../styles/ui';

interface TableInsertDialogProps {
  onConfirm: (rows: number, cols: number) => void;
  onCancel: () => void;
}

export function TableInsertDialog({
  onConfirm,
  onCancel,
}: TableInsertDialogProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rows = Number(formData.get('rows') ?? 3);
    const cols = Number(formData.get('cols') ?? 3);
    onConfirm(Math.max(1, rows), Math.max(1, cols));
  };

  return (
    <FormDialog
      title="Insert table"
      titleId="table-dialog-title"
      submitLabel="Insert"
      onSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <label htmlFor="table-rows" className={dialogLabelClass}>
        Rows
      </label>
      <input
        id="table-rows"
        name="rows"
        type="number"
        className={dialogInputClass}
        min={1}
        max={20}
        defaultValue={3}
        required
      />
      <label htmlFor="table-cols" className={dialogLabelClass}>
        Columns
      </label>
      <input
        id="table-cols"
        name="cols"
        type="number"
        className={dialogInputClass}
        min={1}
        max={10}
        defaultValue={3}
        required
      />
    </FormDialog>
  );
}
