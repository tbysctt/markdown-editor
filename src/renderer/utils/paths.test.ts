import { describe, expect, it } from 'vitest';
import { isPathUnder, remapPath } from './paths';

describe('remapPath', () => {
  it('remaps an exact path match', () => {
    expect(remapPath('/workspace/old/file.md', '/workspace/old/file.md', '/workspace/new/file.md')).toBe(
      '/workspace/new/file.md',
    );
  });

  it('remaps child paths using forward slashes', () => {
    expect(
      remapPath('/workspace/old/nested/file.md', '/workspace/old', '/workspace/new'),
    ).toBe('/workspace/new/nested/file.md');
  });

  it('remaps child paths using backslashes', () => {
    expect(
      remapPath('C:\\workspace\\old\\nested\\file.md', 'C:\\workspace\\old', 'C:\\workspace\\new'),
    ).toBe('C:/workspace/new/nested/file.md');
  });

  it('returns the original path when unrelated', () => {
    expect(
      remapPath('/other/file.md', '/workspace/old', '/workspace/new'),
    ).toBe('/other/file.md');
  });
});

describe('isPathUnder', () => {
  it('returns true for the same path', () => {
    expect(isPathUnder('/workspace/docs', '/workspace/docs')).toBe(true);
  });

  it('returns true for nested paths', () => {
    expect(isPathUnder('/workspace/docs/readme.md', '/workspace/docs')).toBe(true);
    expect(isPathUnder('C:\\workspace\\docs\\readme.md', 'C:\\workspace\\docs')).toBe(
      true,
    );
  });

  it('returns false for unrelated paths', () => {
    expect(isPathUnder('/workspace/other.md', '/workspace/docs')).toBe(false);
  });
});
