import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'temp') {
        return '/tmp/notebook-test';
      }
      if (name === 'home') {
        return '/home/testuser';
      }
      return `/mock/${name}`;
    }),
  },
  net: { fetch: vi.fn() },
  protocol: {
    registerSchemesAsPrivileged: vi.fn(),
    handle: vi.fn(),
  },
}));

import {
  assetsRelativePath,
  pastedImageFileName,
  resolveAbsoluteAssetUrl,
  resolveAssetUrlForDocument,
  toAssetProtocolUrl,
  uniqueAssetName,
} from './assets';

describe('toAssetProtocolUrl', () => {
  it('encodes absolute paths in the asset protocol', () => {
    expect(toAssetProtocolUrl('/tmp/workspace/assets/image.png')).toBe(
      'notebook-asset://asset/%2Ftmp%2Fworkspace%2Fassets%2Fimage.png',
    );
  });
});

describe('assetsRelativePath', () => {
  it('builds assets/ relative paths', () => {
    expect(assetsRelativePath('image.png')).toBe('assets/image.png');
  });
});

describe('uniqueAssetName', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  });

  it('preserves the extension and adds a timestamp suffix', () => {
    expect(uniqueAssetName('photo.png')).toBe('photo-1700000000000.png');
  });
});

describe('pastedImageFileName', () => {
  it('formats pasted image filenames with a timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15, 9, 8, 7));
    expect(pastedImageFileName()).toBe('Pasted image 20260315090807.png');
    vi.useRealTimers();
  });
});

describe('resolveAssetUrlForDocument', () => {
  it('returns an asset protocol URL for allowed document assets', () => {
    const docPath = '/home/testuser/docs/readme.md';
    const url = resolveAssetUrlForDocument(docPath, 'assets/image.png');
    expect(url.startsWith('notebook-asset://asset/')).toBe(true);
  });

  it('throws for assets outside allowed directories', () => {
    expect(() =>
      resolveAssetUrlForDocument('/var/docs/readme.md', 'assets/image.png'),
    ).toThrow('Asset path is outside allowed directories');
  });
});

describe('resolveAbsoluteAssetUrl', () => {
  it('returns an asset protocol URL for allowed absolute paths', () => {
    const url = resolveAbsoluteAssetUrl('/home/testuser/assets/image.png');
    expect(url.startsWith('notebook-asset://asset/')).toBe(true);
  });

  it('throws for disallowed absolute paths', () => {
    expect(() => resolveAbsoluteAssetUrl('/var/secrets/key.pem')).toThrow(
      'Asset path is outside allowed directories',
    );
  });
});
