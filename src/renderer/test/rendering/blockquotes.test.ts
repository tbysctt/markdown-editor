import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import { BLOCKQUOTES } from '../fixtures/rendering';
import {
  createTestEditor,
  destroyEditor,
} from '../helpers/createTestEditor';
import { countNodes, getTextContent } from '../helpers/docQueries';
import { parseHtml, queryAll, queryOne } from '../helpers/htmlQueries';

describe('blockquote rendering', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    destroyEditor(editor);
    editor = undefined;
  });

  it('renders plain blockquotes without alert attributes', () => {
    editor = createTestEditor(BLOCKQUOTES.simple);
    const doc = editor.state.doc;

    expect(countNodes(doc, 'blockquote')).toBe(1);
    expect(countNodes(doc, 'alert')).toBe(0);
    expect(getTextContent(doc)).toContain('Plain blockquote text');

    const html = parseHtml(editor.getHTML());
    const blockquote = queryOne(html, 'blockquote');
    expect(blockquote).not.toBeNull();
    expect(blockquote?.getAttribute('data-alert-type')).toBeNull();
  });

  it('renders multi-line blockquotes', () => {
    editor = createTestEditor(BLOCKQUOTES.multiline);
    const doc = editor.state.doc;

    expect(countNodes(doc, 'blockquote')).toBe(1);
    expect(getTextContent(doc)).toContain('First line');
    expect(getTextContent(doc)).toContain('Second line');

    const html = parseHtml(editor.getHTML());
    const blockquote = queryOne(html, 'blockquote');
    expect(blockquote).not.toBeNull();
    expect(queryAll(html, 'blockquote p').length).toBeGreaterThanOrEqual(1);
  });
});
