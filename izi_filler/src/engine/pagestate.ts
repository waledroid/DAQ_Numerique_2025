import { normalize } from './normalize';
import { APPLICATION_THRESHOLD, scoreApplicationPage, type PageInfo } from './detection';

export type PageState = 'posting' | 'signup' | 'login' | 'application' | 'other';

export interface PageSignals extends PageInfo {
  passwordFieldCount: number;
  hasApplyCta: boolean;
}

const SIGNUP_WORDS = [
  'creer un compte', 'creer votre compte', 'creer mon compte', 'create account',
  'create an account', 'create your account', 'sign up', 'signup', 'inscription',
  's inscrire', 'register', 'nouveau compte',
];

const LOGIN_WORDS = [
  'se connecter', 'connectez vous', 'connexion', 'log in', 'login', 'sign in',
  'mot de passe oublie', 'forgot password', 'espace candidat',
];

export const APPLY_CTA_WORDS = [
  'postuler maintenant', 'postuler a cette offre', 'je postule', 'postuler', 'candidater',
  'deposer ma candidature', 'apply now', 'apply for this job', 'easy apply', 'apply',
  'candidature simplifiee',
];

export function isApplyCta(text: string): boolean {
  const t = normalize(text);
  if (!t || t.length > 40) return false;
  return APPLY_CTA_WORDS.some((w) => t === w || (' ' + t + ' ').includes(' ' + w + ' '));
}

export function classifyPage(s: PageSignals): PageState {
  const hay = ' ' + normalize(s.title + ' ' + s.text) + ' ';
  const has = (words: string[]): boolean => words.some((w) => hay.includes(' ' + w + ' '));
  if (s.passwordFieldCount >= 2) return 'signup';
  if (s.passwordFieldCount === 1) {
    return has(SIGNUP_WORDS) && !has(LOGIN_WORDS) ? 'signup' : 'login';
  }
  if (s.fieldCount >= 3 && scoreApplicationPage(s) >= APPLICATION_THRESHOLD) return 'application';
  if (s.hasApplyCta) return 'posting';
  return 'other';
}
