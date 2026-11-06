// English or European Portuguese: the saved choice, else the phone's language.
import { getLang, setLang, type Lang } from '@/shared/i18n/i18n';

const LANG_KEY = 'fut-academy-stats.lang';

/** Picks the language at startup and sets <html lang>. */
export function initLanguage(): void {
  const saved = localStorage.getItem(LANG_KEY);
  setLang(
    saved === 'pt' || saved === 'en'
      ? saved
      : (navigator.language || '').toLowerCase().startsWith('pt')
        ? 'pt'
        : 'en',
  );
  document.documentElement.lang = getLang();
}

export function switchLanguage(v: Lang): void {
  setLang(v);
  localStorage.setItem(LANG_KEY, v);
  document.documentElement.lang = v;
}
