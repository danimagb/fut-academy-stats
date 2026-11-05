import { describe, expect, it } from 'vitest';
import { esc } from './html';

describe('esc', () => {
  it('escapes the characters that can break out of HTML text or attributes', () => {
    expect(esc(`<img src=x onerror="alert('x')">&`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;',
    );
  });

  it('leaves ordinary text unchanged, accents included', () => {
    expect(esc('João Félix 7')).toBe('João Félix 7');
  });

  it('turns null and undefined into an empty string', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });

  it('converts numbers to text', () => {
    expect(esc(10)).toBe('10');
    expect(esc(0)).toBe('0');
  });
});
