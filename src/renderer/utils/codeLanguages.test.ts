import { describe, expect, it } from 'vitest';
import {
  languageToSelectValue,
  selectValueToLanguage,
} from './codeLanguages';

describe('languageToSelectValue', () => {
  it('returns an empty string for missing languages', () => {
    expect(languageToSelectValue(null)).toBe('');
    expect(languageToSelectValue(undefined)).toBe('');
  });

  it('returns known language values unchanged', () => {
    expect(languageToSelectValue('python')).toBe('python');
    expect(languageToSelectValue('bash')).toBe('bash');
  });

  it('maps common aliases to select values', () => {
    expect(languageToSelectValue('js')).toBe('typescript');
    expect(languageToSelectValue('javascript')).toBe('typescript');
    expect(languageToSelectValue('html')).toBe('xml');
    expect(languageToSelectValue('sh')).toBe('bash');
  });

  it('passes through unknown languages', () => {
    expect(languageToSelectValue('kotlin')).toBe('kotlin');
  });
});

describe('selectValueToLanguage', () => {
  it('returns null for plain text', () => {
    expect(selectValueToLanguage('')).toBeNull();
  });

  it('returns the selected language value', () => {
    expect(selectValueToLanguage('python')).toBe('python');
  });
});
