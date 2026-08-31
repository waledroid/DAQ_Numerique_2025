import { normalize } from '../engine/normalize';

const SESSION_KEY = 'izifill_session';

export interface SessionState {
  active: boolean;
  step: number;
  startedAt: string;
}

export function loadSession(): SessionState | null {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function saveSession(s: SessionState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // sessionStorage unavailable (sandboxed iframe) — session just won't persist
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export const SUBMIT_WORDS = [
  'envoyer ma candidature', 'envoyer la candidature', 'valider ma candidature',
  'soumettre ma candidature', 'envoyer', 'soumettre', 'postuler',
  'submit application', 'submit my application', 'send application', 'submit', 'send',
];

export function isSubmitButton(target: Element): boolean {
  const btn = target.closest('button, input[type="submit"], input[type="button"], a[role="button"], [role="button"]');
  if (!btn) return false;
  const raw = btn.textContent || (btn as HTMLInputElement).value || btn.getAttribute('aria-label') || '';
  const txt = normalize(raw);
  if (!txt || txt.length > 60) return false;
  return SUBMIT_WORDS.some((w) => txt === w || txt.includes(w));
}

export function extractJobMeta(doc: Document, url: string): { company: string; title: string; domain: string } {
  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch {
    // keep empty
  }
  const og = (p: string) => doc.querySelector(`meta[property="${p}"]`)?.getAttribute('content') ?? '';
  let title = og('og:title') || doc.title || '';
  let company = og('og:site_name');
  const parts = title.split(/\s[-–—]\s|[|·]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    title = parts[0];
    if (!company) company = parts[parts.length - 1];
  }
  if (!company) company = domain.replace(/^www\./, '').split('.')[0] ?? '';
  return { company, title, domain };
}

const THANKS = [
  'merci', 'candidature envoyee', 'candidature a bien ete', 'nous avons bien recu',
  'thank you', 'application received', 'successfully submitted', 'application submitted',
];

export function looksCompleted(doc: Document, urlChanged: boolean, hadForms: boolean): boolean {
  if (urlChanged) return true;
  const text = normalize((doc.body?.textContent ?? '').slice(0, 4000));
  if (THANKS.some((w) => text.includes(w))) return true;
  if (hadForms && doc.querySelectorAll('form').length === 0) return true;
  return false;
}

const PENDING_KEY = 'izifill_pending_submit';

export interface PendingSubmit {
  company: string;
  title: string;
  domain: string;
  url: string;
  at: number;
  hadForms: boolean;
}

export function savePendingSubmit(p: PendingSubmit): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function loadPendingSubmit(): PendingSubmit | null {
  try {
    return JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function clearPendingSubmit(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}
