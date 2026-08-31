import { describe, it, expect } from 'vitest';
import { normalize, tokens, normalizeKey } from '../../src/engine/normalize';

describe('normalize', () => {
  it('lowercases and strips accents', () => {
    expect(normalize('Prénom')).toBe('prenom');
    expect(normalize('Téléphone Portable')).toBe('telephone portable');
  });
  it('strips punctuation and collapses whitespace', () => {
    expect(normalize('  E-mail :  *')).toBe('e mail');
    expect(normalize('Nom / Name')).toBe('nom name');
  });
  it('returns empty string for empty input', () => {
    expect(normalize('')).toBe('');
    expect(normalize('  ??  ')).toBe('');
  });
});

describe('tokens', () => {
  it('splits normalized text', () => {
    expect(tokens('Code Postal')).toEqual(['code', 'postal']);
  });
  it('returns [] for empty', () => {
    expect(tokens(' ')).toEqual([]);
  });
});

describe('normalizeKey', () => {
  it('removes FR stopwords', () => {
    expect(normalizeKey('Quelle est votre disponibilité ?')).toBe('disponibilite');
  });
  it('removes EN stopwords', () => {
    expect(normalizeKey('What is your notice period?')).toBe('notice period');
  });
});
