import type { Editor } from '@tiptap/react';

const PRINT_STYLES = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1a1a1a;
    line-height: 1.6;
    font-size: 12pt;
    margin: 0;
    padding: 2cm;
  }
  h1 { font-size: 24pt; font-weight: 700; margin: 1.5rem 0 0.75rem; }
  h2 { font-size: 18pt; font-weight: 600; margin: 1.25rem 0 0.625rem; }
  h3 { font-size: 14pt; font-weight: 600; margin: 1rem 0 0.5rem; }
  h4 { font-size: 12pt; font-weight: 600; margin: 0.875rem 0 0.5rem; }
  h5 { font-size: 11pt; font-weight: 600; margin: 0.75rem 0 0.5rem; }
  p { margin: 0 0 0.75rem; }
  ul, ol { margin: 0 0 0.75rem; padding-left: 1.5rem; }
  li { margin-bottom: 0.25rem; }
  ul[data-type="taskList"] { list-style: none; padding-left: 0; }
  ul[data-type="taskList"] li { display: flex; gap: 0.5rem; }
  blockquote {
    margin: 0 0 0.75rem;
    padding: 0.5rem 1rem;
    border-left: 4px solid #d1d5db;
    color: #4b5563;
    background: #f9fafb;
  }
  a { color: #2563eb; text-decoration: underline; }
  img { max-width: 100%; height: auto; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 0.75rem; }
  th, td { border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 600; text-align: left; }
  pre {
    margin: 0 0 0.75rem;
    padding: 0.75rem 1rem;
    background: #f6f8fa;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    overflow-x: auto;
    font-family: ui-monospace, Menlo, Monaco, Consolas, monospace;
    font-size: 10pt;
    line-height: 1.5;
    white-space: pre-wrap;
  }
  pre code { background: none; padding: 0; }
  code {
    font-family: ui-monospace, Menlo, Monaco, Consolas, monospace;
    font-size: 0.9em;
    background: #f3f4f6;
    padding: 0.1rem 0.2rem;
    border-radius: 3px;
  }
  .tiptap-mathematics-render[data-type="block-math"] {
    display: block;
    margin: 0 0 0.75rem;
    text-align: center;
  }
`;

export function getPrintableHtml(editor: Editor): string {
  const content = editor.getHTML();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.18.4/dist/katex.min.css" />
  <style>${PRINT_STYLES}</style>
</head>
<body>${content}</body>
</html>`;
}
