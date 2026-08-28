import { findChildren } from '@tiptap/core';
import type { Node as ProsemirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
// @ts-expect-error highlight.js core has no types in this import path
import highlight from 'highlight.js/lib/core';

function parseNodes(
  nodes: Array<{ value?: string; children?: unknown[]; properties?: { className?: string[] } }>,
  className: string[] = [],
): Array<{ text: string; classes: string[] }> {
  return nodes.flatMap((node) => {
    const classes = [
      ...className,
      ...(node.properties?.className ?? []),
    ];

    if (node.children) {
      return parseNodes(
        node.children as Array<{
          value?: string;
          children?: unknown[];
          properties?: { className?: string[] };
        }>,
        classes,
      );
    }

    return {
      text: node.value ?? '',
      classes,
    };
  });
}

function getHighlightNodes(result: {
  value?: unknown[];
  children?: unknown[];
}) {
  return result.value || result.children || [];
}

function registered(aliasOrLanguage: string) {
  return Boolean(highlight.getLanguage(aliasOrLanguage));
}

function codeBlockSignature(
  doc: ProsemirrorNode,
  name: string,
): string {
  return findChildren(doc, (node) => node.type.name === name)
    .map(
      (block) =>
        `${block.node.attrs.language ?? ''}:${block.node.textContent}`,
    )
    .join('|');
}

function getDecorations({
  doc,
  name,
  lowlight,
  defaultLanguage,
}: {
  doc: ProsemirrorNode;
  name: string;
  lowlight: {
    highlight: (language: string, value: string) => unknown;
    listLanguages: () => string[];
    registered?: (language: string) => boolean;
  };
  defaultLanguage: string | null | undefined;
}) {
  const decorations: Decoration[] = [];

  findChildren(doc, (node) => node.type.name === name).forEach((block) => {
    const language = block.node.attrs.language || defaultLanguage;

    if (!language) {
      return;
    }

    let from = block.pos + 1;
    const languages = lowlight.listLanguages();

    const nodes =
      languages.includes(language) ||
      registered(language) ||
      lowlight.registered?.(language)
        ? getHighlightNodes(
            lowlight.highlight(language, block.node.textContent) as {
              value?: unknown[];
              children?: unknown[];
            },
          )
        : [];

    parseNodes(
      nodes as Array<{
        value?: string;
        children?: unknown[];
        properties?: { className?: string[] };
      }>,
    ).forEach((node) => {
      const to = from + node.text.length;

      if (node.classes.length) {
        decorations.push(
          Decoration.inline(from, to, {
            class: node.classes.join(' '),
          }),
        );
      }

      from = to;
    });
  });

  return DecorationSet.create(doc, decorations);
}

export function PlainTextAwareLowlightPlugin({
  name,
  lowlight,
  defaultLanguage,
}: {
  name: string;
  lowlight: {
    highlight: (language: string, value: string) => unknown;
    listLanguages: () => string[];
    registered?: (language: string) => boolean;
  };
  defaultLanguage: string | null | undefined;
}) {
  const lowlightPlugin = new Plugin({
    key: new PluginKey('lowlight'),

    state: {
      init: (_, { doc }) =>
        getDecorations({ doc, name, lowlight, defaultLanguage }),
      apply: (transaction, decorationSet, oldState, newState) => {
        const oldNodeName = oldState.selection.$head.parent.type.name;
        const newNodeName = newState.selection.$head.parent.type.name;
        const oldNodes = findChildren(oldState.doc, (node) => node.type.name === name);
        const newNodes = findChildren(newState.doc, (node) => node.type.name === name);

        const oldSignature = codeBlockSignature(oldState.doc, name);
        const newSignature = codeBlockSignature(newState.doc, name);

        if (
          transaction.docChanged &&
          (oldSignature !== newSignature ||
            [oldNodeName, newNodeName].includes(name) ||
            newNodes.length !== oldNodes.length ||
            transaction.steps.some((step) => {
              return (
                'from' in step &&
                'to' in step &&
                oldNodes.some((node) => {
                  const from = step.from as number;
                  const to = step.to as number;
                  return (
                    node.pos >= from &&
                    node.pos + node.node.nodeSize <= to
                  );
                })
              );
            }))
        ) {
          return getDecorations({
            doc: transaction.doc,
            name,
            lowlight,
            defaultLanguage,
          });
        }

        return decorationSet.map(transaction.mapping, transaction.doc);
      },
    },

    props: {
      decorations(state) {
        return lowlightPlugin.getState(state);
      },
    },
  });

  return lowlightPlugin;
}
