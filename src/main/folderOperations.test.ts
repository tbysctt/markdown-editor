// @vitest-environment node
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTempDir, removeTempDir } from '../test/helpers/tempDir';
import {
  createFolder,
  createMarkdownFile,
  deleteEntry,
  renameEntry,
  renamePath,
  resolveUniqueName,
  validateEntryName,
} from './folderOperations';

describe('validateEntryName', () => {
  it('trims and returns valid names', () => {
    expect(validateEntryName('  notes  ')).toBe('notes');
  });

  it('rejects empty names', () => {
    expect(() => validateEntryName('   ')).toThrow('Name cannot be empty');
  });

  it('rejects dot names', () => {
    expect(() => validateEntryName('.')).toThrow('Invalid name');
    expect(() => validateEntryName('..')).toThrow('Invalid name');
  });

  it('rejects invalid characters', () => {
    expect(() => validateEntryName('bad/name')).toThrow(
      'Name contains invalid characters',
    );
    expect(() => validateEntryName('bad\\name')).toThrow(
      'Name contains invalid characters',
    );
    expect(() => validateEntryName('bad:name')).toThrow(
      'Name contains invalid characters',
    );
    expect(() => validateEntryName('bad\0name')).toThrow(
      'Name contains invalid characters',
    );
  });
});

describe('resolveUniqueName', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await createTempDir('folder-ops-');
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  it('returns the original name when no conflict exists', async () => {
    await expect(resolveUniqueName(tempDir, 'notes.md')).resolves.toBe('notes.md');
  });

  it('appends numeric suffixes when names collide', async () => {
    await fs.writeFile(path.join(tempDir, 'notes.md'), '');
    await expect(resolveUniqueName(tempDir, 'notes.md')).resolves.toBe('notes-1.md');
  });
});

describe('createMarkdownFile', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await createTempDir('folder-md-');
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  it('creates markdown files with an extension', async () => {
    const filePath = await createMarkdownFile(tempDir, tempDir, 'notes');
    expect(filePath.endsWith('notes.md')).toBe(true);
    await expect(fs.readFile(filePath, 'utf-8')).resolves.toBe('');
  });

  it('preserves an existing markdown extension', async () => {
    const filePath = await createMarkdownFile(tempDir, tempDir, 'notes.markdown');
    expect(filePath.endsWith('notes.markdown')).toBe(true);
  });

  it('uses unique names on collision', async () => {
    await createMarkdownFile(tempDir, tempDir, 'notes');
    const secondPath = await createMarkdownFile(tempDir, tempDir, 'notes');
    expect(secondPath.endsWith('notes-1.md')).toBe(true);
  });
});

describe('createFolder', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await createTempDir('folder-create-');
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  it('creates folders with unique names', async () => {
    const folderPath = await createFolder(tempDir, tempDir, 'images');
    const stat = await fs.stat(folderPath);
    expect(stat.isDirectory()).toBe(true);
  });
});

describe('deleteEntry', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await createTempDir('folder-delete-');
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  it('rejects deleting the workspace root', async () => {
    await expect(deleteEntry(tempDir, tempDir)).rejects.toThrow(
      'Cannot delete the workspace root',
    );
  });

  it('deletes nested entries', async () => {
    const filePath = path.join(tempDir, 'delete-me.md');
    await fs.writeFile(filePath, '');
    await deleteEntry(tempDir, filePath);
    await expect(fs.access(filePath)).rejects.toThrow();
  });
});

describe('renamePath', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await createTempDir('folder-rename-');
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  it('returns the original path when the name is unchanged', async () => {
    const filePath = path.join(tempDir, 'notes.md');
    await fs.writeFile(filePath, '');
    await expect(renamePath(filePath, 'notes.md')).resolves.toBe(filePath);
  });

  it('throws when the target already exists', async () => {
    const first = path.join(tempDir, 'a.md');
    const second = path.join(tempDir, 'b.md');
    await fs.writeFile(first, '');
    await fs.writeFile(second, '');
    await expect(renamePath(first, 'b.md')).rejects.toThrow(
      'A file or folder with that name already exists',
    );
  });
});

describe('renameEntry', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await createTempDir('folder-rename-entry-');
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  it('rejects paths outside the workspace root', async () => {
    await expect(
      renameEntry(tempDir, '/outside/file.md', 'renamed.md'),
    ).rejects.toThrow('Path is outside the allowed root');
  });
});
