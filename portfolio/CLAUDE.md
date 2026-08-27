# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, multi-page personal portfolio for **Atanda Abdullahi** (handle `waledroid`) — a
Computer Vision / Edge-AI & Robotics engineer with a decade of IT systems background. Content is
in **French**. There is **no build step** and no package manager: plain HTML + Tailwind (CDN) + a
shared design system, with Three.js / GSAP / Lenis loaded from CDNs. Server-side pieces are both
zero-dependency and optional: `server.js` (Node) persists the CV editor's JSON for **local** dev,
and `netlify/functions/cv.js` does the same on the **deployed** Netlify site by committing
`data/cv.json` to GitHub (password-gated, token held in Netlify env vars). There is no database.

The design language is **"EDGE VISION"** — a lab-grade dark UI (near-black + volt-green/emerald
accent) with computer-vision motifs (HUD brackets, detection bounding boxes, scanlines, mono
telemetry, point clouds). `DESIGN_BRIEF.md` is the authoritative spec for facts, tokens, and
components — **read it before editing any page or adding content.**

## Running / previewing

Serve over HTTP so the Three.js ES-module importmap, the CV PDF, and relative `assets/` paths
resolve (the 3D modules will not load from a `file://` origin):

```bash
node server.js                # http://localhost:46323 — full site + CV save API (/api/cv)
python3 -m http.server 46323   # read-only alternative; the CV editor falls back to localStorage
```

Nothing to build, lint, or test — changes are verified by eye in the browser (check the console
for errors and that the hero robot / Lab scenes render).

## Pages

Six pages, all sharing the same skeleton (see `DESIGN_BRIEF.md` §3): `index.html` (home, 3D robot
hero), `about.html`, `experience.html` (career timeline + education + certs), `projects.html`
(filterable case studies + web-project modal), `lab.html` (interactive Vision Lab), `contact.html`
(mailto-based form). The nav link set lives in **one place**: the `PAGES` array in `assets/js/main.js`.

There is also **`isimonitor3d.html`** — the immersive ISI Monitor 3D case study (flagship project).
Like cv.html it is a standalone page (NOT in the `PAGES` array; linked from the "Projets phares"
card on the home page and the ISI Monitor 3D card on projects.html). It reuses the home-page
story rig (`#story` / `.story-sticky` / `#story-canvas` / `.story-card` + the `story-static`
fallback CSS) but loads its own ES module, `assets/js/isi3d-scene.js`: a scroll-scrubbed
procedural digital twin (floor grid, racks, two camera frustums with volumetric coverage
cones, ChArUco board, detection boxes, a walking YOLO-pose skeleton in soft cyan, an étagère
with live 3×3 vide/plein cell states, metric zones, tracked pallet, UDP/MQTT pulses) across
five chapters — hero → Calibrer →
Détecter → Trianguler & suivre → Publier — followed by module cards, real screenshots, the
project time-lapse video and the thesis citation (`assets/isimonitor3d.pdf`, copied from
`~/isi_monitor3d/thesis/latex/`). All numbers come from the thesis. Approved ISI Monitor media
(all under `assets/`): `im3d.mp4` (13 s live-dashboard clip, 720p, ~0.5 MB — plays as the
project's autoplay-muted-loop "cover gif" on the home Projets phares card, the projects.html
card and the case-study demo console; poster `img/im3d_poster.jpg`), `isimonitor3d.mp4`
(3 min 50 full walkthrough time-lapse, 9.7 MB, 720p — click-to-play console on the case-study
page; poster `img/isimonitor_poster.jpg`), `img/isimonitor1.png`
(3D twin), `img/isimonitor_rack.png` (dashboard + étagère grid), `img/isimonitor_cam.png`
(conveyor camera render), `img/isimonitor_carton.png` (live detection — **client logo
deliberately blurred; keep it that way**). Never name the client in copy.

There is also **`isidetector.html`** — the IsiDetector immersive case study (same pattern as
isimonitor3d.html, standalone, NOT in `PAGES`). Its module `assets/js/isidet-scene.js` draws a
procedural conveyor line (belt + gantry camera, looping carton/polybag parcels with mask/box
overlays, FP32→FP16→INT8 compression trio, the 0.71 trigger line with a LIVE canvas-texture
counter, UDP pulses to a PLC cabinet) across five chapters — hero → Segmenter → Compresser →
Compter → Déclencher. Approved IsiDetector media: `assets/isi1.mp4` (12 s visionAI-platform
clip, ~0.4 MB — autoplay-loop cover on the home IsiDetector card, projects.html card and the
case-study demo console; poster `img/isi1_poster.jpg`) and `assets/isi_vid.mp4` (49 s platform
walkthrough, 1.4 MB, click-to-play; poster `img/isi_vid_poster.jpg`). Facts come from the
thesis (System B) + the ~/logistic repos; the committed site default is the FP32 OpenVINO IR
(INT8 NNCF IR shipped/selectable) — don't claim INT8 is the running default. Never name the
client.

