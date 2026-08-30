export function remapPath(
  filePath: string,
  oldPath: string,
  newPath: string,
): string {
  if (filePath === oldPath) {
    return newPath;
  }

  const normalizedOld = oldPath.replace(/\\/g, '/');
  const normalizedFile = filePath.replace(/\\/g, '/');
  const prefix = `${normalizedOld}/`;

  if (normalizedFile.startsWith(prefix)) {
    const suffix = normalizedFile.slice(normalizedOld.length);
    return newPath.replace(/\\/g, '/') + suffix;
  }

  if (
    filePath.startsWith(`${oldPath}/`) ||
    filePath.startsWith(`${oldPath}\\`)
  ) {
    return newPath + filePath.slice(oldPath.length);
  }

  return filePath;
}

export function isPathUnder(filePath: string, parentPath: string): boolean {
  if (filePath === parentPath) {
    return true;
  }
  return (
    filePath.startsWith(`${parentPath}/`) ||
    filePath.startsWith(`${parentPath}\\`)
  );
}
