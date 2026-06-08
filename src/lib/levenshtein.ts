// Tiny Levenshtein implementation for the "Did you mean …?" suggestion in
// SmartSearch (spec §8). Iterative two-row variant — O(n*m) time, O(min(n,m))
// space. We only ever compare short strings (term names < 64 chars), so this
// is trivially fast.

export function levenshtein(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  if (s === t) return 0;
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  let prev = new Array<number>(t.length + 1);
  let curr = new Array<number>(t.length + 1);
  for (let j = 0; j <= t.length; j++) prev[j] = j;

  for (let i = 1; i <= s.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s.charCodeAt(i - 1) === t.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,       // insertion
        prev[j] + 1,           // deletion
        prev[j - 1] + cost,    // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[t.length];
}

/** Closest match from `candidates` for `query`, by case-insensitive Levenshtein distance. */
export function closestMatch(query: string, candidates: string[]): { match: string; distance: number } | null {
  if (!query.trim() || candidates.length === 0) return null;
  let bestMatch = candidates[0];
  let bestDist = levenshtein(query, candidates[0]);
  for (let i = 1; i < candidates.length; i++) {
    const d = levenshtein(query, candidates[i]);
    if (d < bestDist) {
      bestDist = d;
      bestMatch = candidates[i];
    }
  }
  return { match: bestMatch, distance: bestDist };
}
