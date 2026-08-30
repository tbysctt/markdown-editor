// @vitest-environment node
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTempDir, removeTempDir } from '../test/helpers/tempDir';
import { readDirectoryTree } from './folderTree';

describe('readDirectoryTree', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await createTempDir('folder-tree-');
    await fs.mkdir(path.join(tempDir, 'dirB'));
    await fs.mkdir(path.join(tempDir, 'dirA'));
    await fs.writeFile(path.join(tempDir, 'zebra.md'), '');
    await fs.writeFile(path.join(tempDir, 'alpha.md'), '');
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  it('sorts directories before files and names case-insensitively', async () => {
    const tree = await readDirectoryTree(tempDir);
    expect(tree.children?.map((child) => child.name)).toEqual([
      'dirA',
      'dirB',
      'alpha.md',
      'zebra.md',
    ]);
  });

  it('returns directory nodes with expected shape', async () => {
    const tree = await readDirectoryTree(tempDir);
    expect(tree).toMatchObject({
      name: path.basename(tempDir),
      path: tempDir,
      type: 'directory',
    });
    expect(tree.children?.[0]).toMatchObject({ type: 'directory' });
    expect(tree.children?.[2]).toMatchObject({ type: 'file' });
  });

  it('respects maxDepth by returning empty children', async () => {
    const nested = path.join(tempDir, 'dirA', 'nested');
    await fs.mkdir(nested, { recursive: true });
    const tree = await readDirectoryTree(tempDir, 0, 0);
    const dirA = tree.children?.find((child) => child.name === 'dirA');
    expect(dirA?.children).toEqual([]);
  });

  it('respects maxEntries when reading directories', async () => {
    const tree = await readDirectoryTree(tempDir, 0, 12, 2);
    expect(tree.children).toHaveLength(2);
  });
});
