import { Editor } from '@tiptap/core';
import { createEditorExtensions } from '../../editor/editorExtensions';

export function createTestEditor(markdown: string, editable = false): Editor {
  return new Editor({
    extensions: createEditorExtensions(),
    content: markdown,
    contentType: 'markdown',
    editable,
  });
}

export function loadMarkdown(editor: Editor, markdown: string): void {
  editor.commands.setContent(markdown, { contentType: 'markdown' });
}

export function destroyEditor(editor: Editor | undefined): void {
  editor?.destroy();
}
