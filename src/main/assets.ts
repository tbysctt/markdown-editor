import { app, net, protocol } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  isAllowedAssetAbsolutePath,
  resolveDocumentAssetPath,
} from '../shared/paths';

export const ASSETS_DIR_NAME = 'assets';
export const ASSET_PROTOCOL = 'notebook-asset';

export function getTempAssetsDir(): string {
  return path.join(app.getPath('temp'), 'notebook-assets');
}

export function getAllowedAssetRoots(): string[] {
  return [app.getPath('temp'), app.getPath('home')];
}

export function toAssetProtocolUrl(absolutePath: string): string {
  return `${ASSET_PROTOCOL}://asset/${encodeURIComponent(absolutePath)}`;
}

export function resolveAssetUrlForDocument(
  docPath: string,
  relativePath: string,
): string {
  const absolutePath = resolveDocumentAssetPath(docPath, relativePath);
  if (!isAllowedAssetAbsolutePath(absolutePath, getAllowedAssetRoots())) {
    throw new Error('Asset path is outside allowed directories');
  }
  return toAssetProtocolUrl(absolutePath);
}

export function resolveAbsoluteAssetUrl(absolutePath: string): string {
  const resolved = path.resolve(absolutePath);
  if (!isAllowedAssetAbsolutePath(resolved, getAllowedAssetRoots())) {
    throw new Error('Asset path is outside allowed directories');
  }
  return toAssetProtocolUrl(resolved);
}

export function registerAssetProtocolSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: ASSET_PROTOCOL,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

export function registerAssetProtocol(): void {
  protocol.handle(ASSET_PROTOCOL, (request) => {
    const parsed = new URL(request.url);
    const absolutePath = decodeURIComponent(parsed.pathname.slice(1));
    const resolved = path.resolve(absolutePath);

    if (!isAllowedAssetAbsolutePath(resolved, getAllowedAssetRoots())) {
      return new Response('Forbidden', { status: 403 });
    }

    return net.fetch(pathToFileURL(resolved).href);
  });
}

export async function ensureAssetsDir(docPath: string): Promise<string> {
  const assetsDir = path.join(path.dirname(docPath), ASSETS_DIR_NAME);
  await fs.mkdir(assetsDir, { recursive: true });
  return assetsDir;
}

export function assetsRelativePath(fileName: string): string {
  return `${ASSETS_DIR_NAME}/${fileName}`;
}

export function pastedImageFileName(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');

  return `Pasted image ${timestamp}.png`;
}

export function uniqueAssetName(fileName: string): string {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  return `${base}-${Date.now()}${ext}`;
}
