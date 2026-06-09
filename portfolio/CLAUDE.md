# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, multi-page personal portfolio for **Atanda Abdullahi** (handle `waledroid`) — a
Computer Vision / Edge-AI & Robotics engineer with a decade of IT systems background. Content is
in **French**. There is **no build step**, no package manager, and no backend: plain HTML + Tailwind
(CDN) + a shared design system, with Three.js / GSAP / Lenis loaded from CDNs.

The design language is **"EDGE VISION"** — a lab-grade dark UI (near-black + volt-green/emerald
accent) with computer-vision motifs (HUD brackets, detection bounding boxes, scanlines, mono
telemetry, point clouds). `DESIGN_BRIEF.md` is the authoritative spec for facts, tokens, and
components — **read it before editing any page or adding content.**

## Running / previewing

Serve over HTTP so the Three.js ES-module importmap, the CV PDF, and relative `assets/` paths
resolve (the 3D modules will not load from a `file://` origin):

```bash
python3 -m http.server 8000   # then open http://localhost:8000/index.html
```

Nothing to build, lint, or test — changes are verified by eye in the browser (check the console
for errors and that the hero robot / Lab scenes render).

## Pages

Six pages, all sharing the same skeleton (see `DESIGN_BRIEF.md` §3): `index.html` (home, 3D robot
hero), `about.html`, `experience.html` (career timeline + education + certs), `projects.html`
(filterable case studies + web-project modal), `lab.html` (interactive Vision Lab), `contact.html`
(mailto-based form). The nav link set lives in **one place**: the `PAGES` array in `assets/js/main.js`.

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

`assets/cv.pdf` (the CV, also the source of truth for all content). `assets/img/` holds project
screenshots and portraits; `assets/logo/` holds company/tech logos. Only `wasoria` and
`radionigeria` have real company logos — other employers use mono monogram tiles.
