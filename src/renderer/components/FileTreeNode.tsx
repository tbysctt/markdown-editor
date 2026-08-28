import { useRef, useState } from 'react';
import type { FileTreeNode } from '../types/electron';
import type { OpenTabOptions } from '../types/workspace';
import { isMarkdownFile } from '../types/workspace';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
} from './icons/ExplorerIcons';

interface FileTreeNodeRowProps {
  node: FileTreeNode;
  depth: number;
  rootPath: string;
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

export function FileTreeNodeRow({
  node,
  depth,
  rootPath,
  activeFilePath,
  selectedPath,
  onSelect,
  onOpenFile,
  onContextMenu,
}: FileTreeNodeRowProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirectory = node.type === 'directory';
  const isMarkdown = !isDirectory && isMarkdownFile(node.path);
  const isActive = !isDirectory && node.path === activeFilePath;
  const isSelected = node.path === selectedPath;
  const isRoot = node.path === rootPath;

  const handleClick = () => {
    onSelect(node.path);

    if (isDirectory) {
      setExpanded((current) => !current);
      return;
    }

    if (!isMarkdown) {
      return;
    }

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      onOpenFile(node.path, { preview: true });
    }, 250);
  };

  const handleDoubleClick = () => {
    if (isDirectory) {
      return;
    }

    if (!isMarkdown) {
      return;
    }

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    onOpenFile(node.path, { preview: false });
  };

  const classNames = [
    'file-tree-item',
    isDirectory ? 'file-tree-item--directory' : 'file-tree-item--file',
    !isDirectory && !isMarkdown ? 'file-tree-item--disabled' : '',
    isActive ? 'file-tree-item--active' : '',
    isSelected ? 'file-tree-item--selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="file-tree-node">
      <button
        type="button"
        className={classNames}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(event) => {
          event.preventDefault();
          onContextMenu(event, node, isRoot);
        }}
        aria-expanded={isDirectory ? expanded : undefined}
      >
        <span className="file-tree-chevron">
          {isDirectory ? (
            expanded ? <ChevronDownIcon /> : <ChevronRightIcon />
          ) : null}
        </span>
        <span className="file-tree-icon">
          {isDirectory ? <FolderIcon /> : <FileIcon />}
        </span>
        <span className="file-tree-name">{node.name}</span>
      </button>
      {isDirectory && expanded && node.children && (
        <div className="file-tree-children">
          {node.children.map((child) => (
            <FileTreeNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              rootPath={rootPath}
              activeFilePath={activeFilePath}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onOpenFile={onOpenFile}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
