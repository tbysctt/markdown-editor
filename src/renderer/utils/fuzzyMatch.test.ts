import { describe, expect, it } from 'vitest';
import { fuzzyScore, rankByFuzzyMatch } from './fuzzyMatch';

describe('fuzzyScore', () => {
  it('returns 0 for an empty query', () => {
    expect(fuzzyScore('', 'Some Label')).toBe(0);
  });

  it('returns null when query characters are not a subsequence', () => {
    expect(fuzzyScore('xyz', 'alpha')).toBeNull();
  });

  it('adds a prefix bonus when text starts with the query', () => {
    const prefixScore = fuzzyScore('save', 'save file');
    const middleScore = fuzzyScore('save', 'the save file');
    expect(prefixScore).not.toBeNull();
    expect(middleScore).not.toBeNull();
    if (prefixScore === null || middleScore === null) {
      return;
    }
    expect(prefixScore).toBeGreaterThan(middleScore);
  });

  it('scores consecutive matches higher than scattered matches', () => {
    const consecutive = fuzzyScore('abc', 'xxabcyy');
    const scattered = fuzzyScore('abc', 'axbxc');
    expect(consecutive).not.toBeNull();
    expect(scattered).not.toBeNull();
    if (consecutive === null || scattered === null) {
      return;
    }
    expect(consecutive).toBeGreaterThan(scattered);
  });

  it('adds word-boundary bonuses after separators', () => {
    const slashBoundary = fuzzyScore('doc', 'notes/doc/file.md');
    const plain = fuzzyScore('doc', 'xdocy');
    expect(slashBoundary).not.toBeNull();
    expect(plain).not.toBeNull();
    if (slashBoundary === null || plain === null) {
      return;
    }
    expect(slashBoundary).toBeGreaterThan(plain);
  });

  it('is case insensitive', () => {
    expect(fuzzyScore('SAVE', 'save file')).toBe(fuzzyScore('save', 'Save File'));
  });
});

describe('rankByFuzzyMatch', () => {
  const items = [
    { id: 'a', label: 'Save File' },
    { id: 'b', label: 'Open Folder' },
    { id: 'c', label: 'Save As' },
  ];

  it('returns all items when query is empty', () => {
    expect(rankByFuzzyMatch(items, '', (item) => item.label)).toHaveLength(3);
  });

  it('filters out non-matching items', () => {
    const ranked = rankByFuzzyMatch(items, 'folder', (item) => item.label);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].id).toBe('b');
  });

  it('sorts higher-scoring items first', () => {
    const ranked = rankByFuzzyMatch(items, 'save', (item) => item.label);
    expect(ranked.map((item) => item.id)).toEqual(['a', 'c']);
  });
});
