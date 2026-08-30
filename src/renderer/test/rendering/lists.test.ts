import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import { LISTS } from '../fixtures/rendering';
import {
  createTestEditor,
  destroyEditor,
} from '../helpers/createTestEditor';
import { countNodes, findNodes, getNodeAt } from '../helpers/docQueries';
import { parseHtml, queryAll, queryOne } from '../helpers/htmlQueries';

describe('lists rendering', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    destroyEditor(editor);
    editor = undefined;
  });

  it('renders unordered lists', () => {
    editor = createTestEditor(LISTS.unordered);
    const doc = editor.state.doc;

    expect(countNodes(doc, 'bulletList')).toBe(1);
    expect(countNodes(doc, 'listItem')).toBe(2);

    const html = parseHtml(editor.getHTML());
    expect(queryOne(html, 'ul')).not.toBeNull();
    expect(queryAll(html, 'ul > li')).toHaveLength(2);
  });

  it('renders ordered lists', () => {
    editor = createTestEditor(LISTS.ordered);
    const doc = editor.state.doc;

    expect(countNodes(doc, 'orderedList')).toBe(1);
    expect(countNodes(doc, 'listItem')).toBe(2);

    const html = parseHtml(editor.getHTML());
    expect(queryOne(html, 'ol')).not.toBeNull();
    expect(queryAll(html, 'ol > li')).toHaveLength(2);
  });

  it('renders open task items', () => {
    editor = createTestEditor(LISTS.taskOpen);
    const doc = editor.state.doc;
    const taskItem = getNodeAt(doc, 'taskItem');

    expect(countNodes(doc, 'taskList')).toBe(1);
    expect(taskItem?.attrs.checked).toBe(false);

    const html = parseHtml(editor.getHTML());
    expect(queryOne(html, 'ul[data-type="taskList"]')).not.toBeNull();
    expect(queryOne(html, 'li[data-type="taskItem"]')).not.toBeNull();
    expect(queryOne(html, 'input[type="checkbox"]')).not.toBeNull();
    expect(queryOne(html, 'input[checked]')).toBeNull();
  });

  it('renders completed task items', () => {
    editor = createTestEditor(LISTS.taskDone);
    const doc = editor.state.doc;
    const taskItem = getNodeAt(doc, 'taskItem');

    expect(taskItem?.attrs.checked).toBe(true);

    const html = parseHtml(editor.getHTML());
    expect(queryOne(html, 'input[checked]')).not.toBeNull();
  });

  it('renders mixed task list states', () => {
    editor = createTestEditor(LISTS.taskMixed);
    const doc = editor.state.doc;
    const taskItems = findNodes(doc, 'taskItem');

    expect(taskItems).toHaveLength(2);
    expect(taskItems[0].node.attrs.checked).toBe(false);
    expect(taskItems[1].node.attrs.checked).toBe(true);
  });

  it('renders nested task items', () => {
    editor = createTestEditor(LISTS.nestedTask);
    const doc = editor.state.doc;

    expect(countNodes(doc, 'taskList')).toBeGreaterThanOrEqual(1);
    expect(countNodes(doc, 'taskItem')).toBeGreaterThanOrEqual(2);
  });

  it('does not parse task syntax as plain bullet list', () => {
    editor = createTestEditor(LISTS.taskOpen);
    const doc = editor.state.doc;

    expect(countNodes(doc, 'taskList')).toBe(1);
    expect(countNodes(doc, 'bulletList')).toBe(0);
  });
});
