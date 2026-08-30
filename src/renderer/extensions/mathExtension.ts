import { BlockMath } from '@tiptap/extension-mathematics';

export const DEFAULT_MATH_LATEX = 'E = mc^2';

type BlockMathClickHandler = (
  node: { attrs: { latex: string } },
  pos: number,
) => void;

let blockMathClickHandler: BlockMathClickHandler | null = null;

export function setBlockMathClickHandler(
  handler: BlockMathClickHandler | null,
): void {
  blockMathClickHandler = handler;
}

export const MathExtension = BlockMath.configure({
  katexOptions: { throwOnError: false },
  onClick: (node, pos) => {
    blockMathClickHandler?.(node, pos);
  },
});
