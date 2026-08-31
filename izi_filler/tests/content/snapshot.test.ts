import { describe, it, expect, beforeEach } from 'vitest';
import { snapshotFields } from '../../src/content/snapshot';

describe('snapshotFields', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('captures label via for=, placeholder, autocomplete, name', () => {
    document.body.innerHTML = `
      <label for="fn">Prénom</label>
      <input id="fn" name="first_name" autocomplete="given-name" placeholder="Votre prénom">`;
    const [f] = snapshotFields(document);
    expect(f).toMatchObject({
      tag: 'input', type: 'text', label: 'Prénom', name: 'first_name',
      autocomplete: 'given-name', placeholder: 'Votre prénom',
    });
    expect(document.getElementById('fn')?.getAttribute('data-izifill-ref')).toBe(f.ref);
  });

  it('captures wrapping labels and fieldset legend context', () => {
    document.body.innerHTML = `
      <fieldset><legend>Adresse</legend>
        <label>Ville <input name="city"></label>
      </fieldset>`;
    const [f] = snapshotFields(document);
    expect(f.label).toContain('Ville');
    expect(f.context).toContain('Adresse');
  });

  it('captures select options', () => {
    document.body.innerHTML = `
      <label for="c">Pays</label>
      <select id="c"><option value="fr">France</option><option value="de">Allemagne</option></select>`;
    const [f] = snapshotFields(document);
    expect(f.tag).toBe('select');
    expect(f.options).toEqual([
      { value: 'fr', text: 'France' },
      { value: 'de', text: 'Allemagne' },
    ]);
  });

  it('groups radios by name into one snapshot with labeled options', () => {
    document.body.innerHTML = `
      <fieldset><legend>Permis de travail</legend>
        <label><input type="radio" name="permit" value="y">Oui</label>
        <label><input type="radio" name="permit" value="n">Non</label>
      </fieldset>`;
    const fields = snapshotFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe('radio');
    expect(fields[0].options).toEqual([
      { value: 'y', text: 'Oui' },
      { value: 'n', text: 'Non' },
    ]);
    const radios = document.querySelectorAll('input[type=radio]');
    expect(radios[0].getAttribute('data-izifill-ref')).toBe(fields[0].ref);
    expect(radios[1].getAttribute('data-izifill-ref')).toBe(fields[0].ref);
  });

  it('skips disabled elements', () => {
    document.body.innerHTML = `<input disabled name="x"><input name="y">`;
    const fields = snapshotFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('y');
  });

  it('captures aria-label and textarea', () => {
    document.body.innerHTML = `<textarea aria-label="Lettre de motivation"></textarea>`;
    const [f] = snapshotFields(document);
    expect(f.tag).toBe('textarea');
    expect(f.ariaLabel).toBe('Lettre de motivation');
  });
});
