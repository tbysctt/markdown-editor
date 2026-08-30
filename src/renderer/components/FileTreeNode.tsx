import { useEffect, useRef, useState } from 'react';
import type { FileTreeNode } from '../types/electron';
import type { OpenTabOptions } from '../types/workspace';
import { isMarkdownFile } from '../types/workspace';
import { cn } from '../utils/cn';
import { isPathWithinDirectory } from '../utils/explorer';
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
  revealPath: string | null;
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
  revealPath,
  onSelect,
  onOpenFile,
  onContextMenu,
}: FileTreeNodeRowProps) {
  const isDirectory = node.type === 'directory';
  const containsReveal = Boolean(
    isDirectory && revealPath && isPathWithinDirectory(node.path, revealPath),
  );
  const [expanded, setExpanded] = useState(depth === 0 || containsReveal);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMarkdown = !isDirectory && isMarkdownFile(node.path);
  const isInteractive = isDirectory || isMarkdown;
  const isActive = isMarkdown && node.path === activeFilePath;
  const isSelected = isInteractive && node.path === selectedPath;
  const isRoot = node.path === rootPath;

  useEffect(() => {
    if (containsReveal) {
      setExpanded(true);
    }
  }, [containsReveal]);

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

  return (
    <div>
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-1 rounded-none border-none bg-transparent py-1 pr-2 text-left text-[0.8125rem]',
          isInteractive
            ? 'cursor-pointer text-gray-700 hover:bg-[#eef2f7]'
            : 'cursor-default text-gray-400',
          isActive && 'bg-blue-100 text-blue-700',
          isSelected && !isActive && 'bg-gray-200',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        data-path={node.path}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(event) => {
          event.preventDefault();
          onContextMenu(event, node, isRoot);
        }}
        aria-expanded={isDirectory ? expanded : undefined}
      >
        <span
          className={cn(
            'w-3 shrink-0 [&_svg]:block [&_svg]:h-3 [&_svg]:w-3',
            isInteractive ? 'text-gray-500' : 'text-gray-400',
          )}
        >
          {isDirectory ? (
            expanded ? <ChevronDownIcon /> : <ChevronRightIcon />
          ) : null}
        </span>
        <span
          className={cn(
            'shrink-0 [&_svg]:block [&_svg]:h-3.5 [&_svg]:w-3.5',
            isInteractive ? 'text-inherit' : 'text-gray-400',
          )}
        >
          {isDirectory ? <FolderIcon /> : <FileIcon />}
        </span>
        <span className="truncate">{node.name}</span>
      </button>
      {isDirectory && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              rootPath={rootPath}
              activeFilePath={activeFilePath}
              selectedPath={selectedPath}
              revealPath={revealPath}
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
