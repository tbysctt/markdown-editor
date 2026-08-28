import { createLowlight } from 'lowlight';
import bash from 'highlight.js/lib/languages/bash';
import typescript from 'highlight.js/lib/languages/typescript';
import go from 'highlight.js/lib/languages/go';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import ruby from 'highlight.js/lib/languages/ruby';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import ini from 'highlight.js/lib/languages/ini';
import php from 'highlight.js/lib/languages/php';
import rust from 'highlight.js/lib/languages/rust';
import xml from 'highlight.js/lib/languages/xml';
import markdown from 'highlight.js/lib/languages/markdown';
import lua from 'highlight.js/lib/languages/lua';

export interface CodeLanguageOption {
  value: string;
  label: string;
}

export const CODE_LANGUAGE_OPTIONS: CodeLanguageOption[] = [
  { value: '', label: 'Plain Text' },
  { value: 'bash', label: 'Shell (sh/bash/zsh)' },
  { value: 'typescript', label: 'TypeScript/JavaScript' },
  { value: 'go', label: 'Go' },
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'toml', label: 'TOML' },
  { value: 'php', label: 'PHP' },
  { value: 'rust', label: 'Rust' },
  { value: 'xml', label: 'HTML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'lua', label: 'Lua' },
];

export const lowlight = createLowlight();

lowlight.register({
  bash,
  typescript,
  go,
  python,
  sql,
  java,
  c,
  cpp,
  ruby,
  json,
  yaml,
  ini,
  php,
  rust,
  xml,
  markdown,
  lua,
});

lowlight.registerAlias({
  bash: ['sh', 'zsh', 'shell'],
  typescript: ['javascript', 'js', 'ts'],
  ini: ['toml'],
  xml: ['html', 'htm'],
});

const LANGUAGE_SELECT_ALIASES: Record<string, string> = {
  html: 'xml',
  htm: 'xml',
  js: 'typescript',
  javascript: 'typescript',
  ts: 'typescript',
  sh: 'bash',
  zsh: 'bash',
  shell: 'bash',
};

export function languageToSelectValue(language: string | null | undefined): string {
  if (!language) {
    return '';
  }

  if (CODE_LANGUAGE_OPTIONS.some((option) => option.value === language)) {
    return language;
  }

  return LANGUAGE_SELECT_ALIASES[language] ?? language;
}

export function selectValueToLanguage(value: string): string | null {
  return value === '' ? null : value;
}
