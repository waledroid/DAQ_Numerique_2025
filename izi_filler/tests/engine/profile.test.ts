import { describe, it, expect } from 'vitest';
import { emptyProfile, getProfileValue, completionPercent } from '../../src/engine/profile';

describe('emptyProfile', () => {
  it('has all scalar leaves empty and arrays empty', () => {
    const p = emptyProfile();
    expect(p.identity.firstName).toBe('');
    expect(p.experience).toEqual([]);
    expect(p.standardAnswers.coverLetter).toBe('');
  });
});

describe('getProfileValue', () => {
  it('resolves dot paths', () => {
    const p = emptyProfile();
    p.contact.email = 'a@b.fr';
    expect(getProfileValue(p, 'contact.email')).toBe('a@b.fr');
  });
  it('builds identity.fullName from first + last', () => {
    const p = emptyProfile();
    p.identity.firstName = 'Ada';
    p.identity.lastName = 'Lovelace';
    expect(getProfileValue(p, 'identity.fullName')).toBe('Ada Lovelace');
  });
  it('returns empty string for unknown or array paths', () => {
    const p = emptyProfile();
    expect(getProfileValue(p, 'nope.nothing')).toBe('');
    expect(getProfileValue(p, 'experience')).toBe('');
  });
});

describe('completionPercent', () => {
  it('is 0 for empty profile and grows when fields are filled', () => {
    const p = emptyProfile();
    expect(completionPercent(p)).toBe(0);
    p.identity.firstName = 'Ada';
    const one = completionPercent(p);
    expect(one).toBeGreaterThan(0);
    p.contact.email = 'a@b.fr';
    expect(completionPercent(p)).toBeGreaterThan(one);
  });
});
