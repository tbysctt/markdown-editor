import type { Editor } from '@tiptap/react';
import { DEFAULT_MATH_LATEX } from '../extensions/mathExtension';

export function toggleBold(editor: Editor): void {
  editor.chain().focus().toggleBold().run();
}

export function toggleItalic(editor: Editor): void {
  editor.chain().focus().toggleItalic().run();
}

export function toggleStrike(editor: Editor): void {
  editor.chain().focus().toggleStrike().run();
}

export function toggleBlockquote(editor: Editor): void {
  editor.chain().focus().toggleBlockquote().run();
}

export function toggleBulletList(editor: Editor): void {
  editor.chain().focus().toggleBulletList().run();
}

export function toggleOrderedList(editor: Editor): void {
  editor.chain().focus().toggleOrderedList().run();
}

export function toggleTaskList(editor: Editor): void {
  editor.chain().focus().toggleTaskList().run();
}

export function setParagraph(editor: Editor): void {
  editor.chain().focus().setParagraph().run();
}

export function toggleHeading(editor: Editor, level: 1 | 2 | 3 | 4 | 5 | 6): void {
  editor.chain().focus().toggleHeading({ level }).run();
}

export function insertCodeBlock(editor: Editor): void {
  editor.chain().focus().setCodeBlock().run();
}

export function insertBlockMath(editor: Editor): void {
  editor.chain().focus().insertBlockMath({ latex: DEFAULT_MATH_LATEX }).run();
}

export function insertTable(
  editor: Editor,
  rows: number,
  cols: number,
): void {
  editor
    .chain()
    .focus()
    .insertTable({ rows, cols, withHeaderRow: true })
    .run();
}

export function applyLink(editor: Editor, url: string): void {
  if (url === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  } else {
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }
}
