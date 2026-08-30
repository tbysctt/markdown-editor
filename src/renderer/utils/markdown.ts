import { APP_NAME } from '../../shared/appMeta';
import { normalizeImageSrcForSave } from './assetUrl';

export interface QueuedImage {
  tempPath: string;
  relativePath: string;
  fileUrl: string;
}

export async function prepareMarkdownForEditor(
  markdown: string,
): Promise<string> {
  return markdown;
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
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (match, alt: string, src: string) => {
      const normalized = normalizeImageSrcForSave(src);
      if (normalized === src) {
        return match;
      }
      return `![${alt}](${normalized})`;
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
  return `${prefix}${name} — ${APP_NAME}`;
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
    return `${prefix}${fileName} — ${folderName} — ${APP_NAME}`;
  }
  return `${folderName} — ${APP_NAME}`;
}
