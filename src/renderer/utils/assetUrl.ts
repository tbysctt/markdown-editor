const ASSET_PROTOCOL = 'notebook-asset';

export function isRemoteImageSrc(src: string): boolean {
  return (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:')
  );
}

export function isAssetProtocolUrl(src: string): boolean {
  return src.startsWith(`${ASSET_PROTOCOL}://`);
}

export function fromAssetProtocolUrl(url: string): string | null {
  if (!isAssetProtocolUrl(url)) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    return null;
  }
}

export function absolutePathToRelativeAssetPath(absolutePath: string): string | null {
  const normalized = absolutePath.replace(/\\/g, '/');
  const match = normalized.match(/assets\/[^/]+$/);
  return match?.[0] ?? null;
}

export function normalizeImageSrcForSave(src: string): string {
  if (isRemoteImageSrc(src) || src.startsWith('assets/')) {
    return src;
  }

  if (isAssetProtocolUrl(src) || src.startsWith('file://')) {
    const absolutePath = isAssetProtocolUrl(src)
      ? fromAssetProtocolUrl(src)
      : decodeURIComponent(src.replace(/^file:\/\//, ''));

    if (absolutePath) {
      const relative = absolutePathToRelativeAssetPath(absolutePath);
      if (relative) {
        return relative;
      }
    }
  }

  return src;
}
