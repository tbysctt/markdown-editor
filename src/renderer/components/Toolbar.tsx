import type { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { AlertTypeDropdown } from './AlertTypeDropdown';
import { ListTypeDropdown } from './ListTypeDropdown';
import { TextTypeDropdown } from './TextTypeDropdown';
import { ToolbarIconButton } from './ToolbarIconButton';
import {
  BoldIcon,
  CodeIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  MathIcon,
  QuoteIcon,
  StrikethroughIcon,
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

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <div className="toolbar-group">
        <TextTypeDropdown editor={editor} />
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group">
        <ToolbarIconButton
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <BoldIcon />
        </ToolbarIconButton>
        <ToolbarIconButton
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <ItalicIcon />
        </ToolbarIconButton>
        <ToolbarIconButton
          title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
        >
          <StrikethroughIcon />
        </ToolbarIconButton>
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

      <div className="toolbar-group">
        <ListTypeDropdown editor={editor} />
        <ToolbarIconButton
          title="Quote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
        >
          <QuoteIcon />
        </ToolbarIconButton>
        <AlertTypeDropdown editor={editor} />
      </div>

      <div className="toolbar-divider" aria-hidden="true" />

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
