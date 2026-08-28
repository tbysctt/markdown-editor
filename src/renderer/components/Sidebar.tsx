import { getFileName } from '../utils/markdown';
import { FileTree } from './FileTree';
import type { FileTreeNode } from '../types/electron';
import type { OpenTabOptions } from '../types/workspace';

interface SidebarProps {
  rootPath: string;
  tree: FileTreeNode | null;
  activeFilePath: string | null;
  onOpenFile: (filePath: string, options?: OpenTabOptions) => void;
}

export function Sidebar({
  rootPath,
  tree,
  activeFilePath,
  onOpenFile,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">{getFileName(rootPath)}</span>
      </div>
      <div className="sidebar-content">
        <FileTree
          tree={tree}
          activeFilePath={activeFilePath}
          onOpenFile={onOpenFile}
        />
      </div>
    </aside>
  );
}
