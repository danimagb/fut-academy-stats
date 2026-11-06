// A team's crest where a team is shown: the club's logo when the phone has it, otherwise a shield
// with the team's initials in a colour that comes from its name (also for opponents).
import { crestColour, crestInitials } from '@/domain/crest';
import { esc } from '@/shared/lib/html';

type Size = 'sm' | 'lg';

/** The club's logo as an <img> ('' when there is none). Decorative: the name is next to it. */
export const clubLogo = (src: string | null, size: Size = 'sm'): string =>
  src ? `<img class="club-logo ${size}" src="${esc(src)}" alt="" decoding="async">` : '';

export type CrestOf = {
  /** The club's (or team's, or opponent's) name: the initials and colour come from it. */
  name: string | null | undefined;
  /** The club's short name, used as the initials when set. */
  shortName?: string | undefined;
  /** The real logo, when the phone has it. */
  src?: string | null | undefined;
};

/** The logo, or a default crest: a shield with the initials. */
export function crest({ name, shortName = '', src }: CrestOf, size: Size = 'sm'): string {
  if (src) return clubLogo(src, size);
  const letters = crestInitials(name, shortName);
  const fontSize = letters.length >= 3 ? 11 : letters.length === 2 ? 13.5 : 17;
  return `<svg class="club-logo crest ${size}" viewBox="0 0 40 40" aria-hidden="true" style="--c: var(--crest-${crestColour(name)})">
    <path d="M20 2.5 35.5 8v11.5c0 9.3-6.4 15.7-15.5 18-9.1-2.3-15.5-8.7-15.5-18V8z"/>
    <text x="20" y="21.5" font-size="${fontSize}">${esc(letters)}</text></svg>`;
}
