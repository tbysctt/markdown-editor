import { useMemo, useState } from 'react';
import { cn } from '../utils/cn';
import { FileTree } from './FileTree';
import { SidebarSearch } from './SidebarSearch';
import {
  ExplorerIcon,
  FilePlusIcon,
  FolderPlusIcon,
  SearchIcon,
} from './icons/ExplorerIcons';
import type { FileTreeNode } from '../types/electron';
import type { OpenTabOptions } from '../types/workspace';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';
import { getFileName } from '../utils/markdown';
import type { WorkspaceMatch } from '../utils/workspaceSearch';

export type SidebarView = 'explorer' | 'search';

interface SidebarProps {
  rootPath: string;
  tree: FileTreeNode | null;
  view: SidebarView;
  onViewChange: (view: SidebarView) => void;
  searchFocusRequest: number;
  activeSearchMatchIndex: number;
  onActiveSearchMatchIndexChange: (index: number) => void;
  onNavigateToSearchMatch: (match: WorkspaceMatch, query: string) => void;
  activeFilePath: string | null;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onOpenFile: (filePath: string, options?: OpenTabOptions) => void;
  onNewFile: (parentDir?: string) => void;
  onNewFolder: (parentDir?: string) => void;
  onDelete: (targetPath: string, isDirectory: boolean) => void;
  onRename: (targetPath: string, isDirectory: boolean) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  node: FileTreeNode;
  isRoot: boolean;
}

const viewBtnClass =
  'inline-flex h-6 min-w-6 items-center justify-center rounded border-none bg-transparent px-1 text-gray-500 hover:bg-gray-100 hover:text-[#1a1a1a] [&_svg]:h-3.5 [&_svg]:w-3.5';

const actionBtnClass =
  'inline-flex h-6 min-w-6 items-center justify-center rounded border-none bg-transparent px-1 text-xs leading-none text-gray-600 hover:bg-gray-100 hover:text-[#1a1a1a] [&_svg]:h-3.5 [&_svg]:w-3.5';

export function Sidebar({
  rootPath,
  tree,
  view,
  onViewChange,
  searchFocusRequest,
  activeSearchMatchIndex,
  onActiveSearchMatchIndexChange,
  onNavigateToSearchMatch,
  activeFilePath,
  selectedPath,
  onSelect,
  onOpenFile,
  onNewFile,
  onNewFolder,
  onDelete,
  onRename,
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
        id: 'rename',
        label: 'Rename',
        onClick: () => onRename(node.path, isDirectory),
      });
      items.push({
        id: 'delete',
        label: 'Delete',
        danger: true,
        onClick: () => onDelete(node.path, isDirectory),
      });
    }

    return items;
  }, [contextMenu, onDelete, onNewFile, onNewFolder, onRename]);

  return (
    <aside className="flex w-[260px] shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-[#f8f9fb]">
      <div className="shrink-0 border-b border-gray-200 bg-white px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              className={cn(viewBtnClass, view === 'explorer' && 'bg-gray-200 text-[#1a1a1a]')}
              title="Explorer"
              aria-label="Explorer"
              aria-pressed={view === 'explorer'}
              onClick={() => onViewChange('explorer')}
            >
              <ExplorerIcon />
            </button>
            <button
              type="button"
              className={cn(viewBtnClass, view === 'search' && 'bg-gray-200 text-[#1a1a1a]')}
              title="Search"
              aria-label="Search"
              aria-pressed={view === 'search'}
              onClick={() => onViewChange('search')}
            >
              <SearchIcon />
            </button>
          </div>
          <span className="min-w-0 truncate text-[0.8125rem] font-semibold text-gray-700">
            {view === 'explorer' ? 'Explorer' : 'Search'}
          </span>
          {view === 'explorer' && (
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                className={actionBtnClass}
                title="New File"
                aria-label="New File"
                onClick={() => onNewFile()}
              >
                <FilePlusIcon />
              </button>
              <button
                type="button"
                className={actionBtnClass}
                title="New Folder"
                aria-label="New Folder"
                onClick={() => onNewFolder()}
              >
                <FolderPlusIcon />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {view === 'explorer' ? (
          <FileTree
            rootPath={rootPath}
            tree={tree}
            activeFilePath={activeFilePath}
            selectedPath={selectedPath}
            revealPath={selectedPath ?? activeFilePath}
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
        ) : (
          <SidebarSearch
            tree={tree}
            focusRequest={searchFocusRequest}
            activeMatchIndex={activeSearchMatchIndex}
            onActiveMatchIndexChange={onActiveSearchMatchIndexChange}
            onNavigateToMatch={onNavigateToSearchMatch}
          />
        )}
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </aside>
  );
}

export function getExplorerRenameDefaultValue(
  targetPath: string,
  isDirectory: boolean,
): string {
  const name = getFileName(targetPath);
  if (isDirectory) {
    return name;
  }
  return name;
}
