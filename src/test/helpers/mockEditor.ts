import { vi } from 'vitest';
import type { Editor } from '@tiptap/core';

export function createMockEditor(): Editor {
  const run = vi.fn();
  const chain = {
    focus: vi.fn().mockReturnThis(),
    insertContentAt: vi.fn().mockReturnThis(),
    setImage: vi.fn().mockReturnThis(),
    run,
  };

  return {
    chain: vi.fn(() => chain),
  } as unknown as Editor;
}

export function getMockEditorChain(editor: Editor) {
  return (editor.chain as ReturnType<typeof vi.fn>).mock.results[0]?.value as {
    focus: ReturnType<typeof vi.fn>;
    insertContentAt: ReturnType<typeof vi.fn>;
    setImage: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
  };
}
