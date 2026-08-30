import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import {
  ALERTS,
  CODE,
  KITCHEN_SINK,
  LISTS,
  MATH,
  TABLES,
} from '../fixtures/rendering';
import {
  createTestEditor,
  destroyEditor,
  loadMarkdown,
} from '../helpers/createTestEditor';
import {
  normalizeHtml,
  normalizeMarkdown,
} from '../helpers/normalizeMarkdown';

describe('markdown roundtrip', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    destroyEditor(editor);
    editor = undefined;
  });

  it('round-trips the kitchen sink document', () => {
    editor = createTestEditor(KITCHEN_SINK);
    const firstHtml = normalizeHtml(editor.getHTML());
    const exported = editor.getMarkdown();

    const secondEditor = createTestEditor(exported);
    const secondHtml = normalizeHtml(secondEditor.getHTML());

    expect(secondHtml).toBe(firstHtml);

    expect(exported).toContain('> [!NOTE]');
    expect(exported).toContain('- [ ] open task');
    expect(exported).toContain('- [x] done task');
    expect(exported).toMatch(/\|\s*H1\s*\|\s*H2\s*\|/);
    expect(exported).toMatch(/\$\$[\s\S]+?\$\$/);
    expect(exported).toContain('```');

    secondEditor.destroy();
  });

  it.each([
    ['alert', ALERTS.note, '> [!NOTE]'],
    ['task list', LISTS.taskMixed, '- [ ] Open task'],
    ['table', TABLES.simple, /\|\s*H1\s*\|\s*H2\s*\|/],
    ['code block', CODE.jsBlock, '```javascript'],
    ['inline math', MATH.inline, '$'],
    ['block math', MATH.block, '$$'],
  ])('round-trips %s elements', (_label, markdown, marker) => {
    editor = createTestEditor(markdown);
    const firstHtml = normalizeHtml(editor.getHTML());
    const exported = editor.getMarkdown();

    if (marker instanceof RegExp) {
      expect(exported).toMatch(marker);
    } else {
      expect(exported).toContain(marker);
    }

    const secondEditor = createTestEditor(exported);
    expect(normalizeHtml(secondEditor.getHTML())).toBe(firstHtml);
    secondEditor.destroy();
  });

  it('reloads exported markdown into the same editor', () => {
    editor = createTestEditor(KITCHEN_SINK);
    const firstHtml = normalizeHtml(editor.getHTML());
    const exported = normalizeMarkdown(editor.getMarkdown());

    loadMarkdown(editor, exported);
    const reloadedHtml = normalizeHtml(editor.getHTML());

    expect(reloadedHtml).toBe(firstHtml);
  });
});
