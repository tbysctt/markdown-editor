import { describe, expect, it, vi } from 'vitest';
import {
  createMockEditor,
  getMockEditorChain,
} from '../../test/helpers/mockEditor';
import {
  getImageFileFromFileList,
  insertImageFromRelativePath,
  insertImageNode,
} from './insertImage';

describe('getImageFileFromFileList', () => {
  it('returns the first image file', () => {
    const files = [
      new File(['text'], 'notes.txt', { type: 'text/plain' }),
      new File(['img'], 'photo.png', { type: 'image/png' }),
    ];

    expect(getImageFileFromFileList(files)?.name).toBe('photo.png');
  });

  it('returns null when no image files are present', () => {
    const files = [new File(['text'], 'notes.txt', { type: 'text/plain' })];
    expect(getImageFileFromFileList(files)).toBeNull();
  });
});

describe('insertImageNode', () => {
  it('inserts at a specific position when insertPos is provided', () => {
    const editor = createMockEditor();
    insertImageNode(editor, 'assets/image.png', 4);

    const chain = getMockEditorChain(editor);
    expect(chain.insertContentAt).toHaveBeenCalledWith(4, {
      type: 'image',
      attrs: { src: 'assets/image.png' },
    });
    expect(chain.run).toHaveBeenCalled();
  });

  it('sets the image at the cursor when insertPos is omitted', () => {
    const editor = createMockEditor();
    insertImageNode(editor, 'assets/image.png');

    const chain = getMockEditorChain(editor);
    expect(chain.setImage).toHaveBeenCalledWith({ src: 'assets/image.png' });
    expect(chain.run).toHaveBeenCalled();
  });
});

describe('insertImageFromRelativePath', () => {
  it('queues staged images instead of marking dirty', () => {
    const editor = createMockEditor();
    const addQueuedImage = vi.fn();
    const markDirty = vi.fn();
    const staged = {
      tempPath: '/tmp/image.png',
      relativePath: 'assets/image.png',
      fileUrl: 'notebook-asset://asset/tmp/image.png',
    };

    insertImageFromRelativePath({
      editor,
      relativePath: 'assets/image.png',
      addQueuedImage,
      markDirty,
      staged,
    });

    expect(addQueuedImage).toHaveBeenCalledWith(staged);
    expect(markDirty).not.toHaveBeenCalled();
  });

  it('marks the document dirty for saved images', () => {
    const editor = createMockEditor();
    const addQueuedImage = vi.fn();
    const markDirty = vi.fn();

    insertImageFromRelativePath({
      editor,
      relativePath: 'assets/image.png',
      addQueuedImage,
      markDirty,
    });

    expect(addQueuedImage).not.toHaveBeenCalled();
    expect(markDirty).toHaveBeenCalled();
  });
});
