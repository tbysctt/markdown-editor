import type { FileTreeNode } from '../types/electron';

export function findNodeInTree(
  tree: FileTreeNode | null,
  targetPath: string,
): FileTreeNode | null {
  if (!tree) {
    return null;
  }

  if (tree.path === targetPath) {
    return tree;
  }

  if (!tree.children) {
    return null;
  }

  for (const child of tree.children) {
    const found = findNodeInTree(child, targetPath);
    if (found) {
      return found;
    }
  }

  return null;
}

export function getParentDirForCreate(
  rootPath: string,
  selectedPath: string | null,
  tree: FileTreeNode | null,
): string {
  if (!selectedPath) {
    return rootPath;
  }

  const node = findNodeInTree(tree, selectedPath);
  if (node?.type === 'directory') {
    return selectedPath;
  }

  const lastSep = Math.max(
    selectedPath.lastIndexOf('/'),
    selectedPath.lastIndexOf('\\'),
  );
  if (lastSep === -1) {
    return rootPath;
  }

  return selectedPath.slice(0, lastSep) || rootPath;
}
