import type { FormEvent } from 'react';

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
    <div className={overlayClass} role="presentation">
      <div className={dialogClass} role="dialog" aria-labelledby="table-dialog-title">
        <h2 id="table-dialog-title" className="mb-4 mt-0 text-lg">
          Insert table
        </h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="table-rows" className={labelClass}>
            Rows
          </label>
          <input
            id="table-rows"
            name="rows"
            type="number"
            className={inputClass}
            min={1}
            max={20}
            defaultValue={3}
            required
          />
          <label htmlFor="table-cols" className={labelClass}>
            Columns
          </label>
          <input
            id="table-cols"
            name="cols"
            type="number"
            className={inputClass}
            min={1}
            max={10}
            defaultValue={3}
            required
          />
          <div className={actionsClass}>
            <button type="button" className={cancelBtnClass} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={primaryBtnClass}>
              Insert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
