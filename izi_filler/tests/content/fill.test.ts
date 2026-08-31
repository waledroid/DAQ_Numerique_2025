import { describe, it, expect, beforeEach } from 'vitest';
import { applyMatches, setNativeValue } from '../../src/content/fill';
import { snapshotFields } from '../../src/content/snapshot';
import type { FieldMatch } from '../../src/engine/types';

describe('setNativeValue', () => {
  it('sets the value and dispatches bubbling input and change events', () => {
    document.body.innerHTML = '<div id="app"><input id="i"></div>';
    const el = document.getElementById('i') as HTMLInputElement;
    const seen: string[] = [];
    document.getElementById('app')!.addEventListener('input', () => seen.push('input'));
    document.getElementById('app')!.addEventListener('change', () => seen.push('change'));
    setNativeValue(el, 'Ada');
    expect(el.value).toBe('Ada');
    expect(seen).toEqual(['input', 'change']);
  });
});

describe('applyMatches', () => {
  beforeEach(() => (document.body.innerHTML = ''));

  function run(html: string, matches: Omit<FieldMatch, 'ref'>[]) {
    document.body.innerHTML = html;
    const fields = snapshotFields(document);
    const full = fields.map((f, i) => ({ ref: f.ref, ...(matches[i] ?? { source: 'unknown' as const }) }));
    return { fields, outcomes: applyMatches(document, fields, full) };
  }

  it('fills a text input and marks it done', () => {
    const { outcomes } = run('<input name="fn">', [
      { key: 'identity.firstName', value: 'Ada', confidence: 'high', source: 'profile' },
    ]);
    expect(outcomes[0].status).toBe('filled');
    const el = document.querySelector('input')!;
    expect(el.value).toBe('Ada');
    expect(el.dataset.izifillDone).toBe('1');
  });

  it('reports uncertain for low confidence', () => {
    const { outcomes } = run('<input name="x">', [
      { key: 'address.city', value: 'Dijon', confidence: 'low', source: 'profile' },
    ]);
    expect(outcomes[0].status).toBe('uncertain');
  });

  it('never overwrites a differing user value', () => {
    document.body.innerHTML = '<input name="fn" value="Grace">';
    const fields = snapshotFields(document);
    const outcomes = applyMatches(document, fields, [
      { ref: fields[0].ref, key: 'identity.firstName', value: 'Ada', confidence: 'high', source: 'profile' },
    ]);
    expect(outcomes[0].status).toBe('skipped');
    expect(document.querySelector('input')!.value).toBe('Grace');
  });

  it('does not re-fill an element already marked done', () => {
    document.body.innerHTML = '<input name="fn" data-izifill-done="1">';
    const fields = snapshotFields(document);
    const outcomes = applyMatches(document, fields, [
      { ref: fields[0].ref, key: 'identity.firstName', value: 'Ada', confidence: 'high', source: 'profile' },
    ]);
    expect(outcomes[0].status).toBe('skipped');
  });

  it('selects the matched option', () => {
    const { outcomes } = run(
      '<select><option value="">--</option><option value="fr">France</option></select>',
      [{ key: 'address.country', value: 'fr', confidence: 'high', source: 'profile' }],
    );
    expect(outcomes[0].status).toBe('filled');
    expect(document.querySelector('select')!.value).toBe('fr');
  });

  it('checks the matched radio', () => {
    document.body.innerHTML = `
      <label><input type="radio" name="p" value="y">Oui</label>
      <label><input type="radio" name="p" value="n">Non</label>`;
    const fields = snapshotFields(document);
    const outcomes = applyMatches(document, fields, [
      { ref: fields[0].ref, key: 'eligibility.workPermit', value: 'y', confidence: 'high', source: 'profile' },
    ]);
    expect(outcomes[0].status).toBe('filled');
    expect((document.querySelector('input[value=y]') as HTMLInputElement).checked).toBe(true);
  });

  it('returns unknown with the element attached', () => {
    const { outcomes } = run('<input name="mystery">', [{ source: 'unknown' }]);
    expect(outcomes[0].status).toBe('unknown');
    expect(outcomes[0].el).not.toBeNull();
  });

  it('reports unknown and leaves data-izifill-done unset when a select value does not stick', () => {
    document.body.innerHTML = '<select><option value="">--</option><option value="fr">France</option></select>';
    const fields = snapshotFields(document);
    const outcomes = applyMatches(document, fields, [
      { ref: fields[0].ref, key: 'address.country', value: 'xx', confidence: 'high', source: 'profile' },
    ]);
    expect(outcomes[0].status).toBe('unknown');
    const el = document.querySelector('select')!;
    expect(el.value).toBe('');
    expect(el.dataset.izifillDone).toBeUndefined();
  });
});
