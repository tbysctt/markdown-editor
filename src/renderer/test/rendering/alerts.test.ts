import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import {
  ALERT_TYPES,
  type AlertType,
} from '../../extensions/alertExtension';
import { ALERTS } from '../fixtures/rendering';
import {
  createTestEditor,
  destroyEditor,
} from '../helpers/createTestEditor';
import { countNodes, getNodeAt, getTextContent } from '../helpers/docQueries';
import { parseHtml, queryOne, textContentOf } from '../helpers/htmlQueries';

const ALERT_LABELS: Record<AlertType, string> = {
  note: 'NOTE',
  tip: 'TIP',
  important: 'IMPORTANT',
  warning: 'WARNING',
  caution: 'CAUTION',
};

describe('alert rendering', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    destroyEditor(editor);
    editor = undefined;
  });

  it.each(ALERT_TYPES)('renders %s alerts', (type) => {
    const markdown = ALERTS[type];
    editor = createTestEditor(markdown);
    const doc = editor.state.doc;
    const alertNode = getNodeAt(doc, 'alert');

    expect(countNodes(doc, 'alert')).toBe(1);
    expect(alertNode?.attrs.type).toBe(type);

    const html = parseHtml(editor.getHTML());
    const blockquote = queryOne(html, `blockquote[data-alert-type="${type}"]`);
    expect(blockquote).not.toBeNull();
    expect(textContentOf(html, '.alert-content')).toContain('This is');

    const exported = editor.getMarkdown();
    expect(exported).toContain(`> [!${ALERT_LABELS[type]}]`);
  });

  it('renders multi-line alert bodies', () => {
    editor = createTestEditor(ALERTS.multiline);
    const doc = editor.state.doc;

    expect(getTextContent(doc)).toContain('Line one');
    expect(getTextContent(doc)).toContain('Line two');

    const exported = editor.getMarkdown();
    expect(exported).toContain('> Line one');
    expect(exported).toContain('> Line two');
  });

  it('renders alerts with empty body', () => {
    editor = createTestEditor(ALERTS.emptyBody);
    const doc = editor.state.doc;

    expect(countNodes(doc, 'alert')).toBe(1);
    expect(getNodeAt(doc, 'alert')?.attrs.type).toBe('note');

    const exported = editor.getMarkdown();
    expect(exported).toContain('> [!NOTE]');
  });
});
