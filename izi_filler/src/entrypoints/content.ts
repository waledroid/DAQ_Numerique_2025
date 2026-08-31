import { snapshotFields } from '../content/snapshot';
import { applyMatches } from '../content/fill';
import {
  clearUi, highlightField, showPrompt, showSaveChip, showSummary, showToast,
} from '../content/ui';
import {
  clearPendingSubmit, clearSession, extractJobMeta, isSubmitButton, loadPendingSubmit,
  loadSession, looksCompleted, savePendingSubmit, saveSession,
} from '../content/session';
import { matchFields } from '../engine/matcher';
import { APPLICATION_THRESHOLD, scoreApplicationPage } from '../engine/detection';
import { makeLearned } from '../engine/learned';
import {
  addApplication, addLearnedAnswer, loadLearned, loadProfile, loadSettings,
  loadStoredFile, saveSettings,
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

async function boot(): Promise<void> {
  if (window.top !== window && document.querySelectorAll('input, select, textarea').length < 3) {
    return; // skip trivial iframes (ads, widgets); real embedded application forms still qualify
  }
  const settings = await loadSettings();
  lang = settings.locale ?? detectLang();
  if (settings.disabledDomains.includes(location.hostname)) return;

  chrome.runtime.onMessage.addListener((msg: { type?: string }) => {
    if (msg?.type === 'izifill:fill') startSession();
  });

  const pending = loadPendingSubmit();
  if (pending) {
    clearPendingSubmit();
    if (Date.now() - pending.at < 30_000 && loadSession()?.active &&
        (location.href !== pending.url || looksCompleted(document, false, pending.hadForms))) {
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

  if (loadSession()?.active) {
    startSession();
    return;
  }

  const info = {
    url: location.href,
    title: document.title,
    text: (document.body?.innerText ?? '').slice(0, 20000),
    fieldCount: document.querySelectorAll('input, select, textarea').length,
    hasFileInput: document.querySelector('input[type="file"]') !== null,
  };
  if (scoreApplicationPage(info) >= APPLICATION_THRESHOLD) {
    showPrompt(lang, startSession, async () => {
      const s = await loadSettings();
      if (!s.disabledDomains.includes(location.hostname)) s.disabledDomains.push(location.hostname);
      await saveSettings(s);
      clearUi();
    });
  }
}

function startSession(): void {
  const sess = loadSession() ?? { active: true, step: 0, startedAt: new Date().toISOString() };
  sess.active = true;
  saveSession(sess);
  void fillStep();
  installWatchers();
}

async function fillStep(): Promise<void> {
  if (filling) return;
  filling = true;
  try {
    hadForms = document.querySelectorAll('form').length > 0;
    const fields = snapshotFields(document);
    const [profile, learned, cv] = await Promise.all([loadProfile(), loadLearned(), loadStoredFile('cv')]);
    const matches = matchFields(fields, profile, learned);
    const outcomes = applyMatches(document, fields, matches, { cv });
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
  } finally {
    filling = false;
  }
}

function attachLearner(el: HTMLElement, field?: FieldSnapshot): void {
  if (!field || el.dataset.izifillLearn) return;
  el.dataset.izifillLearn = '1';
  el.addEventListener('blur', () => {
    const value = (el as HTMLInputElement).value?.trim();
    const question = field.label || field.ariaLabel || field.placeholder;
    if (!value || !question) return;
    showSaveChip(el, lang, async () => {
      await addLearnedAnswer(makeLearned(question, value, lang));
      showToast(t('answerSaved', lang));
    });
  });
}

function installWatchers(): void {
  if (watchersInstalled) return;
  watchersInstalled = true;

  let lastUrl = location.href;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const rescan = () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      if (loadSession()?.active) void fillStep();
    }, 800);
  };

  new MutationObserver((muts) => {
    // Ignore mutations caused by our own floating UI.
    if (muts.every((m) => (m.target as Element).closest?.('#izifill-root'))) return;
    rescan();
  }).observe(document.documentElement, { childList: true, subtree: true });

  setInterval(() => {
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
    if (!loadSession()?.active) {
      clearInterval(timer);
      return;
    }
    if (looksCompleted(document, location.href !== urlAtClick, hadFormsAtClick)) {
      clearInterval(timer);
      void recordApplication(meta, urlAtClick);
    } else if (Date.now() - started > 8000) {
      clearInterval(timer); // not the final submit (e.g. an "Apply" that opened the form)
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
