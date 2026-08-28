import type { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { ListTypeDropdown } from './ListTypeDropdown';
import { ToolbarIconButton } from './ToolbarIconButton';
import {
  CodeIcon,
  ImageIcon,
  LinkIcon,
  MathIcon,
  TableIcon,
} from './icons/ToolbarIcons';

interface ToolbarProps {
  editor: Editor;
  onInsertLink: () => void;
  onInsertTable: () => void;
  onInsertImage: () => void;
  onInsertCode: () => void;
  onInsertMath: () => void;
}

type TextType =
  | 'body'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'heading-5';

const TEXT_TYPE_OPTIONS: Array<{ value: TextType; label: string }> = [
  { value: 'body', label: 'Body text' },
  { value: 'heading-1', label: 'Heading 1' },
  { value: 'heading-2', label: 'Heading 2' },
  { value: 'heading-3', label: 'Heading 3' },
  { value: 'heading-4', label: 'Heading 4' },
  { value: 'heading-5', label: 'Heading 5' },
];

function getActiveTextType(editor: Editor): TextType {
  for (const level of [1, 2, 3, 4, 5] as const) {
    if (editor.isActive('heading', { level })) {
      return `heading-${level}` as TextType;
    }
  }
  return 'body';
}

function applyTextType(editor: Editor, textType: TextType): void {
  if (textType === 'body') {
    editor.chain().focus().setParagraph().run();
    return;
  }

  const level = Number(textType.replace('heading-', '')) as 1 | 2 | 3 | 4 | 5;
  editor.chain().focus().toggleHeading({ level }).run();
}

export function Toolbar({
  editor,
  onInsertLink,
  onInsertTable,
  onInsertImage,
  onInsertCode,
  onInsertMath,
}: ToolbarProps) {
  const [, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    editor.on('selectionUpdate', refresh);
    editor.on('transaction', refresh);
    return () => {
      editor.off('selectionUpdate', refresh);
      editor.off('transaction', refresh);
    };
  }, [editor]);

  const textType = getActiveTextType(editor);

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <div className="toolbar-group">
        <label className="toolbar-label" htmlFor="text-type">
          Text type
        </label>
        <select
          id="text-type"
          className="toolbar-select"
          value={textType}
          onChange={(event) =>
            applyTextType(editor, event.target.value as TextType)
          }
        >
          {TEXT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          type="button"
          className={editor.isActive('bold') ? 'active' : ''}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={editor.isActive('italic') ? 'active' : ''}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={editor.isActive('strike') ? 'active' : ''}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <ListTypeDropdown editor={editor} />
        <button
          type="button"
          className={editor.isActive('blockquote') ? 'active' : ''}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
        >
          “ Quote
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <ToolbarIconButton
          title="Insert link"
          onClick={onInsertLink}
          active={editor.isActive('link')}
        >
          <LinkIcon />
        </ToolbarIconButton>
        <ToolbarIconButton title="Insert table" onClick={onInsertTable}>
          <TableIcon />
        </ToolbarIconButton>
        <ToolbarIconButton title="Insert image" onClick={onInsertImage}>
          <ImageIcon />
        </ToolbarIconButton>
        <ToolbarIconButton
          title="Insert code snippet"
          onClick={onInsertCode}
          active={editor.isActive('codeBlock')}
        >
          <CodeIcon />
        </ToolbarIconButton>
        <ToolbarIconButton
          title="Insert equation"
          onClick={onInsertMath}
          active={editor.isActive('blockMath')}
        >
          <MathIcon />
        </ToolbarIconButton>
      </div>
    </div>
  );
}
