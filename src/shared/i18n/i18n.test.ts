import { afterEach, describe, expect, it } from 'vitest';
import { I18N, getLang, locale, setLang, t } from './i18n';

afterEach(() => setLang('en'));

describe('I18N', () => {
  it('has the same keys in English and Portuguese', () => {
    expect(Object.keys(I18N.pt).sort()).toEqual(Object.keys(I18N.en).sort());
  });

  it('has no string that is empty in only one language', () => {
    // Empty in both is deliberate (e.g. resetIntro: no intro text on that screen).
    const oneSided = Object.keys(I18N.en).filter((k) => {
      const key = k as keyof typeof I18N.en;
      return !I18N.en[key].trim() !== !I18N.pt[key].trim();
    });
    expect(oneSided).toEqual([]);
  });

  it('uses the same {placeholders} in both languages', () => {
    const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const mismatched = Object.keys(I18N.en).filter(
      (k) =>
        names(I18N.en[k as keyof typeof I18N.en]).join() !== names(I18N.pt[k as keyof typeof I18N.pt]).join(),
    );
    expect(mismatched).toEqual([]);
  });
});

describe('t', () => {
  it('fills placeholders and leaves unknown ones as they are', () => {
    expect(t('teamsN', { n: 3 })).toBe('3 teams');
    expect(t('teamsN')).toBe('{n} teams');
  });

  it('follows the current language', () => {
    setLang('pt');
    expect(getLang()).toBe('pt');
    expect(t('teamsN', { n: 3 })).toBe('3 equipas');
    expect(locale()).toBe('pt-PT');
  });

  it('returns the key itself when it is not a known string', () => {
    expect(t('noSuchKey')).toBe('noSuchKey');
  });
});
