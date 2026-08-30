import { describe, expect, it } from 'vitest';
import type { CommandPaletteItem } from './CommandPalette';
import { filterCommandPaletteItems } from './CommandPalette';

describe('filterCommandPaletteItems', () => {
  const commands: CommandPaletteItem[] = [
    { kind: 'command', id: 'open-document', label: 'Save File' },
    { kind: 'command', id: 'open-folder', label: 'Open Folder' },
  ];

  const files: CommandPaletteItem[] = Array.from({ length: 60 }, (_, index) => ({
    kind: 'file' as const,
    path: `/workspace/docs/file-${index}.md`,
    label: `file-${index}.md`,
    detail: `/workspace/docs/file-${index}.md`,
  }));

  const allItems: CommandPaletteItem[] = [...commands, ...files];

  it('returns all commands and up to 50 files when query is empty', () => {
    const result = filterCommandPaletteItems(allItems, '');
    expect(result.filter((item) => item.kind === 'command')).toHaveLength(2);
    expect(result.filter((item) => item.kind === 'file')).toHaveLength(50);
  });

  it('ranks commands before files when filtering', () => {
    const items: CommandPaletteItem[] = [
      ...commands,
      {
        kind: 'file',
        path: '/workspace/docs/save-draft.md',
        label: 'save-draft.md',
        detail: '/workspace/docs/save-draft.md',
      },
    ];
    const result = filterCommandPaletteItems(items, 'save');
    expect(result[0]?.kind).toBe('command');
    expect(result.some((item) => item.kind === 'file')).toBe(true);
  });

  it('matches files using label and detail', () => {
    const result = filterCommandPaletteItems(
      [
        {
          kind: 'file',
          path: '/workspace/projects/notes.md',
          label: 'notes.md',
          detail: '/workspace/projects/notes.md',
        },
      ],
      'projects',
    );

    expect(result).toHaveLength(1);
  });

  it('caps file results at 50 when many files match', () => {
    const manyMatchingFiles: CommandPaletteItem[] = Array.from({ length: 80 }, (_, index) => ({
      kind: 'file' as const,
      path: `/workspace/match-${index}.md`,
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
