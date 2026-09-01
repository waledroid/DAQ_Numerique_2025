import { normalize } from '../engine/normalize';
import { isApplyCta } from '../engine/pagestate';
import { isSubmitButton } from './session';
import { setNativeValue } from './fill';

const PILOT_KEY = 'izifill_pilot';

export interface PilotState {
  active: boolean;
  paused: boolean;
  stage: 'starting' | 'account' | 'filling' | 'confirm';
  startedAt: number;
  lastClickAt: number;
  clicked: string[];
  pauseReason?: string;
}

export function loadPilot(): PilotState | null {
  try {
    return JSON.parse(sessionStorage.getItem(PILOT_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function savePilot(p: PilotState): void {
  try {
    sessionStorage.setItem(PILOT_KEY, JSON.stringify(p));
  } catch {
    // sessionStorage unavailable — pilot just won't survive navigation
  }
}

export function clearPilot(): void {
  try {
    sessionStorage.removeItem(PILOT_KEY);
  } catch {
    // ignore
  }
}

const CANDIDATES = 'button, a, input[type="submit"], input[type="button"], [role="button"]';

function buttonText(el: HTMLElement): string {
  return el.textContent || (el as HTMLInputElement).value || el.getAttribute('aria-label') || '';
}

function usableCandidates(doc: Document): HTMLElement[] {
  return Array.from(doc.querySelectorAll<HTMLElement>(CANDIDATES)).filter(
    (el) => !(el as HTMLButtonElement).disabled,
  );
}

export function findApplyCta(doc: Document): HTMLElement | null {
  for (const el of usableCandidates(doc)) {
    if (isApplyCta(buttonText(el))) return el;
  }
  return null;
}

const NEXT_WORDS = ['suivant', 'continuer', 'continue', 'next', 'etape suivante', 'poursuivre'];

export function findNextButton(doc: Document): HTMLElement | null {
  for (const el of usableCandidates(doc)) {
    const t = normalize(buttonText(el));
    if (!t || t.length > 30) continue;
    if (isSubmitButton(el)) continue;
    if (NEXT_WORDS.some((w) => t === w || (' ' + t + ' ').includes(' ' + w + ' '))) return el;
  }
  return null;
}

export function findSubmitCandidate(doc: Document): HTMLElement | null {
  for (const el of usableCandidates(doc)) {
    if (isSubmitButton(el)) return el;
  }
  return null;
}

const ACCOUNT_SUBMIT_WORDS = [
  'creer mon compte', 'creer un compte', 'create account', 'create my account',
  'sign up', 's inscrire', 'register', 'se connecter', 'log in', 'login', 'sign in',
  'connexion', 'continuer', 'continue',
];

export function findAccountSubmit(doc: Document): HTMLElement | null {
  for (const el of usableCandidates(doc)) {
    const t = normalize(buttonText(el));
    if (!t || t.length > 40) continue;
    if (ACCOUNT_SUBMIT_WORDS.some((w) => t === w || (' ' + t + ' ').includes(' ' + w + ' '))) return el;
  }
  return null;
}

export function hasCaptcha(doc: Document): boolean {
  return (
    doc.querySelector(
      'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .g-recaptcha, .h-captcha, [class*="captcha"]',
    ) !== null
  );
}

const VERIFY_WORDS = [
  'verifiez votre boite mail', 'verifiez votre email', 'verifiez vos emails',
  'check your email', 'check your inbox', 'verify your email',
  'lien de confirmation', 'email de confirmation', 'confirmation email',
];

export function looksEmailVerification(text: string): boolean {
  const t = ' ' + normalize(text) + ' ';
  return VERIFY_WORDS.some((w) => t.includes(' ' + w + ' '));
}

// Clicks a page control at most once per pilot session, tracked by id.
export function clickOnce(el: HTMLElement, state: PilotState, id: string): boolean {
  if (state.clicked.includes(id)) return false;
  state.clicked.push(id);
  state.lastClickAt = Date.now();
  savePilot(state);
  el.click();
  return true;
}

// Text near a checkbox that marks it a required consent (terms/privacy) vs. an
// optional marketing opt-in we must leave alone.
const CONSENT_WORDS = [
  'terms', 'term of use', 'terms of use', 'terms and conditions', 'conditions',
  'conditions generales', 'i agree', 'agree', 'consent', 'privacy', 'data privacy',
  'personal data', 'donnees personnelles', 'gdpr', 'rgpd', 'confidentialite',
  'traitement des donnees', 'read and accept', 'lu et accepte', 'declaration',
  'politique de confidentialite', 'protection des donnees',
];
const MARKETING_WORDS = [
  'newsletter', 'marketing', 'promotional', 'promotions', 'offres commerciales',
  'communications commerciales', 'third party', 'partenaires', 'remember me',
  'se souvenir', 'stay signed in',
];

function checkboxLabel(cb: HTMLInputElement): string {
  const doc = cb.ownerDocument;
  if (cb.id) {
    try {
      const l = doc.querySelector(`label[for="${cb.id}"]`);
      if (l?.textContent) return l.textContent;
    } catch {
      // invalid id for a selector — fall through
    }
  }
  const wrap = cb.closest('label');
  if (wrap?.textContent) return wrap.textContent;
  const aria = cb.getAttribute('aria-label');
  if (aria) return aria;
  return cb.parentElement?.textContent ?? '';
}

// Ticks required terms/privacy consent checkboxes (never marketing opt-ins).
// Returns how many it ticked.
export function tickConsentBoxes(doc: Document): number {
  let ticked = 0;
  doc.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => {
    if (cb.disabled || cb.checked) return;
    const txt = normalize(checkboxLabel(cb));
    if (!txt) return;
    const isMarketing = MARKETING_WORDS.some((w) => txt.includes(w));
    const isConsent = CONSENT_WORDS.some((w) => txt.includes(w));
    if (isConsent && !isMarketing) {
      cb.click();
      ticked++;
    }
  });
  return ticked;
}

const ACCEPT_WORDS = [
  'tout accepter', 'accept all', 'accepter tout', 'i accept', 'i agree', 'accept',
  'accepter', 'j accepte', 'agree', 'got it', 'ok', 'compris', 'allow all', 'confirmer',
];

// A consent/cookie "Accept" control to click through a gate (includes SAPUI5
// span[role=button]).
export function findConsentAccept(doc: Document): HTMLElement | null {
  for (const el of usableCandidates(doc)) {
    const t = normalize(buttonText(el));
    if (!t || t.length > 24) continue;
    if (ACCEPT_WORDS.some((w) => t === w || (' ' + t + ' ').includes(' ' + w + ' '))) return el;
  }
  return null;
}

export function fillPasswords(doc: Document, password: string): number {
  const inputs = Array.from(doc.querySelectorAll<HTMLInputElement>('input[type="password"]')).filter(
    (i) => !i.disabled,
  );
  for (const input of inputs) setNativeValue(input, password);
  return inputs.length;
}
