import { useMemo, useState } from 'react';
import { FileTree } from './FileTree';
import { FilePlusIcon, FolderPlusIcon } from './icons/ExplorerIcons';
import type { FileTreeNode } from '../types/electron';
import type { OpenTabOptions } from '../types/workspace';
import {
  FileTreeContextMenu,
  type ContextMenuItem,
} from './FileTreeContextMenu';

interface SidebarProps {
  rootPath: string;
  tree: FileTreeNode | null;
  activeFilePath: string | null;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onOpenFile: (filePath: string, options?: OpenTabOptions) => void;
  onNewFile: (parentDir?: string) => void;
  onNewFolder: (parentDir?: string) => void;
  onDelete: (targetPath: string, isDirectory: boolean) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  node: FileTreeNode;
  isRoot: boolean;
}

export function Sidebar({
  rootPath,
  tree,
  activeFilePath,
  selectedPath,
  onSelect,
  onOpenFile,
  onNewFile,
  onNewFolder,
  onDelete,
}: SidebarProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const contextMenuItems = useMemo((): ContextMenuItem[] => {
    if (!contextMenu) {
      return [];
    }

    const { node, isRoot } = contextMenu;
    const isDirectory = node.type === 'directory';
    const items: ContextMenuItem[] = [];

    if (isDirectory) {
      items.push({
        id: 'new-file',
        label: 'New File',
        onClick: () => onNewFile(node.path),
      });
      items.push({
        id: 'new-folder',
        label: 'New Folder',
        onClick: () => onNewFolder(node.path),
      });
    }

    if (!isRoot) {
      items.push({
        id: 'delete',
        label: 'Delete',
        danger: true,
        onClick: () => onDelete(node.path, isDirectory),
      });
    }

    return items;
  }, [contextMenu, onDelete, onNewFile, onNewFolder]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-header-row">
          <span className="sidebar-title">Explorer</span>
          <div className="sidebar-actions">
            <button
              type="button"
              className="sidebar-action-btn"
              title="New File"
              aria-label="New File"
              onClick={() => onNewFile()}
            >
              <FilePlusIcon />
            </button>
            <button
              type="button"
              className="sidebar-action-btn"
              title="New Folder"
              aria-label="New Folder"
              onClick={() => onNewFolder()}
            >
              <FolderPlusIcon />
            </button>
          </div>
        </div>
      </div>
      <div className="sidebar-content">
        <FileTree
          rootPath={rootPath}
          tree={tree}
          activeFilePath={activeFilePath}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onOpenFile={onOpenFile}
          onContextMenu={(event, node, isRoot) => {
            onSelect(node.path);
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              node,
              isRoot,
            });
          }}
        />
      </div>
      {contextMenu && (
        <FileTreeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </aside>
  );
}
