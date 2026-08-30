import { useEffect, useRef } from 'react';
import type { FileTreeNode } from '../types/electron';
import type { OpenTabOptions } from '../types/workspace';
import { FileTreeNodeRow } from './FileTreeNode';

interface FileTreeProps {
  rootPath: string;
  tree: FileTreeNode | null;
  activeFilePath: string | null;
  selectedPath: string | null;
  revealPath: string | null;
  onSelect: (path: string) => void;
  onOpenFile: (filePath: string, options?: OpenTabOptions) => void;
  onContextMenu: (
    event: React.MouseEvent,
    node: FileTreeNode,
    isRoot: boolean,
  ) => void;
}

export function FileTree({
  rootPath,
  tree,
  activeFilePath,
  selectedPath,
  revealPath,
  onSelect,
  onOpenFile,
  onContextMenu,
}: FileTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!revealPath || !containerRef.current) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const target = containerRef.current?.querySelector(
        `[data-path="${CSS.escape(revealPath)}"]`,
      );
      target?.scrollIntoView({ block: 'nearest' });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [revealPath, tree]);

  if (!tree) {
    return <div className="px-3 py-3 text-[0.8125rem] text-gray-500">Loading…</div>;
  }

  return (
    <div ref={containerRef}>
      <FileTreeNodeRow
        node={tree}
        depth={0}
        rootPath={rootPath}
        activeFilePath={activeFilePath}
        selectedPath={selectedPath}
        revealPath={revealPath}
        onSelect={onSelect}
        onOpenFile={onOpenFile}
        onContextMenu={onContextMenu}
      />
    </div>
  );
}
