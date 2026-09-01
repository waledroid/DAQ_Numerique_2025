import { snapshotFields } from '../content/snapshot';
import { applyMatches, currentAnswer } from '../content/fill';
import {
  clearUi, hidePilotUi, highlightField, mountSidebar, setLauncherState, showApplyButton,
  showPilotControls, showPilotStatus, showPrompt, showSaveChip, showSubmitConfirm, showSummary,
  showToast,
} from '../content/ui';
import {
  clearPilot, clickOnce, fillPasswords, findAccountSubmit, findApplyCta, findConsentAccept,
  findNextButton, findSubmitCandidate, hasCaptcha, loadPilot, looksEmailVerification, savePilot,
  tickConsentBoxes, type PilotState,
} from '../content/pilot';
import { classifyPage, type PageSignals } from '../engine/pagestate';
import { generatePassword } from '../engine/password';
import {
  clearPendingSubmit, clearSession, extractJobMeta, isSubmitButton, loadPendingSubmit,
  loadSession, looksCompleted, savePendingSubmit, saveSession,
} from '../content/session';
import { matchFields } from '../engine/matcher';
import { APPLICATION_THRESHOLD, scoreApplicationPage } from '../engine/detection';
import { makeLearned } from '../engine/learned';
import {
  addApplication, addLearnedAnswer, listProfiles, loadCredential, loadLearned, loadProfile,
  loadSettings, loadStoredFile, saveCredential, saveSettings, switchProfile,
} from '../lib/storage';
import { detectLang, t } from '../lib/i18n';
import type { FieldSnapshot, Lang } from '../engine/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  allFrames: true,
  async main() {
    try {
      await boot();
    } catch (e) {
      // Never break the host page: disable izifill here and stay quiet.
      console.warn('[izifill] disabled on this page:', e);
    }
  },
});

let lang: Lang = 'en';
let filling = false;
let hadForms = false;
let watchersInstalled = false;
let lastPromptedUrl = '';
let lastLoggedState = '';

