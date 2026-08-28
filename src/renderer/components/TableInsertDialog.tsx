import type { FormEvent } from 'react';

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
    <div className="dialog-overlay" role="presentation">
      <div className="dialog" role="dialog" aria-labelledby="table-dialog-title">
        <h2 id="table-dialog-title">Insert table</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="table-rows">Rows</label>
          <input
            id="table-rows"
            name="rows"
            type="number"
            min={1}
            max={20}
            defaultValue={3}
            required
          />
          <label htmlFor="table-cols">Columns</label>
          <input
            id="table-cols"
            name="cols"
            type="number"
            min={1}
            max={10}
            defaultValue={3}
            required
          />
          <div className="dialog-actions">
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Insert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
