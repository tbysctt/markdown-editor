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
    <div
      className="flex min-h-10 flex-wrap items-center gap-0.5 px-3 py-1.5"
      role="toolbar"
      aria-label="Formatting"
    >
      <div className="flex items-center gap-0.5">
        <TextTypeDropdown editor={editor} />
      </div>

      <div className="mx-1.5 h-6 w-px shrink-0 bg-[#dfe1e6]" aria-hidden="true" />

      <div className="flex items-center gap-0.5">
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

      <div className="mx-1.5 h-6 w-px shrink-0 bg-[#dfe1e6]" aria-hidden="true" />

      <div className="flex items-center gap-0.5">
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

      <div className="mx-1.5 h-6 w-px shrink-0 bg-[#dfe1e6]" aria-hidden="true" />

      <div className="flex items-center gap-0.5">
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
