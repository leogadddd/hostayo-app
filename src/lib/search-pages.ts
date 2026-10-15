export interface SearchablePage {
  label: string;
  /** The sidebar section it sits in ("Tools", "Money"), also searchable. */
  group?: string;
  /** Extra words that should find it ("fees" → Platform fees). */
  keywords?: string;
}

function fold(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Pages whose label, section or keywords match every word of `query`, best
 * first: a label word that starts with it beats a substring, which beats a
 * section or keyword hit. An empty query matches nothing.
 */
export function matchPages<T extends SearchablePage>(
  pages: readonly T[],
  query: string,
  limit = 6,
): T[] {
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const scored: { page: T; score: number; order: number }[] = [];
  pages.forEach((page, order) => {
    const label = fold(page.label);
    const words = label.split(/[\s-]+/);
    const other = fold(`${page.group ?? ""} ${page.keywords ?? ""}`);
    let total = 0;
    for (const token of tokens) {
      let score = 0;
      if (label.startsWith(token)) score = 100;
      else if (words.some((word) => word.startsWith(token))) score = 80;
      else if (label.includes(token)) score = 50;
      else if (other.split(/\s+/).some((word) => word.startsWith(token)))
        score = 30;
      if (!score) {
        total = 0;
        break;
      }
      total += score;
    }
    if (total) scored.push({ page, score: total, order });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((entry) => entry.page);
}
