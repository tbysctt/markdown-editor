import fs from 'node:fs/promises';
import path from 'node:path';

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

const compareEntries = (
  a: { name: string; isDirectory: () => boolean },
  b: { name: string; isDirectory: () => boolean },
): number => {
  const aIsDir = a.isDirectory();
  const bIsDir = b.isDirectory();

  if (aIsDir !== bIsDir) {
    return aIsDir ? -1 : 1;
  }

  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
};

export async function readDirectoryTree(
  dirPath: string,
  depth = 0,
  maxDepth = 12,
  maxEntries = 5000,
): Promise<FileTreeNode> {
  if (depth > maxDepth) {
    return {
      name: path.basename(dirPath),
      path: dirPath,
      type: 'directory',
      children: [],
    };
  }

  const name = path.basename(dirPath);
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  entries.sort(compareEntries);

  const children: FileTreeNode[] = [];

  for (const entry of entries) {
    if (children.length >= maxEntries) {
      break;
    }

    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      children.push(await readDirectoryTree(entryPath, depth + 1, maxDepth, maxEntries));
    } else if (entry.isFile()) {
      children.push({
        name: entry.name,
        path: entryPath,
        type: 'file',
      });
    }
  }

  return {
    name,
    path: dirPath,
    type: 'directory',
    children,
  };
}
