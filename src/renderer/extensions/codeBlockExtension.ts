import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { PluginKey } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CodeBlockView } from '../components/CodeBlockView';
import { lowlight } from '../utils/codeLanguages';
import { PlainTextAwareLowlightPlugin } from './plainTextLowlightPlugin';

const lowlightPluginKey = new PluginKey('lowlight');

export const CodeBlockExtension = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },

  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() ?? [];
    const withoutLowlight = parentPlugins.filter(
      (plugin) => plugin.spec.key !== lowlightPluginKey,
    );

    return [
      ...withoutLowlight,
      PlainTextAwareLowlightPlugin({
        name: this.name,
        lowlight: this.options.lowlight,
        defaultLanguage: this.options.defaultLanguage,
      }),
    ];
  },
}).configure({
  lowlight,
  defaultLanguage: null,
});
