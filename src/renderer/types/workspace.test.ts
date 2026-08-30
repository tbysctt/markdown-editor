import { describe, expect, it } from 'vitest';
import {
  createEditorTab,
  createUntitledPath,
  createUntitledTab,
  getTabLabel,
  isMarkdownFile,
  isUntitledPath,
} from './workspace';

describe('isMarkdownFile', () => {
  it('accepts markdown extensions case-insensitively', () => {
    expect(isMarkdownFile('/tmp/readme.md')).toBe(true);
    expect(isMarkdownFile('/tmp/readme.MD')).toBe(true);
    expect(isMarkdownFile('/tmp/readme.markdown')).toBe(true);
  });

  it('rejects non-markdown files', () => {
    expect(isMarkdownFile('/tmp/readme.txt')).toBe(false);
  });
});

describe('untitled path helpers', () => {
  it('detects and creates untitled paths', () => {
    const tabId = 'abc-123';
    const untitledPath = createUntitledPath(tabId);
    expect(isUntitledPath(untitledPath)).toBe(true);
    expect(getTabLabel(untitledPath)).toBe('Untitled');
  });
});

describe('createEditorTab', () => {
  it('creates a tab with default fields', () => {
    const tab = createEditorTab('/tmp/readme.md', '# Hello');
    expect(tab.filePath).toBe('/tmp/readme.md');
    expect(tab.initialContent).toBe('# Hello');
    expect(tab.dirty).toBe(false);
    expect(tab.isPreview).toBe(false);
    expect(tab.contentEpoch).toBe(0);
    expect(tab.id).toBeTruthy();
  });
});

describe('createUntitledTab', () => {
  it('creates an untitled tab linked to its id', () => {
    const tab = createUntitledTab('draft');
    expect(isUntitledPath(tab.filePath)).toBe(true);
    expect(tab.filePath).toBe(createUntitledPath(tab.id));
    expect(tab.initialContent).toBe('draft');
  });
});

describe('getTabLabel', () => {
  it('returns the file basename for saved tabs', () => {
    expect(getTabLabel('/tmp/workspace/readme.md')).toBe('readme.md');
  });
});
