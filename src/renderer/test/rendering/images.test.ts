import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import { IMAGES } from '../fixtures/rendering';
import {
  createTestEditor,
  destroyEditor,
} from '../helpers/createTestEditor';
import { getNodeAt } from '../helpers/docQueries';
import { parseHtml, queryOne } from '../helpers/htmlQueries';

describe('image rendering', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    destroyEditor(editor);
    editor = undefined;
  });

  it('renders images with src and alt', () => {
    editor = createTestEditor(IMAGES.basic);
    const doc = editor.state.doc;
    const image = getNodeAt(doc, 'image');

    expect(image).not.toBeNull();
    expect(image?.attrs.src).toBe('./images/foo.png');
    expect(image?.attrs.alt).toBe('Alt text');

    const html = parseHtml(editor.getHTML());
    const img = queryOne(html, 'img[src="./images/foo.png"]');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toBe('Alt text');
  });

  it('renders images with title attribute', () => {
    editor = createTestEditor(IMAGES.withTitle);
    const doc = editor.state.doc;
    const image = getNodeAt(doc, 'image');

    expect(image?.attrs.title).toBe('Image title');

    const html = parseHtml(editor.getHTML());
    const img = queryOne(html, 'img[title="Image title"]');
    expect(img).not.toBeNull();
  });
});
