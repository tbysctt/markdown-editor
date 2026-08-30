import type { FileTreeNode } from '../../renderer/types/electron';

export function createFileTreeNode(
  overrides: Partial<FileTreeNode> & Pick<FileTreeNode, 'name' | 'path' | 'type'>,
): FileTreeNode {
  return {
    children: overrides.type === 'directory' ? overrides.children ?? [] : undefined,
    ...overrides,
  };
}

export function sampleWorkspaceTree(rootPath: string): FileTreeNode {
  return createFileTreeNode({
    name: 'workspace',
    path: rootPath,
    type: 'directory',
    children: [
      createFileTreeNode({
        name: 'notes',
        path: `${rootPath}/notes`,
        type: 'directory',
        children: [
          createFileTreeNode({
            name: 'nested.md',
            path: `${rootPath}/notes/nested.md`,
            type: 'file',
          }),
          createFileTreeNode({
            name: 'readme.txt',
            path: `${rootPath}/notes/readme.txt`,
            type: 'file',
          }),
        ],
      }),
      createFileTreeNode({
        name: 'doc.markdown',
        path: `${rootPath}/doc.markdown`,
        type: 'file',
      }),
      createFileTreeNode({
        name: 'top.md',
        path: `${rootPath}/top.md`,
        type: 'file',
      }),
    ],
  });
}
