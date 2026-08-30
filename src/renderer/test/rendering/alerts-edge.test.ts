import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import { countNodes } from '../helpers/docQueries';
import {
  createTestEditor,
  destroyEditor,
} from '../helpers/createTestEditor';

describe('alert edge cases', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    destroyEditor(editor);
    editor = undefined;
  });

  it('treats unknown alert types as plain blockquotes', () => {
    editor = createTestEditor('> [!FOO]\n> Unknown alert');
    expect(countNodes(editor.state.doc, 'alert')).toBe(0);
    expect(countNodes(editor.state.doc, 'blockquote')).toBe(1);
  });

  it('parses case-insensitive alert headers', () => {
    editor = createTestEditor('> [!note]\n> Lowercase note');
    const alert = editor.state.doc.firstChild;
    expect(alert?.type.name).toBe('alert');
    expect(alert?.attrs.type).toBe('note');
  });

  it('parses uppercase warning alerts', () => {
    editor = createTestEditor('> [!WARNING]\n> Warning body');
    const alert = editor.state.doc.firstChild;
    expect(alert?.type.name).toBe('alert');
    expect(alert?.attrs.type).toBe('warning');
  });

  it('preserves blank blockquote lines in exported markdown', () => {
    editor = createTestEditor('> [!NOTE]\n> Line one\n>\n> Line two');
    const exported = editor.getMarkdown();
    expect(exported).toContain('> Line one');
    expect(exported).toContain('> Line two');
  });

  it('prefixes each body paragraph with blockquote markers on export', () => {
    editor = createTestEditor('> [!TIP]\n> First paragraph\n>\n> Second paragraph');
    const exported = editor.getMarkdown();
    expect(exported).toContain('> [!TIP]');
    expect(exported).toContain('> First paragraph');
    expect(exported).toContain('> Second paragraph');
  });
});