// After the extension is reloaded/updated, an old content script left on the
// page throws "Extension context invalidated" on any chrome.* call. Detect
// that so our periodic loops can stop quietly instead of spamming errors.
function extensionAlive(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

// A setInterval that clears itself once the extension context is gone.
function safeInterval(fn: () => void, ms: number): void {
  const id = setInterval(() => {
    if (!extensionAlive()) {
      clearInterval(id);
      return;
    }
    try {
      fn();
    } catch {
      // ignore transient errors from a page navigating/tearing down
    }
  }, ms);
}

async function boot(): Promise<void> {
  if (window.top !== window && document.querySelectorAll('input, select, textarea').length < 3) {
    return; // skip trivial iframes (ads, widgets); real embedded application forms still qualify
  }
  const settings = await loadSettings();
  lang = settings.locale ?? detectLang();
  console.info('[izifill] running on', location.hostname, '| top frame:', window.top === window);
  if (settings.disabledDomains.includes(location.hostname)) {
    console.info('[izifill] this domain is disabled (Jamais sur ce site)');
    return;
  }

  chrome.runtime.onMessage.addListener((msg: { type?: string }) => {
    if (msg?.type === 'izifill:fill') startSession();
  });

  const pending = loadPendingSubmit();
  if (pending) {
    clearPendingSubmit();
    if (Date.now() - pending.at < 30_000 && loadSession()?.active &&
        looksCompleted(document, false, pending.hadForms)) {
      await addApplication({
        company: pending.company, title: pending.title, domain: pending.domain,
        url: pending.url, date: new Date().toISOString(), status: 'applied',
      });
      showToast(t('applicationTracked', lang));
      clearSession();
      clearUi();
      return;
    }
  }

  // Keep a fill session alive across every page of an application until submit.
  // Only drop it when it is genuinely stale: older than the TTL, or when we've
  // clearly landed on a *new* job posting (a fresh apply flow starting over).
  const SESSION_TTL_MS = 30 * 60_000;
  const bootState = classifyPage(pageSignals());
  const pilot = loadPilot();
  if (pilot?.active) {
    const fresh = Date.now() - pilot.startedAt < SESSION_TTL_MS;
    if (fresh && bootState !== 'posting') {
      console.info('[izifill] resuming pilot on', bootState);
      setLauncherState('active');
      startSession();
      await resumePilot();
      return;
    }
    console.info('[izifill] clearing stale pilot on', bootState);
    clearPilot();
  }
  const sess = loadSession();
  if (sess?.active) {
    const age = Date.now() - new Date(sess.startedAt).getTime();
    const fresh = age >= 0 && age < SESSION_TTL_MS;
    if (fresh && bootState !== 'posting') {
      console.info('[izifill] resuming session on', bootState, '— still filling until submit');
      setLauncherState('active');
      startSession();
      return;
    }
    console.info('[izifill] clearing stale session on', bootState);
    clearSession();
  }

  await maybeOfferFill();

  // Keep looking for a short window after load and after each SPA navigation:
  // many job sites (React/Vue SPAs like Welcome to the Jungle) render the apply
  // button or form only after hydration, with no URL change to trigger a recheck.
  let lastSeenUrl = location.href;
  let scanUntil = Date.now() + 30_000;
  safeInterval(() => {
    if (location.href !== lastSeenUrl) {
      lastSeenUrl = location.href;
      lastPromptedUrl = '';
      scanUntil = Date.now() + 30_000;
    }
    if (Date.now() <= scanUntil) void maybeOfferFill();
  }, 1200);
}

async function ensureSidebarMounted(): Promise<void> {
  if (document.getElementById('izifill-root')?.shadowRoot?.querySelector('.sidebar')) return;
  const reg = await listProfiles();
  mountSidebar(lang, {
    profiles: reg.list,
    activeId: reg.activeId,
    onProfileChange: (id) => void switchProfile(id),
    onFill: startSession,
    onOpenProfile: () => void chrome.runtime.sendMessage({ type: 'izifill:open', page: 'onboarding' }),
    onOpenTracker: () => void chrome.runtime.sendMessage({ type: 'izifill:open', page: 'tracker' }),
  });
}

function pageSignals(): PageSignals {
  const cta = findApplyCta(document);
  return {
    url: location.href,
    title: document.title,
    text: (document.body?.innerText ?? '').slice(0, 20000),
    fieldCount: document.querySelectorAll('input, select, textarea').length,
    hasFileInput: document.querySelector('input[type="file"]') !== null,
    passwordFieldCount: document.querySelectorAll('input[type="password"]').length,
    hasApplyCta: cta !== null,
    hasApplyLink: isApplyLink(cta),
  };
}

// True when the apply control navigates to a separate application (an <a href>
// or a button that isn't a form submit) rather than submitting an inline form.
function isApplyLink(cta: HTMLElement | null): boolean {
  if (!cta) return false;
  if (cta.tagName === 'A') return cta.hasAttribute('href');
  const type = (cta.getAttribute('type') || '').toLowerCase();
  if (cta.tagName === 'BUTTON') return type !== 'submit';
  if (cta.tagName === 'INPUT') return type !== 'submit';
  return true; // role="button" on a div/span, etc.
}

async function maybeOfferFill(): Promise<void> {
  if (loadSession()?.active || loadPilot()?.active) return;
  if (location.href === lastPromptedUrl) return;
  if ((await loadSettings()).disabledDomains.includes(location.hostname)) return;
  const signals = pageSignals();
  const state = classifyPage(signals);
  if (state !== lastLoggedState) {
    lastLoggedState = state;
    console.info('[izifill] scan →', state, '| fields:', signals.fieldCount,
      '| pw:', signals.passwordFieldCount, '| applyCta:', signals.hasApplyCta,
      '| score:', scoreApplicationPage(signals));
  }
  if (state === 'posting') {
    lastPromptedUrl = location.href;
    await ensureSidebarMounted();
    setLauncherState('ready');
    showApplyButton(lang, () => void startPilot());
    return;
  }
  if (state === 'application' || scoreApplicationPage(signals) >= APPLICATION_THRESHOLD) {
    lastPromptedUrl = location.href;
    await ensureSidebarMounted();
    setLauncherState('ready');
    showPrompt(lang, startSession, async () => {
      const s = await loadSettings();
      if (!s.disabledDomains.includes(location.hostname)) s.disabledDomains.push(location.hostname);
      await saveSettings(s);
      clearUi();
    });
  }
}

function startSession(): void {
  void ensureSidebarMounted();
  setLauncherState('active');
  const sess = loadSession() ?? { active: true, step: 0, startedAt: new Date().toISOString() };
  sess.active = true;
  saveSession(sess);
  void fillStep();
  installWatchers();
}

interface FillCounts { filled: number; uncertain: number; unknown: number }

async function fillStep(): Promise<FillCounts | null> {
  if (filling) return null;
  filling = true;
  try {
    hadForms = document.querySelectorAll('form').length > 0;
    const fields = snapshotFields(document);
    const [profile, learned, cv, coverLetter] = await Promise.all([
      loadProfile(), loadLearned(), loadStoredFile('cv'), loadStoredFile('coverLetter'),
    ]);
    const matches = matchFields(fields, profile, learned);
    const outcomes = applyMatches(document, fields, matches, { cv, coverLetter });
    let filled = 0;
    let uncertain = 0;
    let unknown = 0;
    for (const o of outcomes) {
      if (!o.el) continue;
      if (o.status === 'filled') { filled++; highlightField(o.el, 'filled'); }
      else if (o.status === 'uncertain') { uncertain++; highlightField(o.el, 'uncertain'); }
      else if (o.status === 'unknown') {
        unknown++;
        highlightField(o.el, 'unknown');
        attachLearner(o.el, fields.find((f) => f.ref === o.ref));
      }
    }
    if (filled + uncertain + unknown > 0) showSummary(lang, { filled, uncertain, unknown });
    return { filled, uncertain, unknown };
  } finally {
    filling = false;
  }
}

function attachLearner(el: HTMLElement, field?: FieldSnapshot): void {
  if (!field || el.dataset.izifillLearn) return;
  el.dataset.izifillLearn = '1';
  const question = field.label || field.ariaLabel || field.placeholder;
  if (!question) return;
  const offer = (): void => {
    const value = currentAnswer(el, field).trim();
    if (!value) return;
    showSaveChip(el, lang, async () => {
      await addLearnedAnswer(makeLearned(question, value, lang));
      showToast(t('answerSaved', lang));
    });
  };
  if (field.type === 'radio') {
    el.ownerDocument
      .querySelectorAll<HTMLInputElement>(`input[type="radio"][data-izifill-ref="${field.ref}"]`)
      .forEach((r) => r.addEventListener('change', offer));
  } else if (field.tag === 'select') {
    el.addEventListener('change', offer);
  } else {
    el.addEventListener('blur', offer);
  }
}

function installWatchers(): void {
  if (watchersInstalled) return;
  watchersInstalled = true;

  let lastUrl = location.href;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const rescan = () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      if (extensionAlive() && loadSession()?.active) void fillStep();
    }, 800);
  };

  const observer = new MutationObserver((muts) => {
    if (!extensionAlive()) {
      observer.disconnect();
      return;
    }
    // Ignore mutations caused by our own floating UI.
    if (muts.every((m) => (m.target as Element).closest?.('#izifill-root'))) return;
    rescan();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  safeInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const s = loadSession();
      if (s?.active) {
        s.step++;
        saveSession(s);
        rescan();
      }
    }
  }, 500);

  document.addEventListener('click', onDocClick, true);
}

