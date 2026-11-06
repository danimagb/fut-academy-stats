// The default crest for a team without a logo (our teams, and opponents): its initials and one
// of a few colours, both worked out from the name so the same team always looks the same.

/** Words that don't say which club it is: club types, small words, age groups, numbers. */
const SKIP =
  /^(fc|cf|sc|cd|gd|ad|ud|sad|ac|ca|cs|sl|fk|sk|club|clube|clubes|futebol|football|associação|associacao|grupo|desportivo|de|da|do|das|dos|e|the|sub|u\d+[a-z]?|sub\d+[a-z]?|\d+[a-z]?)$/i;

/**
 * Up to 2 letters for a crest: "Rio Ave FC" → "RA", "Sporting U8" → "S", "Padroense F.C." →
 * "P". A short name (e.g. "PFC") is used as it is (up to 3 characters).
 */
export function crestInitials(name: string | null | undefined, shortName = ''): string {
  const short = shortName.trim();
  if (short) return short.slice(0, 3).toUpperCase();
  const words = String(name ?? '')
    .replace(/\./g, '') // "F.C." → "FC"
    .split(/[\s\-–—/,()]+/)
    .filter(Boolean);
  const kept = words.filter((w) => !SKIP.test(w));
  const pick = kept.length ? kept : words;
  const letters = pick
    .slice(0, 2)
    .map((w) => [...w][0] ?? '')
    .join('');
  return letters.toUpperCase() || '?';
}

/** Number of crest colours (CSS variables --crest-1 … --crest-8). */
export const CREST_COLOURS = 8;

/** Which colour (1 … 8) a name gets: always the same for the same name, ignoring case and spaces. */
export function crestColour(name: string | null | undefined): number {
  const key = String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  let h = 0;
  for (const ch of key) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return (h % CREST_COLOURS) + 1;
}
