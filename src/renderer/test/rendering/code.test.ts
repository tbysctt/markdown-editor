import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import { CODE } from '../fixtures/rendering';
import {
  createTestEditor,
  destroyEditor,
} from '../helpers/createTestEditor';
import { countNodes, getMarksForText, getNodeAt } from '../helpers/docQueries';
import { parseHtml, queryOne } from '../helpers/htmlQueries';

describe('code rendering', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    destroyEditor(editor);
    editor = undefined;
  });

  it('renders inline code within surrounding text', () => {
    editor = createTestEditor(CODE.inlineWithContext);
    const doc = editor.state.doc;

    expect(getMarksForText(doc, 'const x = 1')).toContain('code');

    const html = parseHtml(editor.getHTML());
    const code = queryOne(html, 'code');
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe('const x = 1');
  });

  it('renders plain fenced code blocks', () => {
    editor = createTestEditor(CODE.plainBlock);
    const doc = editor.state.doc;
    const codeBlock = getNodeAt(doc, 'codeBlock');

    expect(countNodes(doc, 'codeBlock')).toBe(1);
    expect(codeBlock?.textContent).toContain('plain code');

    const html = parseHtml(editor.getHTML());
    expect(queryOne(html, 'pre code')).not.toBeNull();
    expect(html.body.textContent).toContain('plain code');
  });

  it('renders language-tagged code blocks', () => {
    editor = createTestEditor(CODE.jsBlock);
    const doc = editor.state.doc;
    const codeBlock = getNodeAt(doc, 'codeBlock');

    expect(codeBlock).not.toBeNull();
    expect(codeBlock?.attrs.language).toBe('javascript');

    const html = parseHtml(editor.getHTML());
    const code = queryOne(html, 'pre code');
    expect(code).not.toBeNull();
    expect(
      code?.classList.contains('language-javascript') ||
        code?.getAttribute('class')?.includes('javascript'),
    ).toBe(true);
    expect(html.body.textContent).toContain('const x = 1');
  });
});
