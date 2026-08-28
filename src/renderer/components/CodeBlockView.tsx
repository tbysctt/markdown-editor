import type { NodeViewProps } from '@tiptap/react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
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
      className={`code-block-wrapper${isPlainText ? ' code-block-plain' : ''}`}
      data-plain-text={isPlainText ? 'true' : undefined}
    >
      <select
        className="code-block-language-select"
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
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
