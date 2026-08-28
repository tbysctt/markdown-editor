export function fuzzyScore(query: string, text: string): number | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return 0;
  }

  const normalizedText = text.toLowerCase();
  let queryIndex = 0;
  let score = 0;
  let lastMatchIndex = -1;

  for (
    let textIndex = 0;
    textIndex < normalizedText.length && queryIndex < normalizedQuery.length;
    textIndex += 1
  ) {
    if (normalizedText[textIndex] !== normalizedQuery[queryIndex]) {
      continue;
    }

    if (lastMatchIndex === textIndex - 1) {
      score += 5;
    } else {
      score += 1;
    }

    if (
      textIndex === 0 ||
      normalizedText[textIndex - 1] === '/' ||
      normalizedText[textIndex - 1] === '\\' ||
      normalizedText[textIndex - 1] === ' ' ||
      normalizedText[textIndex - 1] === '-' ||
      normalizedText[textIndex - 1] === '_'
    ) {
      score += 3;
    }

    lastMatchIndex = textIndex;
    queryIndex += 1;
  }

  if (queryIndex !== normalizedQuery.length) {
    return null;
  }

  if (normalizedText.startsWith(normalizedQuery)) {
    score += 10;
  }

  return score;
}

export function rankByFuzzyMatch<T>(
  items: T[],
  query: string,
  getLabel: (item: T) => string,
): T[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return items;
  }

  return items
    .map((item) => ({
      item,
      score: fuzzyScore(trimmed, getLabel(item)),
    }))
    .filter(
      (entry): entry is { item: T; score: number } => entry.score !== null,
    )
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.item);
}
