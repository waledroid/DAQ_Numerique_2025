import { describe, it, expect } from 'vitest';
import { classifyPage, isApplyCta, type PageSignals } from '../../src/engine/pagestate';

function signals(partial: Partial<PageSignals>): PageSignals {
  return {
    url: 'https://example.com', title: '', text: '', fieldCount: 0,
    hasFileInput: false, passwordFieldCount: 0, hasApplyCta: false,
    ...partial,
  };
}

describe('classifyPage', () => {
  it('detects a signup page (two password fields)', () => {
    expect(classifyPage(signals({ passwordFieldCount: 2, fieldCount: 5, text: 'Créez votre compte candidat' }))).toBe('signup');
  });
  it('detects a signup page (one password field + signup wording)', () => {
    expect(classifyPage(signals({ passwordFieldCount: 1, fieldCount: 3, text: 'Créer un compte pour postuler' }))).toBe('signup');
  });
  it('detects a login page', () => {
    expect(classifyPage(signals({ passwordFieldCount: 1, fieldCount: 2, text: 'Connectez-vous à votre espace candidat. Mot de passe oublié ?' }))).toBe('login');
  });
  it('detects an application form page', () => {
    expect(classifyPage(signals({
      url: 'https://jobs.example.fr/candidature/1',
      title: 'Postuler — Développeur',
      text: 'Merci de déposer votre CV et votre lettre de motivation pour postuler.',
      fieldCount: 8, hasFileInput: true,
    }))).toBe('application');
  });
  it('detects a job posting with an apply CTA', () => {
    expect(classifyPage(signals({
      url: 'https://example.fr/offre/dev',
      title: 'Développeur Web — CDI',
      text: 'Description du poste... Postuler',
      fieldCount: 1, hasApplyCta: true,
    }))).toBe('posting');
  });
  it('classifies a plain page as other', () => {
    expect(classifyPage(signals({ text: 'Recette de pâtes', fieldCount: 1 }))).toBe('other');
  });
});

describe('isApplyCta', () => {
  it('recognizes FR and EN apply CTAs', () => {
    expect(isApplyCta('Postuler')).toBe(true);
    expect(isApplyCta('Je postule')).toBe(true);
    expect(isApplyCta('Apply now')).toBe(true);
    expect(isApplyCta('Candidater')).toBe(true);
  });
  it('rejects unrelated or very long text', () => {
    expect(isApplyCta('Voir toutes les offres')).toBe(false);
    expect(isApplyCta('En cliquant sur postuler vous acceptez notre politique de traitement des données personnelles')).toBe(false);
    expect(isApplyCta('')).toBe(false);
  });
});
