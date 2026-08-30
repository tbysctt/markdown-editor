import type { MenuAction } from '../../ipc/channels';
import type { Editor } from '@tiptap/react';
import { getFileName } from '../utils/markdown';
import { getPrintableHtml } from '../utils/print';
import {
  setParagraph,
  toggleBlockquote,
  toggleBold,
  toggleBulletList,
  toggleHeading,
  toggleItalic,
  toggleOrderedList,
  toggleStrike,
  toggleTaskList,
} from './formatCommands';

export interface FormatInsertHandlers {
  onInsertLink: () => void;
  onInsertTable: () => void;
  onInsertImage: () => void;
  onInsertCode: () => void;
  onInsertMath: () => void;
}

export function applyFormatMenuAction(
  action: MenuAction,
  editor: Editor,
  filePath: string,
  handlers: FormatInsertHandlers,
): boolean {
  switch (action) {
    case 'export-pdf': {
      const baseName = getFileName(filePath).replace(/\.md$/i, '') || 'Untitled';
      void window.electronAPI.exportPdf({
        html: getPrintableHtml(editor),
        defaultFileName: `${baseName}.pdf`,
      });
      return true;
    }
    case 'print':
      void window.electronAPI.printDocument({
        html: getPrintableHtml(editor),
      });
      return true;
    case 'format-bold':
      toggleBold(editor);
      return true;
    case 'format-italic':
      toggleItalic(editor);
      return true;
    case 'format-strikethrough':
      toggleStrike(editor);
      return true;
    case 'format-heading-1':
      toggleHeading(editor, 1);
      return true;
    case 'format-heading-2':
      toggleHeading(editor, 2);
      return true;
    case 'format-heading-3':
      toggleHeading(editor, 3);
      return true;
    case 'format-heading-4':
      toggleHeading(editor, 4);
      return true;
    case 'format-heading-5':
      toggleHeading(editor, 5);
      return true;
    case 'format-heading-6':
      toggleHeading(editor, 6);
      return true;
    case 'format-body':
      setParagraph(editor);
      return true;
    case 'format-bullet-list':
      toggleBulletList(editor);
      return true;
    case 'format-ordered-list':
      toggleOrderedList(editor);
      return true;
    case 'format-task-list':
      toggleTaskList(editor);
      return true;
    case 'format-blockquote':
      toggleBlockquote(editor);
      return true;
    case 'format-link':
      handlers.onInsertLink();
      return true;
    case 'format-table':
      handlers.onInsertTable();
      return true;
    case 'format-image':
      handlers.onInsertImage();
      return true;
    case 'format-code-snippet':
      handlers.onInsertCode();
      return true;
    case 'format-math':
      handlers.onInsertMath();
      return true;
    default:
      return false;
  }
}

export const EDITOR_FORMAT_ACTIONS: MenuAction[] = [
  'export-pdf',
  'print',
  'format-bold',
  'format-italic',
  'format-strikethrough',
  'format-heading-1',
  'format-heading-2',
  'format-heading-3',
  'format-heading-4',
  'format-heading-5',
  'format-heading-6',
  'format-body',
  'format-bullet-list',
  'format-ordered-list',
  'format-task-list',
  'format-blockquote',
  'format-link',
  'format-table',
  'format-image',
  'format-code-snippet',
  'format-math',
];

export const EDITOR_VIEW_ACTIONS: MenuAction[] = [
  'find',
  'find-in-workspace',
  'zoom-in',
  'zoom-out',
  'zoom-reset',
];

export const DOCUMENT_SAVE_ACTIONS: MenuAction[] = [
  'save',
  'save-as',
  'save-and-close',
  'close',
];
