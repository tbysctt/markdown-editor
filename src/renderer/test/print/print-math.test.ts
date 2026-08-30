import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import { getPrintableHtml } from '../../utils/print';
import { MATH } from '../fixtures/rendering';
import {
  createTestEditor,
  destroyEditor,
} from '../helpers/createTestEditor';

describe('print math rendering', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    destroyEditor(editor);
    editor = undefined;
  });

  it('renders inline and block math with KaTeX in printable HTML', () => {
    editor = createTestEditor(`${MATH.inline}\n\n${MATH.block}`);
    const printable = getPrintableHtml(editor);

    expect(printable).toContain('class="katex"');
    expect(printable).toContain('<!DOCTYPE html>');
    expect(printable).toContain('editor-content');
  });

  it('preserves non-math content in printable HTML', () => {
    editor = createTestEditor('Plain paragraph text.');
    const printable = getPrintableHtml(editor);

    expect(printable).toContain('Plain paragraph text.');
    expect(printable).not.toContain('class="katex"');
  });

  it('does not throw on invalid LaTeX', () => {
    editor = createTestEditor('Bad math $\\broken{');

    expect(() => getPrintableHtml(editor)).not.toThrow();
  });
});
