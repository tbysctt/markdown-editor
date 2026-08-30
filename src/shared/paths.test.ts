import { describe, expect, it } from 'vitest';
import {
  assertPathInsideRoot,
  isAllowedAssetAbsolutePath,
  resolveDocumentAssetPath,
  resolvePathUnderRoot,
} from './paths';

describe('assertPathInsideRoot', () => {
  it('allows paths inside the root', () => {
    expect(() =>
      assertPathInsideRoot('/tmp/workspace', '/tmp/workspace/docs/file.md'),
    ).not.toThrow();
  });

  it('allows the root path itself', () => {
    expect(() =>
      assertPathInsideRoot('/tmp/workspace', '/tmp/workspace'),
    ).not.toThrow();
  });

  it('rejects path traversal outside the root', () => {
    expect(() =>
      assertPathInsideRoot('/tmp/workspace', '/tmp/other/file.md'),
    ).toThrow('Path is outside the allowed root');
  });

  it('rejects parent traversal via relative segments', () => {
    expect(() =>
      assertPathInsideRoot('/tmp/workspace', '/tmp/workspace/../escape'),
    ).toThrow('Path is outside the allowed root');
  });
});

describe('resolvePathUnderRoot', () => {
  it('resolves relative paths under the root', () => {
    expect(resolvePathUnderRoot('/tmp/workspace', 'docs/file.md')).toBe(
      '/tmp/workspace/docs/file.md',
    );
  });

  it('throws when resolved path escapes the root', () => {
    expect(() => resolvePathUnderRoot('/tmp/workspace', '../../etc/passwd')).toThrow(
      'Path is outside the allowed root',
    );
  });
});

describe('resolveDocumentAssetPath', () => {
  const docPath = '/tmp/workspace/docs/readme.md';

  it('resolves asset paths relative to the document directory', () => {
    expect(resolveDocumentAssetPath(docPath, 'assets/image.png')).toBe(
      '/tmp/workspace/docs/assets/image.png',
    );
  });

  it('rejects absolute asset paths', () => {
    expect(() =>
      resolveDocumentAssetPath(docPath, '/etc/passwd'),
    ).toThrow('Invalid asset path');
  });

  it('rejects empty asset paths', () => {
    expect(() => resolveDocumentAssetPath(docPath, '')).toThrow(
      'Invalid asset path',
    );
  });

  it('rejects traversal segments in asset paths', () => {
    expect(() =>
      resolveDocumentAssetPath(docPath, '../secrets/key.pem'),
    ).toThrow('Asset path traversal is not allowed');
  });

  it('rejects resolved paths outside the document directory', () => {
    expect(() =>
      resolveDocumentAssetPath(docPath, '../../outside.png'),
    ).toThrow('Asset path traversal is not allowed');
  });
});

describe('isAllowedAssetAbsolutePath', () => {
  it('returns true when path is under an allowed root', () => {
    expect(
      isAllowedAssetAbsolutePath('/tmp/workspace/assets/a.png', ['/tmp/workspace']),
    ).toBe(true);
  });

  it('returns true when path equals an allowed root', () => {
    expect(
      isAllowedAssetAbsolutePath('/tmp/workspace', ['/tmp/workspace']),
    ).toBe(true);
  });

  it('returns true when path matches any of multiple roots', () => {
    expect(
      isAllowedAssetAbsolutePath('/home/user/assets/a.png', [
        '/tmp/workspace',
        '/home/user',
      ]),
    ).toBe(true);
  });

  it('returns false when path is outside all allowed roots', () => {
    expect(
      isAllowedAssetAbsolutePath('/var/data/image.png', [
        '/tmp/workspace',
        '/home/user',
      ]),
    ).toBe(false);
  });
});
