import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSession, saveSession, clearSession, isSubmitButton, extractJobMeta, looksCompleted,
} from '../../src/content/session';

beforeEach(() => {
  sessionStorage.clear();
  document.body.innerHTML = '';
});

describe('session storage', () => {
  it('round-trips and clears', () => {
    expect(loadSession()).toBeNull();
    saveSession({ active: true, step: 2, startedAt: '2026-08-31T10:00:00Z' });
    expect(loadSession()?.step).toBe(2);
    clearSession();
    expect(loadSession()).toBeNull();
  });
});

describe('isSubmitButton', () => {
  it('recognizes FR and EN submit buttons, including clicks on inner spans', () => {
    document.body.innerHTML = `
      <button id="fr"><span>Envoyer ma candidature</span></button>
      <input id="en" type="submit" value="Submit application">
      <button id="next">Suivant</button>`;
    expect(isSubmitButton(document.querySelector('#fr span')!)).toBe(true);
    expect(isSubmitButton(document.getElementById('en')!)).toBe(true);
    expect(isSubmitButton(document.getElementById('next')!)).toBe(false);
  });
  it('returns false for non-button elements', () => {
    document.body.innerHTML = '<p>Envoyer</p>';
    expect(isSubmitButton(document.querySelector('p')!)).toBe(false);
  });
});

describe('extractJobMeta', () => {
  it('uses og tags when present', () => {
    document.head.innerHTML = `
      <meta property="og:title" content="Développeur Web - ACME">
      <meta property="og:site_name" content="ACME Careers">`;
    const m = extractJobMeta(document, 'https://jobs.acme.fr/postuler');
    expect(m.company).toBe('ACME Careers');
    expect(m.title).toBe('Développeur Web');
    expect(m.domain).toBe('jobs.acme.fr');
    document.head.innerHTML = '';
  });
  it('falls back to document title and domain', () => {
    document.title = 'Data Analyst | BigCorp';
    const m = extractJobMeta(document, 'https://www.bigcorp.com/careers/apply');
    expect(m.title).toBe('Data Analyst');
    expect(m.company).toBe('BigCorp');
  });
});

describe('looksCompleted', () => {
  it('is true on URL change', () => {
    expect(looksCompleted(document, true, true)).toBe(true);
  });
  it('is true on thank-you text', () => {
    document.body.innerHTML = '<h1>Merci ! Votre candidature a bien été envoyée.</h1>';
    expect(looksCompleted(document, false, false)).toBe(true);
  });
  it('is true when forms disappear', () => {
    document.body.innerHTML = '<p>...</p>';
    expect(looksCompleted(document, false, true)).toBe(true);
  });
  it('is false while the form is still there', () => {
    document.body.innerHTML = '<form><input></form>';
    expect(looksCompleted(document, false, true)).toBe(false);
  });
});
