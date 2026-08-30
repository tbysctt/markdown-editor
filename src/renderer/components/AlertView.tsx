import type { NodeViewProps } from '@tiptap/react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { AlertType } from '../extensions/alertExtension';
import {
  ALERT_DISPLAY_LABELS,
  AlertTypeIcon,
} from './icons/AlertIcons';

export function AlertView({ node }: NodeViewProps) {
  const alertType = (node.attrs.type as AlertType) || 'note';

  return (
    <NodeViewWrapper
      as="blockquote"
      className="not-prose"
      data-alert-type={alertType}
    >
      <div className="alert-header" contentEditable={false}>
        <span className="alert-icon">
          <AlertTypeIcon type={alertType} />
        </span>
        <span>{ALERT_DISPLAY_LABELS[alertType]}</span>
      </div>
      <div className="alert-content">
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}
