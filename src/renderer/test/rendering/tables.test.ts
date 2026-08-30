import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import { TABLES } from '../fixtures/rendering';
import {
  createTestEditor,
  destroyEditor,
} from '../helpers/createTestEditor';
import { countNodes } from '../helpers/docQueries';
import { parseHtml, queryAll, queryOne } from '../helpers/htmlQueries';

describe('table rendering', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    destroyEditor(editor);
    editor = undefined;
  });

  it('renders a simple table', () => {
    editor = createTestEditor(TABLES.simple);
    const doc = editor.state.doc;

    expect(countNodes(doc, 'table')).toBe(1);
    expect(countNodes(doc, 'tableRow')).toBe(2);
    expect(countNodes(doc, 'tableHeader')).toBe(2);
    expect(countNodes(doc, 'tableCell')).toBe(2);

    const html = parseHtml(editor.getHTML());
    expect(queryOne(html, 'table')).not.toBeNull();
    expect(queryAll(html, 'th')).toHaveLength(2);
    expect(queryAll(html, 'td')).toHaveLength(2);
    expect(html.body.textContent).toContain('H1');
    expect(html.body.textContent).toContain('a');
  });

  it('renders multi-row tables', () => {
    editor = createTestEditor(TABLES.multiRow);
    const doc = editor.state.doc;

    expect(countNodes(doc, 'tableRow')).toBe(3);
    expect(countNodes(doc, 'tableCell')).toBe(4);

    const html = parseHtml(editor.getHTML());
    expect(queryAll(html, 'tr')).toHaveLength(3);
    expect(html.body.textContent).toContain('Alpha');
    expect(html.body.textContent).toContain('Beta');
  });
});
