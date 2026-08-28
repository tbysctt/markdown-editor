import { FindAndReplace } from '@tiptap/extension-find-and-replace';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TableKit } from '@tiptap/extension-table';
import { CharacterCount } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import type { Extensions } from '@tiptap/react';
import { CodeBlockExtension } from '../extensions/codeBlockExtension';

export function createEditorExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5] },
      codeBlock: false,
    }),
    CodeBlockExtension,
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
    }),
    Image.configure({
      inline: false,
      allowBase64: false,
    }),
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
