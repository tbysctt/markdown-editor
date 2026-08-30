import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import { HEADINGS } from '../fixtures/rendering';
import {
  createTestEditor,
  destroyEditor,
} from '../helpers/createTestEditor';
import { findNodes } from '../helpers/docQueries';
import { parseHtml, queryOne } from '../helpers/htmlQueries';

describe('headings rendering', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    destroyEditor(editor);
    editor = undefined;
  });

  it.each([
    [1, HEADINGS.h1, 'Heading 1'],
    [2, HEADINGS.h2, 'Heading 2'],
    [3, HEADINGS.h3, 'Heading 3'],
    [4, HEADINGS.h4, 'Heading 4'],
    [5, HEADINGS.h5, 'Heading 5'],
    [6, HEADINGS.h6, 'Heading 6'],
  ])('renders h%d', (level, markdown, text) => {
    editor = createTestEditor(markdown);
    const doc = editor.state.doc;
    const headings = findNodes(doc, 'heading');

    expect(headings).toHaveLength(1);
    expect(headings[0].node.attrs.level).toBe(level);

    const html = parseHtml(editor.getHTML());
    const heading = queryOne(html, `h${level}`);
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toBe(text);
  });

  it('renders all heading levels in one document', () => {
    editor = createTestEditor(HEADINGS.all);
    const doc = editor.state.doc;
    const headings = findNodes(doc, 'heading');

    expect(headings).toHaveLength(6);
    expect(headings.map(({ node }) => node.attrs.level)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });
});
