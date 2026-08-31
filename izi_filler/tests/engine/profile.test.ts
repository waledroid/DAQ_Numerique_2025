import { describe, it, expect } from 'vitest';
import { emptyProfile, getProfileValue, completionPercent, mergeImportedProfile } from '../../src/engine/profile';

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

describe('eeo section and github link', () => {
  it('exist in emptyProfile with empty answers', () => {
    const p = emptyProfile();
    expect(p.eeo).toEqual({
      usWorkAuthorization: '', requiresSponsorship: '', disability: '', gender: '',
      lgbtq: '', veteran: '', race: '', hispanic: '', sexualOrientation: '', pronouns: '',
    });
    expect(p.links.github).toBe('');
  });
  it('resolve through getProfileValue', () => {
    const p = emptyProfile();
    p.eeo.pronouns = 'He/Him';
    p.links.github = 'https://github.com/waledroid';
    expect(getProfileValue(p, 'eeo.pronouns')).toBe('He/Him');
    expect(getProfileValue(p, 'links.github')).toBe('https://github.com/waledroid');
  });
});

describe('mergeImportedProfile', () => {
  it('merges known fields onto an empty profile and drops unknown keys', () => {
    const merged = mergeImportedProfile({
      identity: { firstName: 'Ada', bogus: 'x' },
      eeo: { pronouns: 'She/Her' },
      experience: [{ title: 'Dev', company: 'ACME', startDate: '2024', endDate: '2025', description: 'd' }],
      hacker: { evil: true },
    });
    expect(merged.identity.firstName).toBe('Ada');
    expect(merged.eeo.pronouns).toBe('She/Her');
    expect(merged.experience).toEqual([
      { title: 'Dev', company: 'ACME', startDate: '2024', endDate: '2025', description: 'd' },
    ]);
    expect((merged as unknown as Record<string, unknown>).hacker).toBeUndefined();
    expect(merged.contact.email).toBe('');
  });
  it('returns an empty profile for non-object input', () => {
    expect(mergeImportedProfile('nope')).toEqual(emptyProfile());
    expect(mergeImportedProfile(null)).toEqual(emptyProfile());
  });
  it('ignores non-string scalars and non-array lists', () => {
    const merged = mergeImportedProfile({ identity: { firstName: 42 }, education: 'x' });
    expect(merged.identity.firstName).toBe('');
    expect(merged.education).toEqual([]);
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
