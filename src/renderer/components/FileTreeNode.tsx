import { useRef, useState } from 'react';
import type { FileTreeNode } from '../types/electron';
import type { OpenTabOptions } from '../types/workspace';
import { isMarkdownFile } from '../types/workspace';

interface FileTreeNodeRowProps {
  node: FileTreeNode;
  depth: number;
  activeFilePath: string | null;
  onOpenFile: (filePath: string, options?: OpenTabOptions) => void;
}

export function FileTreeNodeRow({
  node,
  depth,
  activeFilePath,
  onOpenFile,
}: FileTreeNodeRowProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirectory = node.type === 'directory';
  const isMarkdown = !isDirectory && isMarkdownFile(node.path);
  const isActive = !isDirectory && node.path === activeFilePath;

  const handleClick = () => {
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
        disabled={!isDirectory && !isMarkdown}
        aria-expanded={isDirectory ? expanded : undefined}
      >
        <span className="file-tree-chevron">
          {isDirectory ? (expanded ? '▾' : '▸') : ''}
        </span>
        <span className="file-tree-icon">
          {isDirectory ? '📁' : '📄'}
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
              activeFilePath={activeFilePath}
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
