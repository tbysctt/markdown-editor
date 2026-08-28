import type { FileTreeNode } from '../types/electron';
import type { OpenTabOptions } from '../types/workspace';
import { FileTreeNodeRow } from './FileTreeNode';

interface FileTreeProps {
  rootPath: string;
  tree: FileTreeNode | null;
  activeFilePath: string | null;
  selectedPath: string | null;
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
  onSelect,
  onOpenFile,
  onContextMenu,
}: FileTreeProps) {
  if (!tree) {
    return <div className="file-tree-loading">Loading…</div>;
  }

  return (
    <div className="file-tree">
      <FileTreeNodeRow
        node={tree}
        depth={0}
        rootPath={rootPath}
        activeFilePath={activeFilePath}
        selectedPath={selectedPath}
        onSelect={onSelect}
        onOpenFile={onOpenFile}
        onContextMenu={onContextMenu}
      />
    </div>
  );
}
