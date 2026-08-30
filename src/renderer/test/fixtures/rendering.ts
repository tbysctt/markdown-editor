export const MARKS = {
  bold: '**bold text**',
  italic: '*italic text*',
  strike: '~~struck text~~',
  inlineCode: 'Use `inline code` here.',
  link: '[Example link](https://example.com)',
  combined: '**bold** and *italic* together.',
  boundaries: 'Start **bold** middle `code` end.',
};

export const HEADINGS = {
  h1: '# Heading 1',
  h2: '## Heading 2',
  h3: '### Heading 3',
  h4: '#### Heading 4',
  h5: '##### Heading 5',
  h6: '###### Heading 6',
  all: `# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6`,
};

export const LISTS = {
  unordered: `- First item
- Second item`,
  ordered: `1. First item
2. Second item`,
  taskOpen: `- [ ] Open task`,
  taskDone: `- [x] Done task`,
  taskMixed: `- [ ] Open task
- [x] Done task`,
  nestedTask: `- [ ] Parent task
  - [ ] Nested task`,
};

export const BLOCKQUOTES = {
  simple: '> Plain blockquote text.',
  multiline: `> First line
> Second line`,
};

export const ALERTS = {
  note: `> [!NOTE]
> This is a note.`,
  tip: `> [!TIP]
> This is a tip.`,
  important: `> [!IMPORTANT]
> This is important.`,
  warning: `> [!WARNING]
> This is a warning.`,
  caution: `> [!CAUTION]
> This is a caution.`,
  multiline: `> [!NOTE]
> Line one
> Line two`,
  emptyBody: '> [!NOTE]',
};

export const CODE = {
  inlineWithContext: 'Before `const x = 1` after.',
  plainBlock: '```\nplain code\n```',
  jsBlock: '```javascript\nconst x = 1;\n```',
};

export const MATH = {
  inline: 'Inline math $x^2$ here.',
  block: `Block math:

$$
\\int_0^1 x\\,dx
$$`,
  multipleInline: 'Values $a$ and $b$ in one line.',
  fraction: 'Fraction $\\frac{a}{b}$ example.',
};

export const IMAGES = {
  basic: '![Alt text](./images/foo.png)',
  withTitle: '![Alt text](./images/foo.png "Image title")',
};

export const TABLES = {
  simple: `| H1 | H2 |
| --- | --- |
| a | b |`,
  multiRow: `| Name | Value |
| --- | --- |
| Alpha | 1 |
| Beta | 2 |`,
};

export const KITCHEN_SINK = `# Heading 1

**bold** *italic* ~~strike~~ \`inline code\` [link](https://example.com)

> Plain blockquote

> [!NOTE]
> Alert body

\`\`\`js
const x = 1;
\`\`\`

Inline math $E=mc^2$ and block:

$$
\\sum_{i=1}^{n} x_i
$$

![Alt text](./images/foo.png)

- unordered item
1. ordered item
- [ ] open task
- [x] done task

| H1 | H2 |
| --- | --- |
| a | b |
`;