There is also **`cv.html`** — the interactive CV editor. It is deliberately a standalone tool page
(own light "paper" styling, no injected nav/footer, NOT in the `PAGES` array); every "Voir le CV"
button across the site links to it. It renders `data/cv.json` into a strict one-page A4 two-column
French CV via the micro template engine in `assets/js/cv.js` (`{{path}}` interpolation +
`<template>` clones), supports in-place editing (Modifier/Enregistrer, add/remove list items,
one-page overflow warning), saves through `PUT /api/cv` when `server.js` runs (atomic write to
`data/cv.json`; localStorage draft fallback on static hosting), and prints to PDF via the browser
with exact `@page A4` CSS.

**`cv_blue/`** ("CV Blue", linked from the footer chip and the contact page) is a second, self-
contained editor for the hospitality / blue-collar CVs: `cv_blue/cv.html` + `cv_blue/cv.js`
(same template & code lineage as `cv.html`/`cv.js`, relative `../assets` paths, no online login)
rendering `cv_blue/cv.json` = `{ cvs: [ { id, label: {fr,en}, fr: {…, letter}, en: {…, letter} }, … ] }`
— **one sub-tab per CV variant** (`restaurant`, `hotel`, …; `+ CV` duplicates the active one,
rename/delete only in edit mode), **each with its own cover letter**. Per-variant styling hooks
off `<body data-cv="<id>">`. Locally it saves through `PUT /api/cv_blue` (`server.js`); on the
static host it falls back to a localStorage draft. It must never change the engineer CV.
`.claude/agents/cv.md` defines the `cv` agent that tailors either document + writes the letter
from a pasted job offer (facts only).

## Architecture — the shared design system

The whole point of this codebase is that pages are thin: identity and behavior are centralized.

- **`assets/js/tw-config.js`** — Tailwind CDN theme (`tailwind.config`). Defines the brand tokens
  as utilities: colors `ink`/`surface`/`surface2`/`mist`/`muted`/`accent`/`volt`/`emerald`, fonts
  `font-display` (Space Grotesk) / `font-sans` (Inter) / `font-mono` (JetBrains Mono) /
  `font-signature` (ANAPOLINO), and `max-w-shell`. Loaded **after** the Tailwind CDN script.
- **`assets/css/site.css`** — the visual identity Tailwind can't express: custom cursor, film-grain
  overlay, and the reusable component classes `.label` `.panel` `.btn`/`.btn--ghost` `.hud`
  `.text-gradient` `.link-u` `.marquee` `.grid-bg` `.scanline` `.stat__num`, plus the
  `[data-reveal]` / `[data-magnetic]` / `[data-scramble]` behavior hooks. **Reuse these classes
  rather than re-styling** — that's what keeps the pages coherent.
- **`assets/js/main.js`** — runs on every page. It **injects the nav and footer** into the
  `<header data-site-nav>` / `<footer data-site-footer>` host elements (so never hand-write them),
  and wires the custom cursor, magnetic buttons, scroll reveals (`IntersectionObserver`), smooth
  scroll (Lenis if present), active-link highlighting, and the text-scramble effect.
- **`assets/js/three-scene.js`** — ES module (loaded via `<script type="module">` + an importmap
  exposing `three`). Renders the cursor-tracking robotic arm into `#hero-canvas` on the home page.
- **`assets/js/lab.js`** — ES module for `lab.html`: a Three.js point-cloud in `#lab-stage`, an
  animated detection-box overlay on any `[data-detect]` media, and an optional webcam mode toggled
  by `#lab-webcam-btn` (streams into `#lab-webcam`). Both 3D modules no-op safely if their target
  element or WebGL is missing, respect `prefers-reduced-motion`, and pause when off-screen.

## Conventions when editing or adding a page

- Copy the **exact page skeleton** from `DESIGN_BRIEF.md` §3: correct `<head>` (tw-config, site.css,
  fonts, Font Awesome), the cursor `<div>`s, the `data-site-nav` / `data-site-footer` hosts, and the
  libs in order at the end — `gsap → ScrollTrigger → lenis → (importmap → 3D module) → main.js`.
  The 3D module + importmap go **only** on pages that need them (home, lab).
- First `<main>` section needs `pt-32` to clear the fixed nav.
- Adding a page = create the HTML **and** add it to the `PAGES` array in `main.js` (drives nav +
  footer + active state everywhere).
- **Facts come only from `DESIGN_BRIEF.md` §1** — never invent employers, dates, or metrics. The
  name is always spelled "Atanda Abdullahi".
- Cache-busting on some logo assets uses `?v=N` suffixes; bump the number when replacing a cached image.

## Asset notes

CV content lives in `data/cv.json` (rendered/printed by `cv.html`); there is no static CV PDF —
generate one via cv.html → Imprimer / PDF. `assets/fonts/` holds self-hosted static woff2 fonts
(Inter, Space Grotesk, JetBrains Mono) used by cv.html so the printed PDF embeds ATS-readable
CID TrueType fonts instead of Type 3 (variable webfonts break PDF text extraction). `assets/img/` holds project
screenshots and portraits; `assets/logo/` holds company/tech logos. Only `wasoria` and
`radionigeria` have real company logos — other employers use mono monogram tiles.
