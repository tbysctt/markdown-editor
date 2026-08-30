import { describe, expect, it } from 'vitest';
import { sampleWorkspaceTree } from '../../test/helpers/treeFixtures';
import {
  findNodeInTree,
  getParentDirForCreate,
  isPathWithinDirectory,
} from './explorer';

describe('findNodeInTree', () => {
  const tree = sampleWorkspaceTree('/workspace');

  it('returns null for a null tree', () => {
    expect(findNodeInTree(null, '/workspace/top.md')).toBeNull();
  });

  it('finds nested nodes by path', () => {
    const node = findNodeInTree(tree, '/workspace/notes/nested.md');
    expect(node?.name).toBe('nested.md');
    expect(node?.type).toBe('file');
  });

  it('returns null when the path is missing', () => {
    expect(findNodeInTree(tree, '/workspace/missing.md')).toBeNull();
  });
});

describe('getParentDirForCreate', () => {
  const tree = sampleWorkspaceTree('/workspace');

  it('returns the workspace root when nothing is selected', () => {
    expect(getParentDirForCreate('/workspace', null, tree)).toBe('/workspace');
  });

  it('returns the selected directory when a directory is selected', () => {
    expect(getParentDirForCreate('/workspace', '/workspace/notes', tree)).toBe(
      '/workspace/notes',
    );
  });

  it('returns the parent directory when a file is selected', () => {
    expect(
      getParentDirForCreate('/workspace', '/workspace/notes/nested.md', tree),
    ).toBe('/workspace/notes');
  });
});

describe('isPathWithinDirectory', () => {
  it('returns true for the directory itself', () => {
    expect(isPathWithinDirectory('/workspace/docs', '/workspace/docs')).toBe(true);
  });

  it('returns true for nested paths with mixed separators', () => {
    expect(
      isPathWithinDirectory('/workspace/docs', '/workspace/docs/readme.md'),
    ).toBe(true);
    expect(
      isPathWithinDirectory('C:\\workspace\\docs', 'C:\\workspace\\docs\\readme.md'),
    ).toBe(true);
  });

  it('returns false for paths outside the directory', () => {
    expect(isPathWithinDirectory('/workspace/docs', '/workspace/other.md')).toBe(
      false,
    );
  });
});
