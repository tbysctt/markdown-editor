import type { FileTreeNode } from '../types/electron';
import { isMarkdownFile } from '../types/workspace';

export interface WorkspaceMatch {
  filePath: string;
  line: number;
  column: number;
  lineText: string;
  matchStart: number;
  matchEnd: number;
  indexInFile: number;
}

export interface WorkspaceSearchResult {
  matches: WorkspaceMatch[];
  fileCount: number;
}

export function collectMarkdownFiles(tree: FileTreeNode | null): string[] {
  if (!tree) {
    return [];
  }

  const files: string[] = [];

  const walk = (node: FileTreeNode): void => {
    if (node.type === 'file') {
      if (isMarkdownFile(node.path)) {
        files.push(node.path);
      }
      return;
    }

    for (const child of node.children ?? []) {
      walk(child);
    }
  };

  walk(tree);
  return files;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findInText(
  content: string,
  query: string,
  caseSensitive: boolean,
): Omit<WorkspaceMatch, 'filePath'>[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const flags = caseSensitive ? 'g' : 'gi';
  const pattern = new RegExp(escapeRegExp(trimmed), flags);
  const matches: Omit<WorkspaceMatch, 'filePath'>[] = [];
  const lines = content.split('\n');
  let indexInFile = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineText = lines[lineIndex];
    pattern.lastIndex = 0;
    let match = pattern.exec(lineText);

    while (match) {
      matches.push({
        line: lineIndex + 1,
        column: match.index + 1,
        lineText,
        matchStart: match.index,
        matchEnd: match.index + match[0].length,
        indexInFile,
      });
      indexInFile += 1;
      match = pattern.exec(lineText);
    }
  }

  return matches;
}

export async function searchWorkspace(
  files: string[],
  query: string,
  readFile: (path: string) => Promise<string>,
  caseSensitive: boolean,
  signal?: { generation: number },
  onGeneration?: () => number,
): Promise<WorkspaceSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { matches: [], fileCount: 0 };
  }

  const generation = signal?.generation ?? 0;
  const allMatches: WorkspaceMatch[] = [];
  const filesWithMatches = new Set<string>();

  for (const filePath of files) {
    if (onGeneration && onGeneration() !== generation) {
      return { matches: [], fileCount: 0 };
    }

    try {
      const content = await readFile(filePath);
      const fileMatches = findInText(content, trimmed, caseSensitive);

      for (const match of fileMatches) {
        allMatches.push({ ...match, filePath });
        filesWithMatches.add(filePath);
      }
    } catch {
      // Skip unreadable or deleted files.
    }
  }

  if (onGeneration && onGeneration() !== generation) {
    return { matches: [], fileCount: 0 };
  }

  return {
    matches: allMatches,
    fileCount: filesWithMatches.size,
  };
}

export interface WorkspaceMatchGroup {
  filePath: string;
  matches: WorkspaceMatch[];
}

export function groupMatchesByFile(
  matches: WorkspaceMatch[],
): WorkspaceMatchGroup[] {
  const groups = new Map<string, WorkspaceMatch[]>();

  for (const match of matches) {
    const existing = groups.get(match.filePath);
    if (existing) {
      existing.push(match);
    } else {
      groups.set(match.filePath, [match]);
    }
  }

  return [...groups.entries()].map(([filePath, fileMatches]) => ({
    filePath,
    matches: fileMatches,
  }));
}

export function getFlatMatchIndex(
  matches: WorkspaceMatch[],
  match: WorkspaceMatch,
): number {
  return matches.findIndex(
    (candidate) =>
      candidate.filePath === match.filePath &&
      candidate.line === match.line &&
      candidate.column === match.column &&
      candidate.matchStart === match.matchStart,
  );
}
