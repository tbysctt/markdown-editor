import { mergeAttributes, Node } from '@tiptap/core';
import type { MarkdownToken } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AlertView } from '../components/AlertView';
import { getAlertHeaderSpec } from '../components/icons/AlertIcons';

export const ALERT_TYPES = [
  'note',
  'tip',
  'important',
  'warning',
  'caution',
] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

const ALERT_TYPE_SET = new Set<string>(ALERT_TYPES);

const ALERT_LABELS: Record<AlertType, string> = {
  note: 'NOTE',
  tip: 'TIP',
  important: 'IMPORTANT',
  warning: 'WARNING',
  caution: 'CAUTION',
};

const FIRST_LINE_REGEX =
  /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:\n|$)/i;
const BLOCKQUOTE_LINE_REGEX = /^>\s?(.*)(?:\n|$)/;

function normalizeAlertType(type: string): AlertType | null {
  const normalized = type.toLowerCase();
  return ALERT_TYPE_SET.has(normalized) ? (normalized as AlertType) : null;
}

export interface AlertOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    alert: {
      insertAlert: (type: AlertType) => ReturnType;
    };
  }
}

export const AlertExtension = Node.create<AlertOptions>({
  name: 'alert',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'note' as AlertType,
        parseHTML: (element) =>
          normalizeAlertType(element.getAttribute('data-alert-type') ?? '') ??
          'note',
        renderHTML: (attributes) => ({
          'data-alert-type': attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'blockquote[data-alert-type]',
        contentElement: '.alert-content',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const alertType = (node.attrs.type as AlertType) || 'note';

    return [
      'blockquote',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-alert-type': alertType,
        class: `alert alert-${alertType} not-prose`,
      }),
      getAlertHeaderSpec(alertType),
      ['div', { class: 'alert-content' }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AlertView);
  },

  parseMarkdown: (token: MarkdownToken, helpers) => {
    const parseBlockChildren =
      helpers.parseBlockChildren ?? helpers.parseChildren;
    const alertType =
      normalizeAlertType(String(token.alertType ?? '')) ?? 'note';

    return helpers.createNode(
      'alert',
      { type: alertType },
      parseBlockChildren(token.tokens || []),
    );
  },

  renderMarkdown: (node, h) => {
    const alertType = (node.attrs?.type as AlertType) || 'note';
    const prefix = '>';
    const header = `${prefix} [!${ALERT_LABELS[alertType]}]`;

    if (!node.content || node.content.length === 0) {
      return header;
    }

    const result: string[] = [header];

    node.content.forEach((child, index) => {
      const childContent =
        h.renderChild?.(child, index) ?? h.renderChildren([child]);
      const lines = childContent.split('\n');

      const linesWithPrefix = lines.map((line) => {
        if (line.trim() === '') {
          return prefix;
        }

        return `${prefix} ${line}`;
      });

      result.push(linesWithPrefix.join('\n'));
    });

    return result.join('\n');
  },

  markdownTokenizer: {
    name: 'alert',
    level: 'block',
    start: (src) => src.search(/^>\s*\[!/m),
    tokenize: (src, _tokens, helpers) => {
      const firstMatch = src.match(FIRST_LINE_REGEX);
      if (!firstMatch) {
        return undefined;
      }

      const alertType = normalizeAlertType(firstMatch[1]);
      if (!alertType) {
        return undefined;
      }

      let raw = firstMatch[0];
      let remaining = src.slice(raw.length);
      const bodyLines: string[] = [];

      while (remaining.length > 0) {
        const lineMatch = remaining.match(BLOCKQUOTE_LINE_REGEX);
        if (!lineMatch) {
          break;
        }

        bodyLines.push(lineMatch[1]);
        raw += lineMatch[0];
        remaining = remaining.slice(lineMatch[0].length);
      }

      const content = bodyLines.join('\n');
      const contentTokens = content.trim()
        ? helpers.blockTokens(content)
        : [];

      return {
        type: 'alert',
        raw,
        alertType,
        tokens: contentTokens,
      };
    },
  },

  addCommands() {
    return {
      insertAlert:
        (type: AlertType) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { type },
            content: [{ type: 'paragraph' }],
          }),
    };
  },
});
