import type { NodeViewProps } from '@tiptap/react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { cn } from '../utils/cn';
import {
  CODE_LANGUAGE_OPTIONS,
  languageToSelectValue,
  selectValueToLanguage,
} from '../utils/codeLanguages';

export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const currentValue = languageToSelectValue(node.attrs.language as string | null);
  const isPlainText = !node.attrs.language;

  return (
    <NodeViewWrapper
      className={cn(
        'code-block-wrapper not-prose mb-3 overflow-hidden rounded-md border border-gray-200 bg-[#f6f8fa]',
        isPlainText && 'code-block-plain',
      )}
      data-plain-text={isPlainText ? 'true' : undefined}
    >
      <select
        className="block w-full cursor-pointer border-none border-b border-gray-200 bg-gray-100 px-2 py-1.5 text-xs text-gray-700 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
        contentEditable={false}
        value={currentValue}
        onChange={(event) => {
          updateAttributes({
            language: selectValueToLanguage(event.target.value),
          });
        }}
        aria-label="Code language"
      >
        {CODE_LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value || 'plain'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <pre className="m-0 border-none bg-transparent px-4 py-3">
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
