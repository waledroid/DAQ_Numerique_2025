import { describe, it, expect } from 'vitest';
import { matchField, matchFields, resolveOption } from '../../src/engine/matcher';
import { emptyProfile } from '../../src/engine/profile';
import { makeLearned } from '../../src/engine/learned';
import type { FieldSnapshot } from '../../src/engine/types';

function field(partial: Partial<FieldSnapshot>): FieldSnapshot {
  return {
    ref: '0', tag: 'input', type: 'text', name: '', id: '', autocomplete: '',
    placeholder: '', ariaLabel: '', label: '', context: '', options: [], required: false,
    ...partial,
  };
}

const profile = emptyProfile();
profile.identity.firstName = 'Ada';
profile.identity.lastName = 'Lovelace';
profile.contact.email = 'ada@example.fr';
profile.address.country = 'France';
profile.eligibility.workPermit = 'Oui';

describe('matchField', () => {
  it('matches by autocomplete attribute with high confidence', () => {
    const m = matchField(field({ autocomplete: 'email', label: 'whatever' }), profile, []);
    expect(m).toMatchObject({ key: 'contact.email', value: 'ada@example.fr', confidence: 'high', source: 'profile' });
  });
  it('matches a French label exactly with high confidence', () => {
    const m = matchField(field({ label: 'Prénom *' }), profile, []);
    expect(m).toMatchObject({ key: 'identity.firstName', value: 'Ada', confidence: 'high' });
  });
  it('matches an English label substring with low confidence', () => {
    const m = matchField(field({ label: 'Please enter your first name here' }), profile, []);
    expect(m).toMatchObject({ key: 'identity.firstName', confidence: 'low' });
  });
  it('prefers the longer synonym (last name beats name)', () => {
    const m = matchField(field({ label: 'Last name' }), profile, []);
    expect(m.key).toBe('identity.lastName');
  });
  it('returns unknown when the profile value is empty', () => {
    const m = matchField(field({ label: 'Ville' }), profile, []);
    expect(m.source).toBe('unknown');
    expect(m.key).toBe('address.city');
  });
  it('resolves select options for country', () => {
    const m = matchField(
      field({ tag: 'select', type: '', label: 'Pays', options: [
        { value: 'de', text: 'Allemagne' }, { value: 'fr', text: 'France' },
      ] }),
      profile, [],
    );
    expect(m.value).toBe('fr');
  });
  it('resolves radio options for a oui/non question', () => {
    const m = matchField(
      field({ type: 'radio', label: 'Êtes-vous autorisé à travailler en France ?', options: [
        { value: 'yes', text: 'Oui' }, { value: 'no', text: 'Non' },
      ] }),
      profile, [],
    );
    expect(m.value).toBe('yes');
  });
  it('marks a select unknown when no option matches', () => {
    const m = matchField(
      field({ tag: 'select', type: '', label: 'Pays', options: [{ value: 'jp', text: 'Japon' }] }),
      profile, [],
    );
    expect(m.source).toBe('unknown');
  });
  it('falls back to learned answers', () => {
    const learned = [makeLearned('Quelle est votre disponibilité ?', 'Immédiate', 'fr')];
    const m = matchField(field({ label: 'Quelle est votre disponibilité ?' }), profile, learned);
    expect(m).toMatchObject({ value: 'Immédiate', source: 'learned' });
  });
  it('detects a CV file input', () => {
    const m = matchField(field({ type: 'file', label: 'Votre CV' }), profile, []);
    expect(m).toMatchObject({ key: 'files.cv', source: 'profile' });
  });
  it('skips checkboxes and hidden inputs', () => {
    expect(matchField(field({ type: 'checkbox', label: 'Prénom' }), profile, []).source).toBe('unknown');
    expect(matchField(field({ type: 'hidden', label: 'Prénom' }), profile, []).source).toBe('unknown');
  });
});

describe('resolveOption', () => {
  it('matches by containment both ways', () => {
    const f = field({ tag: 'select', options: [{ value: 'FR', text: 'France (métropolitaine)' }] });
    expect(resolveOption(f, 'France')).toBe('FR');
  });
});

describe('matchFields', () => {
  it('maps every field', () => {
    const out = matchFields([field({ ref: 'a', label: 'Prénom' }), field({ ref: 'b', label: '???' })], profile, []);
    expect(out).toHaveLength(2);
    expect(out[0].ref).toBe('a');
    expect(out[1].source).toBe('unknown');
  });
});
