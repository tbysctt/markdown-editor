import type { Editor } from '@tiptap/react';
import katex from 'katex';
import designTokensCss from '../styles/tokens.css?inline';
import editorProsePrintCss from '../editor/editor-prose-print.css?inline';

function renderMathNodes(html: string): string {
  const doc = new DOMParser().parseFromString(
    `<div id="print-root">${html}</div>`,
    'text/html',
  );
  const container = doc.getElementById('print-root');
  if (!container) {
    return html;
  }

  container
    .querySelectorAll('[data-type="block-math"]')
    .forEach((element) => {
      const latex = element.getAttribute('data-latex') ?? '';
      try {
        katex.render(latex, element as HTMLElement, {
          throwOnError: false,
          displayMode: true,
        });
      } catch {
        element.textContent = latex;
      }
    });

  container
    .querySelectorAll('[data-type="inline-math"]')
    .forEach((element) => {
      const latex = element.getAttribute('data-latex') ?? '';
      try {
        katex.render(latex, element as HTMLElement, {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        element.textContent = latex;
      }
    });

  return container.innerHTML;
}

export function getPrintableHtml(editor: Editor): string {
  const content = renderMathNodes(editor.getHTML());
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.18.4/dist/katex.min.css" />
  <style>${designTokensCss}${editorProsePrintCss}</style>
</head>
<body><div class="editor-content">${content}</div></body>
</html>`;
}
