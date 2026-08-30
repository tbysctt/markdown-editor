import { FindAndReplace } from '@tiptap/extension-find-and-replace';
import { StarterKit } from '@tiptap/starter-kit';
import { ImageExtension } from '../extensions/imageExtension';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { TableKit } from '@tiptap/extension-table';
import { CharacterCount } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import type { Extensions } from '@tiptap/react';
import { AlertExtension } from '../extensions/alertExtension';
import { CodeBlockExtension } from '../extensions/codeBlockExtension';
import {
  BlockMathExtension,
  InlineMathExtension,
} from '../extensions/mathExtension';

export function createEditorExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      codeBlock: false,
      code: {
        HTMLAttributes: { class: 'not-prose' },
      },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      },
    }),
    CodeBlockExtension,
    BlockMathExtension,
    InlineMathExtension,
    AlertExtension,
    ImageExtension,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    TableKit.configure({
      table: { resizable: true },
    }),
    CharacterCount,
    Markdown,
    FindAndReplace.configure({
      injectCSS: true,
      searchDebounceMs: 150,
    }),
  ];
}
