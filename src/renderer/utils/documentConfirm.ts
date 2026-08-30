export async function confirmDiscardIfDirty(
  dirty: boolean,
): Promise<'proceed' | 'cancel' | 'save'> {
  if (!dirty) {
    return 'proceed';
  }

  const choice = await window.electronAPI.confirmDiscardChanges();

  if (choice === 'cancel') {
    return 'cancel';
  }

  if (choice === 'discard') {
    return 'proceed';
  }

  return 'save';
}
