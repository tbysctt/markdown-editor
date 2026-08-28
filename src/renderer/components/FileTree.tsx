import type { FileTreeNode } from '../types/electron';
import type { OpenTabOptions } from '../types/workspace';
import { FileTreeNodeRow } from './FileTreeNode';

interface FileTreeProps {
  tree: FileTreeNode | null;
  activeFilePath: string | null;
  onOpenFile: (filePath: string, options?: OpenTabOptions) => void;
}

export function FileTree({ tree, activeFilePath, onOpenFile }: FileTreeProps) {
  if (!tree) {
    return <div className="file-tree-loading">Loading…</div>;
  }

  return (
    <div className="file-tree">
      <FileTreeNodeRow
        node={tree}
        depth={0}
        activeFilePath={activeFilePath}
        onOpenFile={onOpenFile}
      />
    </div>
  );
}