function onDocClick(e: MouseEvent): void {
  if (!loadSession()?.active) return;
  const target = e.target as Element | null;
  if (!target || !isSubmitButton(target)) return;
  const urlAtClick = location.href;
  const meta = extractJobMeta(document, urlAtClick);
  const hadFormsAtClick = hadForms;
  savePendingSubmit({ ...meta, url: urlAtClick, at: Date.now(), hadForms: hadFormsAtClick });
  const started = Date.now();
  const timer = setInterval(() => {
    if (!extensionAlive() || !loadSession()?.active) {
      clearInterval(timer);
      return;
    }
    if (looksCompleted(document, false, hadFormsAtClick)) {
      clearInterval(timer);
      void recordApplication(meta, urlAtClick);
    } else if (Date.now() - started > 8000) {
      clearInterval(timer); // not the final submit (e.g. an "Apply" that opened the form)
      clearPendingSubmit();
    }
  }, 400);
}

async function recordApplication(
  meta: { company: string; title: string; domain: string },
  url: string,
): Promise<void> {
  clearSession(); // first, so concurrent timers can't double-record
  clearPendingSubmit();
  await addApplication({ ...meta, url, date: new Date().toISOString(), status: 'applied' });
  showToast(t('applicationTracked', lang));
  clearUi();
}

