import { BlockMath, InlineMath } from '@tiptap/extension-mathematics';
import type { Editor } from '@tiptap/react';
import katex from 'katex';

export const DEFAULT_MATH_LATEX = 'E = mc^2';

type MathClickHandler = (
  node: { attrs: { latex: string } },
  pos: number,
) => void;

const mathClickHandlers = new WeakMap<Editor, MathClickHandler>();

export function setMathClickHandlerForEditor(
  editor: Editor,
  handler: MathClickHandler | null,
): void {
  if (handler) {
    mathClickHandlers.set(editor, handler);
  } else {
    mathClickHandlers.delete(editor);
  }
}

function createMathNodeView(options: {
  tag: 'div' | 'span';
  innerClass?: string;
  dataType: 'block-math' | 'inline-math';
  errorClass: string;
  katexOptions: Record<string, unknown>;
  editor: Editor;
  onClickEnabled: boolean;
}) {
  const {
    tag,
    innerClass,
    dataType,
    errorClass,
    katexOptions,
    editor,
    onClickEnabled,
  } = options;

  return ({
    node,
    getPos,
  }: {
    node: { attrs: { latex: string } };
    getPos: () => number | undefined;
  }) => {
    const wrapper = document.createElement(tag);
    const renderTarget =
      tag === 'div' ? document.createElement('div') : wrapper;

    wrapper.className = 'tiptap-mathematics-render not-prose';

    if (editor.isEditable) {
      wrapper.classList.add('tiptap-mathematics-render--editable');
    }

    if (innerClass) {
      renderTarget.className = innerClass;
    }

    wrapper.dataset.type = dataType;
    wrapper.setAttribute('data-latex', node.attrs.latex);

    if (tag === 'div') {
      wrapper.appendChild(renderTarget);
    }

    function renderMath() {
      try {
        katex.render(node.attrs.latex, renderTarget, katexOptions);
        wrapper.classList.remove(errorClass);
      } catch {
        wrapper.textContent = node.attrs.latex;
        wrapper.classList.add(errorClass);
      }
    }

    const handleClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const pos = getPos();

      if (pos == null) {
        return;
      }

      mathClickHandlers.get(editor)?.(node, pos);
    };

    if (onClickEnabled) {
      wrapper.addEventListener('click', handleClick);
    }

    renderMath();

    return {
      dom: wrapper,
      destroy() {
        if (onClickEnabled) {
          wrapper.removeEventListener('click', handleClick);
        }
      },
    };
  };
}

export const BlockMathExtension = BlockMath.extend({
  addNodeView() {
    const { katexOptions } = this.options;

    return createMathNodeView({
      tag: 'div',
      innerClass: 'block-math-inner',
      dataType: 'block-math',
      errorClass: 'block-math-error',
      katexOptions: { ...katexOptions, displayMode: true },
      editor: this.editor,
      onClickEnabled: this.editor.isEditable,
    });
  },
}).configure({
  katexOptions: { throwOnError: false, displayMode: true },
});

export const InlineMathExtension = InlineMath.extend({
  addNodeView() {
    const { katexOptions } = this.options;

    return createMathNodeView({
      tag: 'span',
      dataType: 'inline-math',
      errorClass: 'inline-math-error',
      katexOptions,
      editor: this.editor,
      onClickEnabled: this.editor.isEditable,
    });
  },
}).configure({
  katexOptions: { throwOnError: false },
});

/** @deprecated Use setMathClickHandlerForEditor */
export function setMathClickHandler(handler: MathClickHandler | null): void {
  void handler;
}

/** @deprecated Use setMathClickHandlerForEditor */
export const setBlockMathClickHandler = setMathClickHandler;
