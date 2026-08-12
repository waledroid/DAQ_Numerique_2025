# Cover-letter tab on cv.html — design

Approved 2026-08-12.

## What

A second A4 document on `cv.html`: a bilingual cover letter (lettre de motivation), reachable
via a screen-only tab bar **CV | Lettre de motivation** above the sheet. The toolbar's existing
buttons (Modifier/Enregistrer/Annuler, drapeau FR/EN, Imprimer/PDF) act on the active tab.

## Letter page

Matching letterhead, no sidebar: name + title with green accent, one-line contact strip
(email · téléphone · LinkedIn — pulled from the CV's identity/contact data, not duplicated),
right-aligned city+date and recipient block, an object line, the letter body, a signature block.
Same fonts, print CSS (`@page A4`), and the one-page overflow warning.

## Template + offer form

`doc.fr.letter` / `doc.en.letter` = `{ body, offer: {entreprise, poste, destinataire, source,
villeDate} }` inside `data/cv.json` — rides the existing save pipeline (server.js, Netlify→GitHub,
localStorage draft) with zero backend changes; `normalizeDoc()` seeds a generic letter into old
documents.

The body is a *template* containing `{{entreprise}} {{poste}} {{destinataire}} {{source}}`.
- **View/print mode**: placeholders replaced by the offer values (language-appropriate fallbacks
  when a field is empty: « Madame, Monsieur », « votre entreprise », …).
- **Edit mode (Modifier)**: the body shows the RAW template, placeholders visible, editable as
  plain text (`white-space: pre-wrap`, no HTML). Enregistrer stores the template, never the
  filled text.

An **« Offre »** toolbar button (letter tab only) opens a paste-first modal: a job-offer textarea
plus 7 correctable fields (entreprise, poste, focus, domaine, exigence 1/2, lieu).

**v2 — generator (`assets/js/letter-gen.js`, UMD: browser + CommonJS):**
- « ⌕ Analyser » : heuristic keyword extraction (company/title/location regexes, ~35 tech terms)
  and job-profile classification (robotics3d / edgeai / industrial) — fully offline.
- « ⟳ Générer » : assembles a modular letter [opening][most-relevant project][second project]
  [requirements match][closing] from a bank of VERIFIED experience facts, ordered by the detected
  profile. Replaces `letter.body` (editable after; Enregistrer persists).
- « ✨ IA » : POST {text, lang} to `/.netlify/functions/letter` (fallback `api/letter` on
  server.js) → OpenRouter `openrouter/free`, prompt constrained to the same fact bank; returns a
  FIELDS json line + plain-text letter (robust to sloppy free-model JSON). Password-gated on
  Netlify (EDITOR_PASSWORD); requires OPENROUTER_API_KEY in Netlify env vars / local shell env.
  Falls back gracefully to the heuristic path when unconfigured.
- « Vider » : restores `letter.template` (the generic {{placeholder}} letter, preserved separately
  since generation overwrites `body`; editing a body that still contains placeholders re-syncs the
  template on save).

## Behavior details

- Tab + language state in localStorage; switching tab or language mid-edit keeps unsaved changes.
- `document.title` follows the active tab and language, so the printed PDF gets a sensible name.
- Overflow guard extends to the letter sheet; `autoSpace()` does not apply to it (fixed rhythm).