// --- Pilot mode: one click drives apply → account → fill → confirm ----------

let pilotTimer: ReturnType<typeof setInterval> | undefined;
let pilotBusy = false;

const PILOT_MAX_MS = 15 * 60_000;
const PILOT_STUCK_MS = 12_000;

function fr(frText: string, enText: string): string {
  return lang === 'fr' ? frText : enText;
}

async function startPilot(): Promise<void> {
  savePilot({ active: true, paused: false, stage: 'starting', startedAt: Date.now(), lastClickAt: Date.now(), clicked: [] });
  await ensureSidebarMounted();
  startSession();
  renderPilotControls();
  showPilotStatus(lang, fr('Ouverture de la candidature…', 'Opening the application…'));
  const cta = findApplyCta(document);
  const p = loadPilot();
  if (cta && p) clickOnce(cta, p, 'apply:' + (cta.textContent ?? ''));
  beginPilotLoop();
}

async function resumePilot(): Promise<void> {
  await ensureSidebarMounted();
  renderPilotControls();
  beginPilotLoop();
}

function renderPilotControls(): void {
  const p = loadPilot();
  showPilotControls(lang, {
    paused: p?.paused ?? false,
    onPause: () => {
      const st = loadPilot();
      if (st) {
        st.paused = true;
        savePilot(st);
        showPilotStatus(lang, fr('En pause', 'Paused'));
        renderPilotControls();
      }
    },
    onResume: () => {
      const st = loadPilot();
      if (st) {
        st.paused = false;
        st.pauseReason = undefined;
        st.lastClickAt = Date.now();
        savePilot(st);
        showPilotStatus(lang, fr('Reprise…', 'Resuming…'));
        renderPilotControls();
      }
    },
    onStop: stopPilot,
  });
}

function stopPilot(): void {
  clearPilot();
  if (pilotTimer) {
    clearInterval(pilotTimer);
    pilotTimer = undefined;
  }
  hidePilotUi();
  setLauncherState('active'); // a plain fill session may still be running
  showPilotStatus(lang, fr('Pilote arrêté — izifill continue de remplir.', 'Pilot stopped — izifill keeps filling.'));
}

function pausePilot(reason: string): void {
  const p = loadPilot();
  if (!p) return;
  p.paused = true;
  p.pauseReason = reason;
  savePilot(p);
  showPilotStatus(lang, reason);
  renderPilotControls();
}

function beginPilotLoop(): void {
  if (pilotTimer) return;
  pilotTimer = setInterval(() => void pilotTick(), 1200);
  void pilotTick();
}

async function pilotTick(): Promise<void> {
  const p = loadPilot();
  if (!p?.active || !extensionAlive()) {
    if (pilotTimer) {
      clearInterval(pilotTimer);
      pilotTimer = undefined;
    }
    return;
  }
  if (p.paused || pilotBusy || p.stage === 'confirm') return;
  if (Date.now() - p.startedAt > PILOT_MAX_MS) {
    stopPilot();
    return;
  }
  pilotBusy = true;
  try {
    if (hasCaptcha(document)) {
      pausePilot(fr('CAPTCHA détecté — résolvez-le puis Reprendre.', 'CAPTCHA detected — solve it, then Resume.'));
      return;
    }
    const bodyText = (document.body?.innerText ?? '').slice(0, 20000);
    if (looksEmailVerification(bodyText)) {
      pausePilot(fr('Vérifiez votre boîte mail, puis Reprendre.', 'Check your inbox, then Resume.'));
      return;
    }
    // Tick required terms/privacy consent and click through consent/cookie gates.
    const ticked = tickConsentBoxes(document);
    if (ticked > 0) showPilotStatus(lang, fr('Conditions acceptées…', 'Consent accepted…'));
    const state = classifyPage(pageSignals());
    // On a page that is neither an account nor an application form, a consent /
    // cookie "Accept" wall may be blocking progress — click it once.
    if (state !== 'signup' && state !== 'login' && state !== 'application') {
      const accept = findConsentAccept(document);
      if (accept && clickOnce(accept, p, 'consent:' + location.href + ':' + (accept.textContent ?? ''))) {
        showPilotStatus(lang, fr('Bandeau accepté…', 'Accepted the banner…'));
        return;
      }
    }
    if (state === 'signup' || state === 'login') await pilotAccount(state, p);
    else if (state === 'application') await pilotFill(p);
    else {
      showPilotStatus(lang, fr('En attente de la page…', 'Waiting for the page…'));
      if (Date.now() - p.lastClickAt > PILOT_STUCK_MS && p.stage !== 'starting') {
        pausePilot(fr('Je ne reconnais pas cette page — continuez à la main puis Reprendre.',
          'I don’t recognize this page — continue manually, then Resume.'));
      }
    }
  } finally {
    pilotBusy = false;
  }
}

