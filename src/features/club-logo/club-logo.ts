// A club's logo where the club is shown (nothing when the phone has no logo for it).
import { esc } from '@/shared/lib/html';

/** `size`: 'sm' (next to a name, the default) or 'lg' (a heading). Decorative: the name is next to it. */
export const clubLogo = (src: string | null, size: 'sm' | 'lg' = 'sm'): string =>
  src ? `<img class="club-logo ${size}" src="${esc(src)}" alt="" decoding="async">` : '';
