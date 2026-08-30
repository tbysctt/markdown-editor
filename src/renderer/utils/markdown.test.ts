import { describe, expect, it } from 'vitest';
import { APP_NAME } from '../../shared/appMeta';
import {
  buildWindowTitle,
  buildWorkspaceTitle,
  getFileName,
  prepareMarkdownForSave,
} from './markdown';

describe('prepareMarkdownForSave', () => {
  it('replaces queued file URLs with relative paths', () => {
    const markdown =
      '![a](notebook-asset://asset/temp/a.png) and ![b](notebook-asset://asset/temp/b.png)';
    const result = prepareMarkdownForSave(markdown, [
      {
        tempPath: '/temp/a.png',
        relativePath: 'assets/a.png',
        fileUrl: 'notebook-asset://asset/temp/a.png',
      },
      {
        tempPath: '/temp/b.png',
        relativePath: 'assets/b.png',
        fileUrl: 'notebook-asset://asset/temp/b.png',
      },
    ]);

    expect(result).toContain('assets/a.png');
    expect(result).toContain('assets/b.png');
    expect(result).not.toContain('notebook-asset://');
  });

  it('normalizes image markdown links on save', () => {
    const absolute = '/tmp/workspace/docs/assets/image.png';
    const markdown = `![Alt](notebook-asset://asset/${encodeURIComponent(absolute)})`;
    const result = prepareMarkdownForSave(markdown, []);

    expect(result).toBe('![Alt](assets/image.png)');
  });
});

describe('getFileName', () => {
  it('returns Untitled for null paths', () => {
    expect(getFileName(null)).toBe('Untitled');
  });

  it('extracts basenames from unix and windows paths', () => {
    expect(getFileName('/tmp/workspace/readme.md')).toBe('readme.md');
    expect(getFileName('C:\\docs\\notes.md')).toBe('notes.md');
  });
});

describe('buildWindowTitle', () => {
  it('builds a clean title', () => {
    expect(buildWindowTitle('/tmp/readme.md', false)).toBe(
      `readme.md — ${APP_NAME}`,
    );
  });

  it('prefixes dirty tabs with an asterisk', () => {
    expect(buildWindowTitle('/tmp/readme.md', true)).toBe(
      `*readme.md — ${APP_NAME}`,
    );
  });
});

describe('buildWorkspaceTitle', () => {
  it('builds a workspace-only title', () => {
    expect(buildWorkspaceTitle('/tmp/workspace', null, false)).toBe(
      `workspace — ${APP_NAME}`,
    );
  });

  it('includes the active file and dirty state', () => {
    expect(
      buildWorkspaceTitle('/tmp/workspace', '/tmp/workspace/readme.md', true),
    ).toBe(`*readme.md — workspace — ${APP_NAME}`);
  });
});
