export function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

export function queryOne(
  doc: Document | ParentNode,
  selector: string,
): Element | null {
  return doc.querySelector(selector);
}

export function queryAll(
  doc: Document | ParentNode,
  selector: string,
): Element[] {
  return [...doc.querySelectorAll(selector)];
}

export function textContentOf(
  doc: Document | ParentNode,
  selector: string,
): string {
  return queryOne(doc, selector)?.textContent?.trim() ?? '';
}

export function htmlContains(html: string, selector: string): boolean {
  return queryOne(parseHtml(html), selector) !== null;
}
