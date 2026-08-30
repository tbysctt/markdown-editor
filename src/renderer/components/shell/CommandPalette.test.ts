import { describe, expect, it } from 'vitest';
import { filterCommandPaletteItems } from './CommandPalette';

describe('filterCommandPaletteItems', () => {
  const commands = [
    { kind: 'command' as const, id: 'save', label: 'Save File' },
    { kind: 'command' as const, id: 'open', label: 'Open Folder' },
  ];

  const files = Array.from({ length: 60 }, (_, index) => ({
    kind: 'file' as const,
    id: `file-${index}`,
    label: `file-${index}.md`,
    detail: `/workspace/docs/file-${index}.md`,
  }));

  const allItems = [...commands, ...files];

  it('returns all commands and up to 50 files when query is empty', () => {
    const result = filterCommandPaletteItems(allItems, '');
    expect(result.filter((item) => item.kind === 'command')).toHaveLength(2);
    expect(result.filter((item) => item.kind === 'file')).toHaveLength(50);
  });

  it('ranks commands before files when filtering', () => {
    const items = [
      ...commands,
      {
        kind: 'file' as const,
        id: 'save-draft',
        label: 'save-draft.md',
        detail: '/workspace/docs/save-draft.md',
      },
    ];
    const result = filterCommandPaletteItems(items, 'save');
    expect(result[0]).toEqual(commands[0]);
    expect(result.some((item) => item.kind === 'file')).toBe(true);
  });

  it('matches files using label and detail', () => {
    const result = filterCommandPaletteItems(
      [
        {
          kind: 'file',
          id: 'notes',
          label: 'notes.md',
          detail: '/workspace/projects/notes.md',
        },
      ],
      'projects',
    );

    expect(result).toHaveLength(1);
  });

  it('caps file results at 50 when many files match', () => {
    const manyMatchingFiles = Array.from({ length: 80 }, (_, index) => ({
      kind: 'file' as const,
      id: `match-${index}`,
      label: `match-${index}.md`,
      detail: `/workspace/match-${index}.md`,
    }));

    const result = filterCommandPaletteItems(
      [...commands, ...manyMatchingFiles],
      'match',
    );

    expect(result.filter((item) => item.kind === 'file')).toHaveLength(50);
  });
});
