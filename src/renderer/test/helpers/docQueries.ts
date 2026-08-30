import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface DocNodeMatch {
  node: ProseMirrorNode;
  pos: number;
}

export function findNodes(doc: ProseMirrorNode, typeName: string): DocNodeMatch[] {
  const matches: DocNodeMatch[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name === typeName) {
      matches.push({ node, pos });
    }
  });

  return matches;
}

export function countNodes(doc: ProseMirrorNode, typeName: string): number {
  return findNodes(doc, typeName).length;
}

export function getNodeAt(
  doc: ProseMirrorNode,
  typeName: string,
  index = 0,
): ProseMirrorNode | null {
  return findNodes(doc, typeName)[index]?.node ?? null;
}

export function getTextContent(doc: ProseMirrorNode): string {
  return doc.textContent;
}

export function getMarksForText(
  doc: ProseMirrorNode,
  textSnippet: string,
): string[] {
  const marks = new Set<string>();

  doc.descendants((node) => {
    if (!node.isText || !node.text?.includes(textSnippet)) {
      return;
    }

    node.marks.forEach((mark) => marks.add(mark.type.name));
  });

  return [...marks];
}

export function getLinkHref(
  doc: ProseMirrorNode,
  textSnippet: string,
): string | null {
  let href: string | null = null;

  doc.descendants((node) => {
    if (!node.isText || !node.text?.includes(textSnippet)) {
      return;
    }

    const linkMark = node.marks.find((mark) => mark.type.name === 'link');
    if (linkMark) {
      href = (linkMark.attrs.href as string) ?? null;
    }
  });

  return href;
}
