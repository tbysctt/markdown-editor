import { describe, expect, it } from 'vitest';
import { sampleWorkspaceTree } from '../../test/helpers/treeFixtures';
import {
  collectMarkdownFiles,
  findInText,
  getFlatMatchIndex,
  groupMatchesByFile,
  searchWorkspace,
  type WorkspaceMatch,
} from './workspaceSearch';

describe('collectMarkdownFiles', () => {
  it('returns an empty array for a null tree', () => {
    expect(collectMarkdownFiles(null)).toEqual([]);
  });

  it('collects markdown files and ignores other extensions', () => {
    const files = collectMarkdownFiles(sampleWorkspaceTree('/workspace'));
    expect(files).toEqual([
      '/workspace/notes/nested.md',
      '/workspace/doc.markdown',
      '/workspace/top.md',
    ]);
  });
});

describe('findInText', () => {
  const content = 'Hello world\nhello again\nSpecial (chars)+ here';

  it('returns no matches for an empty query', () => {
    expect(findInText(content, '   ', false)).toEqual([]);
  });

  it('finds multiple matches on one line', () => {
    const matches = findInText('foo foo', 'foo', false);
    expect(matches).toHaveLength(2);
    expect(matches[0].column).toBe(1);
    expect(matches[1].column).toBe(5);
  });

  it('supports case-insensitive search', () => {
    const matches = findInText(content, 'hello', false);
    expect(matches).toHaveLength(2);
  });

  it('supports case-sensitive search', () => {
    const matches = findInText(content, 'hello', true);
    expect(matches).toHaveLength(1);
    expect(matches[0].line).toBe(2);
  });

  it('escapes regex metacharacters in the query', () => {
    const matches = findInText(content, '(chars)+', false);
    expect(matches).toHaveLength(1);
    expect(matches[0].lineText).toContain('(chars)+');
  });
});

describe('searchWorkspace', () => {
  it('returns empty results for blank queries', async () => {
    await expect(
      searchWorkspace(['/a.md'], '  ', async () => 'text', false),
    ).resolves.toEqual({ matches: [], fileCount: 0 });
  });

  it('aggregates matches across files', async () => {
    const files = ['/a.md', '/b.md'];
    const contents: Record<string, string> = {
      '/a.md': 'hello world',
      '/b.md': 'hello again',
    };

    const result = await searchWorkspace(
      files,
      'hello',
      async (path) => contents[path],
      false,
    );

    expect(result.fileCount).toBe(2);
    expect(result.matches).toHaveLength(2);
  });

  it('skips unreadable files', async () => {
    const result = await searchWorkspace(
      ['/missing.md', '/ok.md'],
      'note',
      async (path) => {
        if (path === '/missing.md') {
          throw new Error('missing');
        }
        return 'note text';
      },
      false,
    );

    expect(result.fileCount).toBe(1);
    expect(result.matches[0].filePath).toBe('/ok.md');
  });

  it('aborts when the search generation changes', async () => {
    const result = await searchWorkspace(
      ['/a.md', '/b.md'],
      'hello',
      async () => 'hello',
      false,
      { generation: 1 },
      () => 2,
    );

    expect(result).toEqual({ matches: [], fileCount: 0 });
  });
});

describe('groupMatchesByFile', () => {
  it('groups matches by file path', () => {
    const matches: WorkspaceMatch[] = [
      {
        filePath: '/a.md',
        line: 1,
        column: 1,
        lineText: 'one',
        matchStart: 0,
        matchEnd: 1,
        indexInFile: 0,
      },
      {
        filePath: '/b.md',
        line: 2,
        column: 3,
        lineText: 'two',
        matchStart: 2,
        matchEnd: 3,
        indexInFile: 0,
      },
      {
        filePath: '/a.md',
        line: 3,
        column: 1,
        lineText: 'three',
        matchStart: 0,
        matchEnd: 1,
        indexInFile: 1,
      },
    ];

    const groups = groupMatchesByFile(matches);
    expect(groups).toHaveLength(2);
    expect(groups[0].matches).toHaveLength(2);
    expect(groups[1].matches).toHaveLength(1);
  });
});

describe('getFlatMatchIndex', () => {
  it('finds the index of an equivalent match', () => {
    const match: WorkspaceMatch = {
      filePath: '/a.md',
      line: 2,
      column: 4,
      lineText: 'hello',
      matchStart: 3,
      matchEnd: 4,
      indexInFile: 0,
    };
    const matches = [match, { ...match, line: 3 }];

    expect(getFlatMatchIndex(matches, match)).toBe(0);
  });
});
