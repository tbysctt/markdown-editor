import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import { MARKS } from '../fixtures/rendering';
import {
  createTestEditor,
  destroyEditor,
} from '../helpers/createTestEditor';
import { getLinkHref, getMarksForText } from '../helpers/docQueries';
import { htmlContains, parseHtml, queryOne } from '../helpers/htmlQueries';

describe('marks rendering', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    destroyEditor(editor);
    editor = undefined;
  });

  it('renders bold', () => {
    editor = createTestEditor(MARKS.bold);
    const doc = editor.state.doc;

    expect(getMarksForText(doc, 'bold text')).toContain('bold');

    const html = parseHtml(editor.getHTML());
    expect(queryOne(html, 'strong')).not.toBeNull();
    expect(html.body.textContent).toContain('bold text');
  });

  it('renders italic', () => {
    editor = createTestEditor(MARKS.italic);
    const doc = editor.state.doc;

    expect(getMarksForText(doc, 'italic text')).toContain('italic');

    const html = parseHtml(editor.getHTML());
    expect(queryOne(html, 'em')).not.toBeNull();
  });

  it('renders strikethrough', () => {
    editor = createTestEditor(MARKS.strike);
    const doc = editor.state.doc;

    expect(getMarksForText(doc, 'struck text')).toContain('strike');

    const html = parseHtml(editor.getHTML());
    expect(
      queryOne(html, 's') ?? queryOne(html, 'del') ?? queryOne(html, 'strike'),
    ).not.toBeNull();
  });

  it('renders inline code', () => {
    editor = createTestEditor(MARKS.inlineCode);
    const doc = editor.state.doc;

    expect(getMarksForText(doc, 'inline code')).toContain('code');

    const html = parseHtml(editor.getHTML());
    const code = queryOne(html, 'code');
    expect(code).not.toBeNull();
    expect(code?.classList.contains('not-prose')).toBe(true);
  });

  it('renders links', () => {
    editor = createTestEditor(MARKS.link);
    const doc = editor.state.doc;

    expect(getMarksForText(doc, 'Example link')).toContain('link');
    expect(getLinkHref(doc, 'Example link')).toBe('https://example.com');

    const html = parseHtml(editor.getHTML());
    const link = queryOne(html, 'a[href="https://example.com"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe('Example link');
  });

  it('renders combined marks in one paragraph', () => {
    editor = createTestEditor(MARKS.combined);
    const doc = editor.state.doc;

    expect(getMarksForText(doc, 'bold')).toContain('bold');
    expect(getMarksForText(doc, 'italic')).toContain('italic');
    expect(htmlContains(editor.getHTML(), 'strong')).toBe(true);
    expect(htmlContains(editor.getHTML(), 'em')).toBe(true);
  });

  it('renders marks at paragraph boundaries', () => {
    editor = createTestEditor(MARKS.boundaries);
    const doc = editor.state.doc;

    expect(getMarksForText(doc, 'bold')).toContain('bold');
    expect(getMarksForText(doc, 'code')).toContain('code');
    expect(htmlContains(editor.getHTML(), 'strong')).toBe(true);
    expect(htmlContains(editor.getHTML(), 'code')).toBe(true);
  });
});
