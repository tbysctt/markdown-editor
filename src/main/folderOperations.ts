import fs from 'node:fs/promises';
import path from 'node:path';
import { assertPathInsideRoot } from '../shared/paths';

const INVALID_NAME_CHARS = /[/\\?%*:|"<>]/;

export function validateEntryName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Name cannot be empty');
  }

  if (trimmed === '.' || trimmed === '..') {
    throw new Error('Invalid name');
  }

  if (INVALID_NAME_CHARS.test(trimmed) || trimmed.includes('\0')) {
    throw new Error('Name contains invalid characters');
  }

  return trimmed;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveUniqueName(
  parentDir: string,
  name: string,
): Promise<string> {
  const basePath = path.join(parentDir, name);
  if (!(await pathExists(basePath))) {
    return name;
  }

  const ext = path.extname(name);
  const baseName = ext ? path.basename(name, ext) : name;
  let counter = 1;

  while (counter < 1000) {
    const candidate = ext
      ? `${baseName}-${counter}${ext}`
      : `${baseName}-${counter}`;
    if (!(await pathExists(path.join(parentDir, candidate)))) {
      return candidate;
    }
    counter += 1;
  }

  throw new Error('Could not find a unique name');
}

function ensureMarkdownExtension(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
    return name;
  }
  return `${name}.md`;
}

export async function createMarkdownFile(
  rootPath: string,
  parentDir: string,
  name: string,
): Promise<string> {
  assertPathInsideRoot(rootPath, parentDir);
  const validName = validateEntryName(name);
  const withExtension = ensureMarkdownExtension(validName);
  const uniqueName = await resolveUniqueName(parentDir, withExtension);
  const filePath = path.join(parentDir, uniqueName);
  assertPathInsideRoot(rootPath, filePath);
  await fs.writeFile(filePath, '', 'utf-8');
  return filePath;
}

export async function createFolder(
  rootPath: string,
  parentDir: string,
  name: string,
): Promise<string> {
  assertPathInsideRoot(rootPath, parentDir);
  const validName = validateEntryName(name);
  const uniqueName = await resolveUniqueName(parentDir, validName);
  const folderPath = path.join(parentDir, uniqueName);
  assertPathInsideRoot(rootPath, folderPath);
  await fs.mkdir(folderPath, { recursive: false });
  return folderPath;
}

export async function deleteEntry(
  rootPath: string,
  targetPath: string,
): Promise<void> {
  assertPathInsideRoot(rootPath, targetPath);
  const resolvedRoot = path.resolve(rootPath);
  const resolvedTarget = path.resolve(targetPath);
  if (resolvedTarget === resolvedRoot) {
    throw new Error('Cannot delete the workspace root');
  }

  await fs.rm(targetPath, { recursive: true, force: true });
}

export async function renamePath(
  oldPath: string,
  newName: string,
): Promise<string> {
  const parentDir = path.dirname(oldPath);
  const validName = validateEntryName(newName);
  const newPath = path.join(parentDir, validName);

  if (path.resolve(oldPath) === path.resolve(newPath)) {
    return oldPath;
  }

  if (await pathExists(newPath)) {
    throw new Error('A file or folder with that name already exists');
  }

  await fs.rename(oldPath, newPath);
  return newPath;
}

export async function renameEntry(
  rootPath: string,
  oldPath: string,
  newName: string,
): Promise<string> {
  assertPathInsideRoot(rootPath, oldPath);
  const newPath = await renamePath(oldPath, newName);
  assertPathInsideRoot(rootPath, newPath);
  return newPath;
}
