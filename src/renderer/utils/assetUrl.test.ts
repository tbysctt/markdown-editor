import { describe, expect, it } from 'vitest';
import {
  absolutePathToRelativeAssetPath,
  fromAssetProtocolUrl,
  isAssetProtocolUrl,
  isRemoteImageSrc,
  normalizeImageSrcForSave,
} from './assetUrl';

describe('isRemoteImageSrc', () => {
  it('detects remote and data URLs', () => {
    expect(isRemoteImageSrc('https://example.com/a.png')).toBe(true);
    expect(isRemoteImageSrc('http://example.com/a.png')).toBe(true);
    expect(isRemoteImageSrc('data:image/png;base64,abc')).toBe(true);
  });

  it('returns false for local paths', () => {
    expect(isRemoteImageSrc('assets/a.png')).toBe(false);
    expect(isRemoteImageSrc('./images/a.png')).toBe(false);
  });
});

describe('fromAssetProtocolUrl', () => {
  it('decodes notebook asset protocol URLs', () => {
    const absolute = '/tmp/workspace/assets/image.png';
    const url = `notebook-asset://asset/${encodeURIComponent(absolute)}`;
    expect(fromAssetProtocolUrl(url)).toBe(absolute);
  });

  it('returns null for non-asset URLs', () => {
    expect(fromAssetProtocolUrl('https://example.com/a.png')).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(fromAssetProtocolUrl('notebook-asset://asset/%E0%A4%A')).toBeNull();
  });
});

describe('isAssetProtocolUrl', () => {
  it('detects asset protocol URLs', () => {
    expect(isAssetProtocolUrl('notebook-asset://asset/path')).toBe(true);
    expect(isAssetProtocolUrl('file:///tmp/a.png')).toBe(false);
  });
});

describe('absolutePathToRelativeAssetPath', () => {
  it('extracts assets/ relative paths', () => {
    expect(
      absolutePathToRelativeAssetPath('/tmp/workspace/docs/assets/image.png'),
    ).toBe('assets/image.png');
  });

  it('returns null when no assets segment is present', () => {
    expect(absolutePathToRelativeAssetPath('/tmp/workspace/image.png')).toBeNull();
  });
});

describe('normalizeImageSrcForSave', () => {
  it('leaves remote URLs unchanged', () => {
    expect(normalizeImageSrcForSave('https://example.com/a.png')).toBe(
      'https://example.com/a.png',
    );
  });

  it('leaves existing assets/ paths unchanged', () => {
    expect(normalizeImageSrcForSave('assets/image.png')).toBe('assets/image.png');
  });

  it('converts asset protocol URLs to assets/ paths', () => {
    const absolute = '/tmp/workspace/docs/assets/image.png';
    const url = `notebook-asset://asset/${encodeURIComponent(absolute)}`;
    expect(normalizeImageSrcForSave(url)).toBe('assets/image.png');
  });

  it('converts file URLs to assets/ paths when possible', () => {
    expect(
      normalizeImageSrcForSave('file:///tmp/workspace/docs/assets/image.png'),
    ).toBe('assets/image.png');
  });

  it('passes through non-asset absolute paths unchanged', () => {
    expect(normalizeImageSrcForSave('/tmp/other/image.png')).toBe(
      '/tmp/other/image.png',
    );
  });
});
