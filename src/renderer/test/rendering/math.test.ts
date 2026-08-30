import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import { MATH } from '../fixtures/rendering';
import {
  createTestEditor,
  destroyEditor,
} from '../helpers/createTestEditor';
import { countNodes, getNodeAt } from '../helpers/docQueries';
import { parseHtml, queryAll, queryOne } from '../helpers/htmlQueries';

describe('math rendering', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    destroyEditor(editor);
    editor = undefined;
  });

  it('renders inline math', () => {
    editor = createTestEditor(MATH.inline);
    const doc = editor.state.doc;
    const inlineMath = getNodeAt(doc, 'inlineMath');

    expect(inlineMath).not.toBeNull();
    expect(inlineMath?.attrs.latex).toBe('x^2');

    const html = parseHtml(editor.getHTML());
    const element = queryOne(html, 'span[data-type="inline-math"]');
    expect(element).not.toBeNull();
    expect(element?.getAttribute('data-latex')).toBe('x^2');
  });

  it('renders block math', () => {
    editor = createTestEditor(MATH.block);
    const doc = editor.state.doc;
    const blockMath = getNodeAt(doc, 'blockMath');

    expect(blockMath).not.toBeNull();
    expect(blockMath?.attrs.latex).toContain('\\int_0^1');

    const html = parseHtml(editor.getHTML());
    const element = queryOne(html, 'div[data-type="block-math"]');
    expect(element).not.toBeNull();
    expect(element?.getAttribute('data-latex')).toContain('\\int_0^1');
  });

  it('renders multiple inline math tokens in one paragraph', () => {
    editor = createTestEditor(MATH.multipleInline);
    const doc = editor.state.doc;

    expect(countNodes(doc, 'inlineMath')).toBe(2);

    const html = parseHtml(editor.getHTML());
    expect(queryAll(html, 'span[data-type="inline-math"]')).toHaveLength(2);
  });

  it('renders fractions and special characters', () => {
    editor = createTestEditor(MATH.fraction);
    const doc = editor.state.doc;
    const inlineMath = getNodeAt(doc, 'inlineMath');

    expect(inlineMath?.attrs.latex).toBe('\\frac{a}{b}');

    const html = parseHtml(editor.getHTML());
    const element = queryOne(html, 'span[data-type="inline-math"]');
    expect(element).not.toBeNull();
    expect(element?.getAttribute('data-latex')).toBe('\\frac{a}{b}');
  });

  it('does not include KaTeX output in semantic HTML', () => {
    editor = createTestEditor(MATH.inline);
    const html = editor.getHTML();

    expect(html).not.toContain('class="katex"');
  });
});
