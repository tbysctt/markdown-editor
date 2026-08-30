import { BlockMath, InlineMath } from '@tiptap/extension-mathematics';
import katex from 'katex';

export const DEFAULT_MATH_LATEX = 'E = mc^2';

type MathClickHandler = (
  node: { attrs: { latex: string } },
  pos: number,
) => void;

let mathClickHandler: MathClickHandler | null = null;

export function setMathClickHandler(handler: MathClickHandler | null): void {
  mathClickHandler = handler;
}

/** @deprecated Use setMathClickHandler */
export const setBlockMathClickHandler = setMathClickHandler;

export const BlockMathExtension = BlockMath.extend({
  addNodeView() {
    const { katexOptions } = this.options;

    return ({ node, getPos }) => {
      const wrapper = document.createElement('div');
      const innerWrapper = document.createElement('div');
      wrapper.className = 'tiptap-mathematics-render not-prose';

      if (this.editor.isEditable) {
        wrapper.classList.add('tiptap-mathematics-render--editable');
      }

      innerWrapper.className = 'block-math-inner';
      wrapper.dataset.type = 'block-math';
      wrapper.setAttribute('data-latex', node.attrs.latex);
      wrapper.appendChild(innerWrapper);

      function renderMath() {
        try {
          katex.render(node.attrs.latex, innerWrapper, katexOptions);
          wrapper.classList.remove('block-math-error');
        } catch {
          wrapper.textContent = node.attrs.latex;
          wrapper.classList.add('block-math-error');
        }
      }

      const handleClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const pos = getPos();

        if (pos == null) {
          return;
        }

        this.options.onClick?.(node, pos);
      };

      if (this.options.onClick) {
        wrapper.addEventListener('click', handleClick);
      }

      renderMath();

      return {
        dom: wrapper,
        destroy() {
          wrapper.removeEventListener('click', handleClick);
        },
      };
    };
  },
}).configure({
  katexOptions: { throwOnError: false, displayMode: true },
  onClick: (node, pos) => {
    mathClickHandler?.(node, pos);
  },
});

export const InlineMathExtension = InlineMath.extend({
  addNodeView() {
    const { katexOptions } = this.options;

    return ({ node, getPos }) => {
      const wrapper = document.createElement('span');
      wrapper.className = 'tiptap-mathematics-render not-prose';

      if (this.editor.isEditable) {
        wrapper.classList.add('tiptap-mathematics-render--editable');
      }

      wrapper.dataset.type = 'inline-math';
      wrapper.setAttribute('data-latex', node.attrs.latex);

      function renderMath() {
        try {
          katex.render(node.attrs.latex, wrapper, katexOptions);
          wrapper.classList.remove('inline-math-error');
        } catch {
          wrapper.textContent = node.attrs.latex;
          wrapper.classList.add('inline-math-error');
        }
      }

      const handleClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const pos = getPos();

        if (pos == null) {
          return;
        }

        this.options.onClick?.(node, pos);
      };

      if (this.options.onClick) {
        wrapper.addEventListener('click', handleClick);
      }

      renderMath();

      return {
        dom: wrapper,
        destroy() {
          wrapper.removeEventListener('click', handleClick);
        },
      };
    };
  },
}).configure({
  katexOptions: { throwOnError: false },
  onClick: (node, pos) => {
    mathClickHandler?.(node, pos);
  },
});
