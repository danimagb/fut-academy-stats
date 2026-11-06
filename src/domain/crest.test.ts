import { describe, expect, it } from 'vitest';
import { CREST_COLOURS, crestColour, crestInitials } from './crest';

describe('crestInitials', () => {
  it.each([
    ['Rio Ave FC', 'RA'],
    ['Sporting U8', 'S'],
    ['Padroense F.C.', 'P'],
    ['FC Porto', 'P'],
    ['SL Benfica', 'B'],
    ['Padroense FC - Sub-7B', 'P'],
    ['Leixões SC', 'L'],
    ['Académico de Viseu', 'AV'],
    ['Grupo Desportivo de Chaves', 'C'],
    ['FC', 'F'],
    ['', '?'],
    [null, '?'],
  ])('%s → %s', (name, initials) => {
    expect(crestInitials(name)).toBe(initials);
  });

  it('uses the short name as it is', () => {
    expect(crestInitials('Padroense FC', 'pfc')).toBe('PFC');
    expect(crestInitials('Padroense FC', 'PADROENSE')).toBe('PAD');
  });
});

describe('crestColour', () => {
  it('is always the same for a name, ignoring case and spaces', () => {
    expect(crestColour('Rio Ave FC')).toBe(crestColour('  rio  ave fc '));
  });
  it('is one of the colours', () => {
    for (const n of ['A', 'Benfica', 'Sporting', 'Porto', 'Braga', 'Rival FC', '']) {
      expect(crestColour(n)).toBeGreaterThanOrEqual(1);
      expect(crestColour(n)).toBeLessThanOrEqual(CREST_COLOURS);
    }
  });
});
