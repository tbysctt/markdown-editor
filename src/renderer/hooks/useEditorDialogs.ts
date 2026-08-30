import { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { applyLink as applyLinkCommand } from '../editor/formatCommands';

export function useEditorDialogs() {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showMathDialog, setShowMathDialog] = useState(false);
  const [mathEditPos, setMathEditPos] = useState<number | null>(null);
  const [mathInitialLatex, setMathInitialLatex] = useState('');
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showFindBar, setShowFindBar] = useState(false);
  const [findBarQuery, setFindBarQuery] = useState<string | undefined>();
  const [findBarMatchIndex, setFindBarMatchIndex] = useState<number | undefined>();
  const [findBarRequestId, setFindBarRequestId] = useState(0);

  const openFindBar = useCallback((query?: string, matchIndex?: number) => {
    setFindBarQuery(query);
    setFindBarMatchIndex(matchIndex);
    setFindBarRequestId((current) => current + 1);
    setShowFindBar(true);
  }, []);

  const closeFindBar = useCallback(() => {
    setShowFindBar(false);
    setFindBarQuery(undefined);
    setFindBarMatchIndex(undefined);
  }, []);

  const openMathEditor = useCallback((latex: string, pos: number) => {
    setMathInitialLatex(latex);
    setMathEditPos(pos);
    setShowMathDialog(true);
  }, []);

  const closeMathEditor = useCallback(() => {
    setShowMathDialog(false);
    setMathEditPos(null);
    setMathInitialLatex('');
  }, []);

  const applyLink = useCallback((editor: Editor | null, url: string) => {
    if (!editor) {
      return;
    }
    applyLinkCommand(editor, url);
    setShowLinkDialog(false);
  }, []);

  const applyMath = useCallback(
    (editor: Editor | null, latex: string) => {
      if (!editor || mathEditPos === null) {
        return;
      }

      const node = editor.state.doc.nodeAt(mathEditPos);
      if (!node) {
        return;
      }

      const chain = editor.chain().setNodeSelection(mathEditPos);
      if (node.type.name === 'inlineMath') {
        chain.updateInlineMath({ latex });
      } else {
        chain.updateBlockMath({ latex });
      }
      chain.focus().run();

      closeMathEditor();
    },
    [closeMathEditor, mathEditPos],
  );

  const handleInsertTable = useCallback(
    (editor: Editor | null, rows: number, cols: number) => {
      editor
        ?.chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
      setShowTableDialog(false);
    },
    [],
  );

  return {
    showLinkDialog,
    setShowLinkDialog,
    showMathDialog,
    showTableDialog,
    setShowTableDialog,
    showFindBar,
    findBarQuery,
    findBarMatchIndex,
    findBarRequestId,
    mathInitialLatex,
    openFindBar,
    closeFindBar,
    openMathEditor,
    closeMathEditor,
    applyLink,
    applyMath,
    handleInsertTable,
  };
}
