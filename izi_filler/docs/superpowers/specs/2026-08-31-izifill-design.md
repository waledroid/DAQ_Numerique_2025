# izifill — Design Spec

**Date:** 2026-08-31
**Status:** Approved design, pre-implementation
**Product:** Chrome extension (Manifest V3) that detects job application pages and autofills them page-by-page from a locally stored user profile.

## 1. Goals & scope

- User fills a guided profile questionnaire once ("login" = the extension's own onboarding/profile page; no accounts, no server).
- On any job application page, izifill offers to fill; on acceptance it fills the visible step, waits for the user to click Next, re-fills each subsequent step, and detects the final submit.
- On submit, the application is saved to a built-in tracker (company, title, URL, date, editable status).
- Unknown/custom questions are learned: when the user answers one manually, izifill offers to save the Q→A pair and reuses it on similar questions later.
- Fully generic engine from day one (no per-site adapters), matching French and English form labels. UI localized FR/EN by browser locale.

**Non-goals (v1):** hosted web app, cloud accounts, AI-assisted matching, per-ATS adapters, auto-clicking next/submit, Firefox/Edge ports (Edge likely works as-is but is untested).

## 2. Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Data location | `chrome.storage.sync` (structured data), `chrome.storage.local` (files) | No server, syncs across user's Chrome browsers; 100KB sync quota excludes files |
| Site coverage | Fully generic heuristic engine | User choice; measured against real-form fixtures |
| Unknown fields | Heuristics + learn-as-you-go | Free, private, improves with use |
| Submit detection outcome | Save to application tracker | History of all applications with statuses |
| Languages | FR + EN (UI and label matching) | Job hunting in France; corporate portals often English |
| Toolchain | TypeScript + WXT (Vite-based), Vitest | Testable pure-TS engine, one-command build |
| Network | Zero network calls | Privacy is a feature and a constraint |

## 3. Architecture

Four parts, one TypeScript codebase:

### 3.1 Core engine (pure TS, no browser APIs)
- Input: a serialized snapshot of a page's fields — for each field: label text, placeholder, `name`, `id`, `autocomplete`, `aria-label`, input type, select/radio options, surrounding heading/legend text.
- Output: mapping of field → profile value with a confidence score (high / low / unknown).
- FR+EN synonym dictionaries (e.g. *Prénom / First name / Given name*).
- Learned-answer matcher: normalizes question text (lowercase, strip accents/punctuation/stopwords) and fuzzy-matches against saved `learnedAnswers`.
- Page-detection scorer: given page text/URL/form stats, returns a "this is a job application" score (keywords: candidature, postuler, apply, resume, CV, cover letter, motivation…; form density; URL hints like /apply, /jobs, /careers, /candidature).
- Pure functions throughout → unit-testable without a browser.

### 3.2 Content script (all pages)
- Runs detection on load **and** on SPA navigation (URL watcher + MutationObserver) — many ATS flows never reload.
- Above threshold → non-intrusive prompt: "izifill — Remplir cette page ? / Fill this page?" with Yes / Not this site (per-domain opt-out stored in settings).
- On yes: snapshot fields → engine → fill → overlay panel summarizing "N matched, M uncertain, K unknown".
- Filling dispatches proper events (`input`, `change`, using native value setters) so React/Vue/Angular forms accept the values.
- Visual highlights: green = filled (high confidence), orange = filled but uncertain, red = unknown, left for the user.
- Learn: on blur of a user-filled unknown field, offer one-click "Save this answer".
- Step advance: MutationObserver + URL watcher detect the new step after the user clicks Next/Suivant/Continuer; re-run scan→fill automatically. Session state persists across real page loads via `chrome.storage.session` keyed by tab id.
- Submit detection: click on a button matching *Submit/Envoyer/Postuler/Soumettre/Valider ma candidature* **and** flow-end evidence (URL change to confirmation, thank-you content, or form disappearance) → save tracker entry (company & title scraped from page title/headings, URL, domain, date) → toast "Application tracked ✔" → end session.
- izifill **never clicks next or submit itself**; the user always advances the flow.

### 3.3 Extension pages
- **Onboarding ("login") page:** first-run welcome → guided questionnaire with progress: identity, contact, address, work eligibility (permit, licence), links (LinkedIn, portfolio), experience[], education[], languages, skills, standard answers (salary, notice period, remote preference, cover-letter text), CV/cover-letter file upload. All fields optional; completion percentage shown.
- **Profile editor:** same form, revisit anytime; also lists/edits learned answers.
- **Tracker page:** table of applications, editable status (applied / interview / rejected / offer), link to posting.
- FR/EN via browser locale.

### 3.4 Service worker
- Message routing between content script and pages, storage wrapper access, action-badge updates (e.g. count of matched fields / session active).

## 4. Data model

`chrome.storage.sync` (quota-aware, chunked):
- `profile`: identity, contact, address, eligibility, links, experience[], education[], languages[], skills[], standardAnswers{}.
- `learnedAnswers[]`: `{ questionText, normalizedKey, answer, lang, timesUsed, lastUsed }`.
- `applications[]`: `{ company, title, url, domain, date, status }`.
- `settings`: locale override, disabledDomains[], fill behavior (fill uncertain matches or ask first).

`chrome.storage.local` (per device, not synced):
- `files`: CV and cover letter as base64 `{ name, mime, data }` with a UI note that files don't sync.

`chrome.storage.session`:
- per-tab fill-session state (active flow, step count, fields learned this session).

## 5. Error handling & safety

- **Host page safety:** content script isolated-world only; every DOM operation guarded; an exception disables izifill on that page with a quiet notice — never corrupts an in-progress application.
- **No silent wrong data:** never auto-advances or auto-submits; low-confidence fills visibly flagged.
- **Quota guard:** storage wrapper enforces sync quotas (100KB total / 8KB per item), chunks large arrays, degrades to local with a visible warning when sync is full.
- **Ungraceful widgets:** custom dropdowns/date pickers that reject programmatic setting → marked "fill manually", never half-filled. File inputs: attempt DataTransfer injection of the stored CV; if blocked, show "attach manually" with a download button for the stored file.
- **Privacy:** zero network calls; all data stays in the browser.

## 6. Testing strategy

- **Unit (Vitest), the bulk:** engine matching across FR/EN fixtures, confidence scoring, learned-answer fuzzy matching, detection scoring, storage chunking. Fixtures harvested from real job-form HTML (Indeed, HelloWork, Workday, Greenhouse snapshots) so generic coverage is measured.
- **DOM integration (Vitest + happy-dom):** event-dispatching fill mechanics for framework-controlled inputs, select/radio/checkbox handling, step-change detection.
- **Manual smoke checklist:** load unpacked, onboarding flow, one real multi-page application end-to-end.

## 7. Repo layout (indicative)

```
izi_filler/
  src/
    engine/          # pure TS: matcher, dictionaries, detection, learning
    content/         # content script: prompt, overlay, filler, session
    pages/           # onboarding, profile editor, tracker
    background/      # service worker
    lib/             # storage wrapper, i18n, messaging
  tests/
    fixtures/        # real-form HTML snapshots
  wxt.config.ts
```
