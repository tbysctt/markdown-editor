import path from 'node:path';

export function assertPathInsideRoot(rootPath: string, targetPath: string): void {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedRoot, resolvedTarget);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path is outside the allowed root');
  }
}

export function resolvePathUnderRoot(rootPath: string, targetPath: string): string {
  const resolved = path.resolve(rootPath, targetPath);
  assertPathInsideRoot(rootPath, resolved);
  return resolved;
}

export function resolveDocumentAssetPath(
  docPath: string,
  relativePath: string,
): string {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error('Invalid asset path');
  }

  if (relativePath.split(/[/\\]/).includes('..')) {
    throw new Error('Asset path traversal is not allowed');
  }

  const docDir = path.dirname(docPath);
  const absolutePath = path.resolve(docDir, relativePath);
  assertPathInsideRoot(docDir, absolutePath);
  return absolutePath;
}

export function isAllowedAssetAbsolutePath(
  absolutePath: string,
  allowedRoots: string[],
): boolean {
  const resolved = path.resolve(absolutePath);
  return allowedRoots.some((root) => {
    const resolvedRoot = path.resolve(root);
    const relative = path.relative(resolvedRoot, resolved);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });
}
