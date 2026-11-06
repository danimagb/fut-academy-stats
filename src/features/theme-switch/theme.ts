// Light, dark, or following the phone ('auto'), remembered on this phone.

export type ThemeChoice = 'light' | 'dark' | 'auto';
const THEME_KEY = 'fut-academy-stats.theme';

let theme: ThemeChoice = 'auto';
let darkMq: MediaQueryList | null = null;

export const getTheme = (): ThemeChoice => theme;

function applyTheme(): void {
  const resolved = theme === 'auto' ? (darkMq?.matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = resolved;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = resolved === 'light' ? '#eef0f3' : '#0e0f12';
}

/** Applies the saved theme, and follows the phone's setting while it's 'auto' (once, at startup). */
export function initTheme(): void {
  const saved = localStorage.getItem(THEME_KEY);
  theme = saved === 'light' || saved === 'dark' ? saved : 'auto';
  darkMq = window.matchMedia('(prefers-color-scheme: dark)');
  applyTheme();
  darkMq.addEventListener?.('change', () => {
    if (theme === 'auto') applyTheme();
  });
}

export function setTheme(v: ThemeChoice): void {
  theme = v;
  localStorage.setItem(THEME_KEY, v);
  applyTheme();
}
