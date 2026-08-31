import { describe, it, expect } from 'vitest';
import { t, detectLang } from '../../src/lib/i18n';

describe('t', () => {
  it('returns French and English strings', () => {
    expect(t('yes', 'fr')).toBe('Oui, remplir');
    expect(t('yes', 'en')).toBe('Yes, fill');
  });
  it('interpolates variables', () => {
    expect(t('summary', 'en', { filled: 3, uncertain: 1, unknown: 2 })).toContain('3');
  });
});

describe('detectLang', () => {
  it('returns fr or en', () => {
    expect(['fr', 'en']).toContain(detectLang());
  });
});
