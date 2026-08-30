import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['.vite/**', 'dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'import-x': importX },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      'import-x/core-modules': ['electron'],
      'import-x/resolver': {
        node: true,
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      ...importX.flatConfigs.recommended.rules,
      'import-x/no-unresolved': ['error', { ignore: ['\\.css\\?inline$'] }],
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },
);
