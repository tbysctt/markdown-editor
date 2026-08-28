const IMAGE_MARKDOWN_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

export interface QueuedImage {
  tempPath: string;
  relativePath: string;
  fileUrl: string;
}

export async function prepareMarkdownForEditor(
  markdown: string,
  docPath: string,
): Promise<string> {
  const matches = [...markdown.matchAll(IMAGE_MARKDOWN_REGEX)];
  let result = markdown;

  for (const match of matches) {
    const src = match[2];
    if (
      src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('file://')
    ) {
      continue;
    }

    const fileUrl = await window.electronAPI.resolveAssetUrl(docPath, src);
    result = result.replace(`](${src})`, `](${fileUrl})`);
  }

  return result;
}

export function prepareMarkdownForSave(
  markdown: string,
  queuedImages: QueuedImage[],
): string {
  let result = markdown;

  for (const image of queuedImages) {
    result = result.split(image.fileUrl).join(image.relativePath);
  }

  result = result.replace(
    /!\[([^\]]*)\]\(file:\/\/[^)]+\)/g,
    (match, alt: string) => {
      const fileUrl = match.match(/\((file:\/\/[^)]+)\)/)?.[1];
      if (!fileUrl) {
        return match;
      }

      const queued = queuedImages.find((image) => image.fileUrl === fileUrl);
      if (queued) {
        return `![${alt}](${queued.relativePath})`;
      }

      const assetsMatch = fileUrl.match(/assets\/[^/]+$/);
      if (assetsMatch) {
        return `![${alt}](${assetsMatch[0]})`;
      }

      return match;
    },
  );

  return result;
}

export function getFileName(filePath: string | null): string {
  if (!filePath) {
    return 'Untitled';
  }

  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || 'Untitled';
}

export function buildWindowTitle(
  filePath: string | null,
  dirty: boolean,
): string {
  const name = getFileName(filePath);
  const prefix = dirty ? '*' : '';
  return `${prefix}${name} — MDEditor`;
}

export function buildWorkspaceTitle(
  rootPath: string,
  activeFilePath: string | null,
  activeDirty: boolean,
): string {
  const folderName = getFileName(rootPath);
  if (activeFilePath) {
    const fileName = getFileName(activeFilePath);
    const prefix = activeDirty ? '*' : '';
    return `${prefix}${fileName} — ${folderName} — MDEditor`;
  }
  return `${folderName} — MDEditor`;
}