async function pilotAccount(kind: 'signup' | 'login', p: PilotState): Promise<void> {
  p.stage = 'account';
  savePilot(p);
  showPilotStatus(lang, kind === 'signup'
    ? fr('Création du compte…', 'Creating the account…')
    : fr('Connexion…', 'Logging in…'));
  await fillStep();
  let cred = await loadCredential(location.hostname);
  if (!cred) {
    if (kind === 'login') {
      pausePilot(fr('Aucun identifiant connu pour ce site — connectez-vous puis Reprendre.',
        'No saved credentials for this site — log in, then Resume.'));
      return;
    }
    const profile = await loadProfile();
    cred = {
      domain: location.hostname,
      email: profile.contact.email,
      password: generatePassword(),
      createdAt: new Date().toISOString(),
    };
    await saveCredential(cred);
    showToast(fr('Mot de passe généré (stocké sur cet ordinateur)', 'Password generated (stored on this computer)'));
  }
  const n = fillPasswords(document, cred.password);
  if (n === 0) return; // page is transitioning
  const btn = findAccountSubmit(document);
  if (btn) {
    const id = 'account:' + location.href;
    if (!clickOnce(btn, p, id) && Date.now() - p.lastClickAt > PILOT_STUCK_MS) {
      pausePilot(fr('Le compte ne se crée pas — terminez à la main puis Reprendre.',
        'Account step is stuck — finish manually, then Resume.'));
    }
  } else if (Date.now() - p.lastClickAt > PILOT_STUCK_MS) {
    pausePilot(fr('Bouton du compte introuvable — cliquez-le puis Reprendre.',
      'Could not find the account button — click it, then Resume.'));
  }
}

async function pilotFill(p: PilotState): Promise<void> {
  p.stage = 'filling';
  savePilot(p);
  const counts = await fillStep();
  if (!counts) return;
  if (counts.unknown > 0) {
    pausePilot(fr(`${counts.unknown} champ(s) à compléter — répondez puis Reprendre.`,
      `${counts.unknown} field(s) need you — answer, then Resume.`));
    return;
  }
  const next = findNextButton(document);
  if (next) {
    const id = 'next:' + location.href + ':' + (next.textContent ?? '');
    if (!clickOnce(next, p, id) && Date.now() - p.lastClickAt > PILOT_STUCK_MS) {
      pausePilot(fr('L’étape ne s’avance pas — cliquez Suivant puis Reprendre.',
        'The step won’t advance — click Next, then Resume.'));
    }
    return;
  }
  const submit = findSubmitCandidate(document);
  if (submit) {
    p.stage = 'confirm';
    savePilot(p);
    showPilotStatus(lang, fr('Prêt à envoyer.', 'Ready to send.'));
    showSubmitConfirm(lang,
      () => {
        const st = loadPilot();
        if (st) clickOnce(submit, st, 'submit:' + location.href);
        clearPilot();
        hidePilotUi();
      },
      () => {
        showPilotStatus(lang, fr('Cliquez sur Envoyer quand vous êtes prêt.', 'Click Send when you are ready.'));
        clearPilot();
        hidePilotUi();
      });
    return;
  }
  if (Date.now() - p.lastClickAt > PILOT_STUCK_MS) {
    pausePilot(fr('Ni Suivant ni Envoyer trouvés — continuez à la main puis Reprendre.',
      'No Next or Send button found — continue manually, then Resume.'));
  }
}
