import type { Editor } from '@tiptap/react';
// eslint-disable-next-line import/no-unresolved
import editorProsePrintCss from '../editor/editor-prose-print.css?inline';

export function getPrintableHtml(editor: Editor): string {
  const content = editor.getHTML();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.18.4/dist/katex.min.css" />
  <style>${editorProsePrintCss}</style>
</head>
<body>${content}</body>
</html>`;
}
