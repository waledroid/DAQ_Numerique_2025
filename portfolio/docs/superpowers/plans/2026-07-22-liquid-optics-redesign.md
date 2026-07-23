# Liquid Optics Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the portfolio as a dark liquid-glass design with a scroll-driven 3D story on the home page and Apple-minimal copy, per `docs/superpowers/specs/2026-07-22-liquid-optics-redesign-design.md`.

**Architecture:** The shared design system (`site.css`, `tw-config.js`, `main.js`) is rewritten in place keeping class names, so all pages restyle wholesale before any page is touched. The home page gets a new ES module `story-scene.js` (single fixed canvas, CSS-sticky story section, scroll progress computed manually from `scrollY` — works identically with or without Lenis). A tiny `glass-bg.js` module gives other pages a subtle 3D depth backdrop. Pages are then rebuilt one by one with minimal French copy.

**Tech Stack:** Plain HTML, Tailwind CDN + `tailwind.config` in `tw-config.js`, Three.js 0.16x via CDN importmap (`three`, `three/addons/`), Lenis (kept), GSAP (kept for reveals only). No build step, no package manager.

## Global Constraints

- No build step; all libs from CDN exactly as today. ES modules only via the existing importmap pattern.
- Facts only from `DESIGN_BRIEF.md` §1 / `data/cv.json` — never invent employers, dates, metrics. Name always "Atanda Abdullahi". All copy in French.
- Accent is muted emerald `#34D3A6` (CSS `--accent`); volt-lime `#A3E635`/`#B4FF39` must not survive anywhere.
- Every 3D module: try/catch boot, no-op without container/WebGL, `prefers-reduced-motion` → static, IntersectionObserver pause, DPR ≤ 2.
- Work happens on branch `redesign/liquid-optics`; merge to `main` (deploys Netlify) only in the final task. Tag `v1-edge-vision` is the rollback point.
- `cv.html`, `assets/js/cv.js`, `data/cv.json`, `server.js`, `netlify/` are untouched by this plan.
- Verification is by browser (`node server.js` → http://localhost:8000): console clean, page renders. Automated proxies: `node --check` on every JS file touched, `curl` HTTP 200, `grep` assertions.

---

### Task 0: Branch

**Files:** none (git only)

- [ ] **Step 1:** `git checkout -b redesign/liquid-optics` (from up-to-date `main`)
- [ ] **Step 2:** `git push -u origin redesign/liquid-optics`
Expected: new branch tracking origin.

---

### Task 1: Design tokens — `tw-config.js` + `site.css` rewrite

**Files:**
- Modify: `assets/js/tw-config.js` (replace color block)
- Modify: `assets/css/site.css` (full rewrite)

**Interfaces:**
- Produces (used by every later task): CSS classes `.label`, `.panel`, `.btn`, `.btn--ghost`, `.chip`, `.text-gradient`, `.link-u`, `.marquee`, `.grid-bg`, `.stat__num`, `.hud` (now near-invisible), `.story-card`, `.glass-nav`, plus Tailwind tokens `ink surface surface2 mist muted accent emerald`.
- Back-compat: class names kept so existing pages restyle without markup edits. `.scanline` kept as a no-op shell (removed from markup in later tasks).

- [ ] **Step 1: Update Tailwind tokens.** In `assets/js/tw-config.js`, set the `colors` entry to:

```js
colors: {
  ink: '#050607',
  surface: '#0B0D10',
  surface2: '#12151A',
  line: 'rgba(255,255,255,0.08)',
  mist: '#F2F4F7',
  muted: '#98A2AE',
  accent: '#34D3A6',
  volt: '#4BE0B8',      // kept as a lighter accent tint (legacy class name)
  emerald: '#2FBF97',   // darker accent tint (legacy class name)
},
```
(Leave fonts / maxWidth exactly as they are.)

- [ ] **Step 2: Rewrite `assets/css/site.css`** with this content (full file):

```css
/* ============================================================
   LIQUID OPTICS — design system for Atanda Abdullahi's portfolio
   Dark liquid glass: translucent surfaces, blur, specular edges,
   one muted emerald accent. Tailwind handles layout; this file
   owns identity: tokens, glass components, cursor, motion.
   ============================================================ */

:root {
  --ink: #050607;
  --surface: #0B0D10;
  --line: rgba(255, 255, 255, 0.08);
  --line-strong: rgba(255, 255, 255, 0.16);
  --mist: #F2F4F7;
  --muted: #98A2AE;
  --accent: #34D3A6;
  --accent-soft: rgba(52, 211, 166, 0.14);
  --glass: rgba(255, 255, 255, 0.045);
  --glass-strong: rgba(255, 255, 255, 0.08);
  --specular: inset 0 1px 0 rgba(255, 255, 255, 0.10);
  --depth: 0 24px 60px -30px rgba(0, 0, 0, 0.6);
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
}

* { box-sizing: border-box; }
html { -webkit-font-smoothing: antialiased; }

body {
  background: var(--ink);
  color: var(--mist);
  font-family: 'Inter', system-ui, sans-serif;
  overflow-x: hidden;
  cursor: none;
}
@media (hover: none) { body { cursor: auto; } }

/* Soft ambient glow + film grain (quieter than v1) */
body::before {
  content: '';
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background:
    radial-gradient(ellipse at 50% -20%, rgba(52,211,166,0.05), transparent 60%),
    radial-gradient(ellipse at 100% 120%, rgba(52,211,166,0.03), transparent 55%);
}
body::after {
  content: '';
  position: fixed; inset: 0; z-index: 2; pointer-events: none; opacity: 0.022;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
main, header, footer { position: relative; z-index: 3; }

::selection { background: var(--accent); color: #06231b; }

h1, h2, h3, h4, .font-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
.font-mono, .label, .chip { font-family: 'JetBrains Mono', ui-monospace, monospace; }

/* ---------- Custom cursor (quieter) ---------- */
#cursor-dot, #cursor-ring {
  position: fixed; top: 0; left: 0; z-index: 9999; pointer-events: none;
  border-radius: 50%; transform: translate(-50%, -50%);
}
#cursor-dot { width: 5px; height: 5px; background: var(--mist); }
#cursor-ring {
  width: 28px; height: 28px; border: 1px solid rgba(255,255,255,0.35);
  transition: width .25s var(--ease), height .25s var(--ease), background .25s var(--ease), border-color .25s var(--ease);
}
#cursor-ring.is-active { width: 48px; height: 48px; background: var(--accent-soft); border-color: transparent; }
@media (hover: none) { #cursor-dot, #cursor-ring { display: none; } }

/* ---------- Mono label / eyebrow ---------- */
.label {
  font-size: 0.7rem; letter-spacing: 0.28em; text-transform: uppercase;
  color: var(--muted); display: inline-flex; align-items: center; gap: 0.6rem;
}
.label::before { content: ''; width: 24px; height: 1px; background: var(--accent); opacity: 0.8; }
.label--plain::before { display: none; }

/* ---------- Liquid glass core ---------- */
.panel {
  background: var(--glass);
  border: 1px solid var(--line);
  border-radius: 28px;
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  box-shadow: var(--specular), var(--depth);
  transition: background .4s var(--ease), border-color .4s var(--ease), transform .4s var(--ease), box-shadow .4s var(--ease);
}
.panel:hover {
  background: var(--glass-strong);
  border-color: var(--line-strong);
  transform: translateY(-2px);
}

/* HUD brackets — retired to a whisper (kept for legacy markup) */
.hud::before, .hud::after { content: none; }

/* Scanline — retired (kept so legacy markup renders cleanly) */
.scanline { position: relative; overflow: hidden; }
.scanline::after { content: none; }

/* ---------- Buttons: glass pills ---------- */
.btn {
  display: inline-flex; align-items: center; gap: 0.55rem;
  font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; letter-spacing: 0.04em;
  padding: 0.85rem 1.5rem; border-radius: 999px;
  color: var(--mist);
  background: linear-gradient(180deg, rgba(52,211,166,0.22), rgba(52,211,166,0.10));
  border: 1px solid rgba(52, 211, 166, 0.35);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: var(--specular), 0 12px 32px -16px rgba(52, 211, 166, 0.35);
  transition: transform .3s var(--ease), box-shadow .3s var(--ease), background .3s var(--ease);
}
.btn:hover { transform: translateY(-2px); box-shadow: var(--specular), 0 18px 44px -16px rgba(52,211,166,0.5); }
.btn--ghost {
  background: var(--glass); border-color: var(--line-strong);
  box-shadow: var(--specular);
}
.btn--ghost:hover { border-color: rgba(52,211,166,0.4); color: var(--mist); }

/* ---------- Mono chip (facts / telemetry) ---------- */
.chip {
  display: inline-flex; align-items: center; gap: 0.45rem;
  font-size: 0.66rem; letter-spacing: 0.14em; text-transform: uppercase;
  padding: 0.5rem 0.9rem; border-radius: 999px; color: var(--muted);
  background: var(--glass); border: 1px solid var(--line);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  box-shadow: var(--specular);
}
.chip i { color: var(--accent); }

/* ---------- Gradient / accent text ---------- */
.text-gradient {
  background: linear-gradient(120deg, #6FE8C8, var(--accent));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}

/* ---------- Animated underline links ---------- */
.link-u { position: relative; }
.link-u::after {
  content: ''; position: absolute; left: 0; bottom: -2px; width: 100%; height: 1px;
  background: var(--accent); transform: scaleX(0); transform-origin: right;
  transition: transform .4s var(--ease);
}
.link-u:hover::after { transform: scaleX(1); transform-origin: left; }

/* ---------- Scroll reveal ---------- */
[data-reveal] { opacity: 0; transform: translateY(22px); transition: opacity .8s var(--ease), transform .8s var(--ease); }
[data-reveal].is-visible { opacity: 1; transform: none; }
[data-reveal][data-delay="1"] { transition-delay: .07s; }
[data-reveal][data-delay="2"] { transition-delay: .14s; }
[data-reveal][data-delay="3"] { transition-delay: .21s; }
[data-reveal][data-delay="4"] { transition-delay: .28s; }
@media (prefers-reduced-motion: reduce) {
  [data-reveal] { opacity: 1 !important; transform: none !important; }
  body { cursor: auto; }
  #cursor-dot, #cursor-ring { display: none; }
}

/* ---------- Marquee ---------- */
.marquee { display: flex; overflow: hidden; gap: 0; -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
.marquee__track { display: flex; flex-shrink: 0; gap: 3rem; padding-right: 3rem; animation: marquee 32s linear infinite; }
@keyframes marquee { to { transform: translateX(-100%); } }
@media (prefers-reduced-motion: reduce) { .marquee__track { animation: none; } }

/* ---------- Background grid (softer) ---------- */
.grid-bg {
  background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 72px 72px;
  -webkit-mask-image: radial-gradient(ellipse at center, #000 25%, transparent 70%);
          mask-image: radial-gradient(ellipse at center, #000 25%, transparent 70%);
  opacity: 0.6;
}

/* ---------- Stat figure ---------- */
.stat__num { font-family: 'Space Grotesk', sans-serif; font-weight: 700; line-height: 1; }

/* ---------- Nav: floating glass island (injected by main.js) ---------- */
.nav { position: fixed; top: 0; left: 0; width: 100%; z-index: 60; display: flex; justify-content: center; padding: 14px 16px 0; pointer-events: none; }
.glass-nav {
  pointer-events: auto;
  display: flex; align-items: center; gap: 2px;
  padding: 6px; border-radius: 999px;
  background: rgba(10, 12, 15, 0.55);
  border: 1px solid var(--line);
  backdrop-filter: blur(28px) saturate(150%);
  -webkit-backdrop-filter: blur(28px) saturate(150%);
  box-shadow: var(--specular), var(--depth);
  transition: background .4s var(--ease), box-shadow .4s var(--ease);
}
.nav--scrolled .glass-nav { background: rgba(8, 9, 11, 0.75); }
.nav-link {
  position: relative; display: inline-flex; padding: 9px 16px; border-radius: 999px;
  font-size: 0.82rem; color: var(--muted); transition: color .3s var(--ease), background .3s var(--ease);
}
.nav-link:hover { color: var(--mist); background: var(--glass); }
.nav a.is-active { color: var(--mist); background: var(--glass-strong); box-shadow: var(--specular); }

/* mobile drawer (glass slab) */
.drawer {
  transition: transform .45s var(--ease);
  background: rgba(8, 9, 11, 0.85);
  backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
}
.drawer.is-closed { transform: translateX(-100%); }

/* ---------- Home story section ---------- */
.story-card {
  position: absolute; max-width: 30rem; opacity: 0; transform: translateY(24px);
  will-change: opacity, transform; pointer-events: none;
}
.story-card.is-live { pointer-events: auto; }
/* Static fallback (no WebGL / reduced motion): stack the cards normally */
.story-static #story { height: auto !important; }
.story-static #story .story-sticky { position: static; height: auto; overflow: visible; }
.story-static #story-canvas { display: none; }
.story-static .story-card { position: static; opacity: 1; transform: none; pointer-events: auto; margin: 18vh auto; }

/* utility */
.divider { height: 1px; background: var(--line); width: 100%; }
.kbd { font-family: 'JetBrains Mono', monospace; font-size: .7rem; border: 1px solid var(--line-strong); border-radius: 6px; padding: 2px 7px; color: var(--muted); }
```

- [ ] **Step 3: Verify.** Run `node server.js` in background; `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/index.html` → `200`. `grep -c 'A3E635\|B4FF39' assets/css/site.css` → `0`. Open http://localhost:8000 in browser: old pages render in the new glass skin (nav still old markup — fixed next task), console clean.
- [ ] **Step 4: Commit** `git add assets/css/site.css assets/js/tw-config.js && git commit -m "Liquid Optics 1/…: tokens + design system glass (site.css, tw-config)"`

---

### Task 2: Nav island + footer templates (`main.js`)

**Files:**
- Modify: `assets/js/main.js` (the injected nav + footer template strings only; leave PAGES, cursor, reveals, Lenis, scramble logic untouched)

**Interfaces:**
- Consumes: `.glass-nav`, `.nav-link`, `.chip`, `.panel` from Task 1.
- Produces: same host contract as today — pages keep `<header data-site-nav>` / `<footer data-site-footer>`.

- [ ] **Step 1:** In `main.js`, replace the desktop nav template with a centered glass island: brand monogram (`AA.`) as a round glass button, the `PAGES` links as `.nav-link` pills, one accent CTA (`CV`, links `cv.html`) styled `.btn` small variant (`padding: 7px 16px`). Mobile (`md:hidden`): keep burger button + existing drawer markup, swap panel classes for the new `.drawer` glass. Keep `data-magnetic` on the CTA only.
- [ ] **Step 2:** Replace the footer template with one `.panel` slab inside `max-w-shell`: row 1 — name + signature font, availability chip (`● Disponible pour un entretien` with accent dot), row 2 — nav links (from `PAGES`) + socials (GitHub, LinkedIn, mail icons), row 3 — `© 2026 Atanda Abdullahi` + `Conçu & développé à Lyon`. Delete the old 4-column layout.
- [ ] **Step 3: Verify.** `node --check assets/js/main.js` → silent. Browser: every page shows the floating island nav, active state correct per page, drawer works at mobile width, footer glass slab present, console clean.
- [ ] **Step 4: Commit** `git commit -am "Liquid Optics 2/…: nav en îlot de verre + footer simplifié"`

**CHECKPOINT — ask the user to eyeball the restyled site before pages are rebuilt.**

---

### Task 3: `glass-bg.js` — shared depth backdrop

**Files:**
- Create: `assets/js/glass-bg.js`

**Interfaces:**
- Produces: ES module; on import it finds every `[data-glass-bg]` element and renders a slow-drifting field of ~120 soft accent bokeh discs (THREE.Points, `CanvasTexture` radial sprite, additive, opacity ≤ 0.35, slow y-drift + parallax on pointer). No-ops without WebGL/container; static single frame under reduced motion; pauses off-screen via IntersectionObserver; DPR ≤ 2. Canvas is `position:absolute; inset:0; aria-hidden`; host must be `position:relative`.
- Consumed by: about/experience/projects/lab/contact hero sections (Tasks 6–10) via `<div data-glass-bg class="absolute inset-0 -z-10"></div>` + importmap + `<script type="module" src="assets/js/glass-bg.js">`.

- [ ] **Step 1:** Write the module. Structure mirrors `three-scene.js`'s guards (try/catch boot, reduced-motion static frame, IO pause). Single sprite texture: 64×64 canvas, radial gradient `rgba(52,211,166,0.8) → transparent`. Points geometry: random positions in a `14×8×6` box, per-point size jitter via 3 different `PointsMaterial` groups (sizes 0.25/0.5/0.9). Animation: `y += 0.0004·dt·speed_i` wrapping, whole field lerps ±0.4 on pointer x/y.
- [ ] **Step 2: Verify.** `node --check assets/js/glass-bg.js` → silent. Temporarily add the host div + script to `about.html` hero, load in browser: subtle drifting bokeh, console clean, scroll performance unaffected. (The wiring stays — about.html is rebuilt in Task 6 keeping it.)
- [ ] **Step 3: Commit** `git commit -am "Liquid Optics 3/…: module glass-bg (fond 3D bokeh partagé)"`

---

### Task 4: Home rebuild — `index.html` story skeleton

**Files:**
- Modify: `index.html` (full rebuild)

**Interfaces:**
- Produces DOM contract for Task 5: `#story` (`style="height:520vh"`) → child `.story-sticky` (`sticky top-0 h-screen overflow-hidden`) → `#story-canvas` (`absolute inset-0`) + four `.story-card[data-chapter="0..3"]` glass cards.
- Head: same skeleton as spec §3 of DESIGN_BRIEF (tw-config, site.css, fonts, FA) + importmap + `<script type="module" src="assets/js/story-scene.js">` replacing `three-scene.js`. GSAP/ScrollTrigger/Lenis script tags kept.

- [ ] **Step 1:** Rebuild `index.html`:
  - Meta description kept from current version.
  - `<main>` starts with `#story`. The four cards (position them: ch0 center, ch1 left-bottom `left-[8%] bottom-[16%]`, ch2 right-center `right-[8%] top-1/2 -translate-y-1/2`, ch3 center-bottom), each a `.panel p-8 sm:p-10 story-card`:
    - **Ch 0 (VOIR):** `h1` "Atanda Abdullahi" + gradient line "Je déploie la vision." + chips `OULLINS · LYON`, `● DISPONIBLE`, `M2 VISION · 2024`.
    - **Ch 1 (DÉTECTER):** label `01 · Détecter`, h2 "Voir en temps réel.", one line "Détection et suivi multi-caméras, 60 FPS en production industrielle." + chips `YOLO11`, `RF-DETR`, `60 FPS`.
    - **Ch 2 (COMPRESSER):** label `02 · Compresser`, h2 "Des modèles qui tiennent dans la main.", one line "Distillation et quantification pour l'embarqué : −40 % d'inférence sur Jetson." + chips `DISTILLATION`, `INT8 / FP16`, `TENSORRT`.
    - **Ch 3 (DÉPLOYER):** label `03 · Déployer`, h2 "Du modèle au réel.", one line "Déployé sur Jetson, robots et automates industriels." + buttons `Voir les projets` (`.btn`) / `Voir le CV` (`.btn--ghost`).
  - After `#story`: section "Travaux sélectionnés" — two `.panel` cards (IsiMonitor 3D image card, IsiDetector faux-viewport card, both linking `projects.html`, copy = one line each from current index); the tech marquee (kept list); the contact CTA panel ("Prêt à déployer l'IA sur votre hardware edge ?" + `.btn` Me contacter) — all copy Apple-minimal, no paragraphs > 1 line.
  - No `.scanline`/`.hud` usage anywhere in the new markup.
- [ ] **Step 2: Verify.** Browser: page renders; cards visible stacked (module not yet written, so add nothing — cards have `opacity:0`; TEMPORARILY confirm layout via devtools or by adding `story-static` class to `<body>` manually in devtools). Console: only a 404/import error for `story-scene.js` is acceptable *in this task only*.
- [ ] **Step 3: Commit** `git commit -am "Liquid Optics 4/…: index refondu — squelette du récit 3D + sections minimales"`

---

### Task 5: `story-scene.js` — core rig + chapter 1 (VOIR)

**Files:**
- Create: `assets/js/story-scene.js`

**Interfaces:**
- Consumes: Task 4 DOM contract. `window.matchMedia`, no GSAP dependency (progress computed from `scrollY`; Lenis scrolls natively so `scrollY` is correct).
- Produces for Tasks 5b/5c (same file, later chapters): `progress` (eased 0–1), `chapters` window map, `scene`, `camera`, `PARTICLES` object with `{geo, posAttr, cloud, lattice, chip}` Float32Arrays, `setCamera(p)` keyframe helper, per-frame `update(dt)` dispatcher.

- [ ] **Step 1:** Write the module skeleton:
  - Boot/guards identical in spirit to `three-scene.js` (`try/catch`, no `#story-canvas` → return; WebGL fail or `prefers-reduced-motion` → `document.body.classList.add('story-static'); return;`).
  - Renderer (alpha, DPR ≤ 2, sized to container, `ResizeObserver`), scene fog `FogExp2(0x050607, 0.05)`, PMREM `RoomEnvironment` from `three/addons/environments/RoomEnvironment.js` as `scene.environment` (for glass/metal materials).
  - Lights: dim ambient `0x1a2024`, cool white key `DirectionalLight(0xcfe8df, 1.6)`, accent `PointLight(0x34d3a6, 1.2, 30)`.
  - **Particles:** `N = matchMedia('(max-width:768px)').matches ? 2500 : 8000`; three target buffers — `cloud` (random shell: radius 5–8 around origin, flattened y×0.6), `lattice` (points on a 1.9³ cube grid, `i % gridCount`), `chip` (random in `1.5×0.1×1.5` box at y=0.6); live position attr starts = cloud. Per frame: `pos = lerp(lerp(cloud, lattice, m1), chip, m2)` on CPU. `PointsMaterial` accent, size 0.04, additive, transparent 0.75, depthWrite false.
  - **Lens (ch1):** group at origin-front: `TorusGeometry(1.6, 0.07)` in `MeshPhysicalMaterial({color:0x0c0e11, metalness:0.9, roughness:0.25})` + inner disc `MeshPhysicalMaterial({transmission:0.92, thickness:0.5, roughness:0.12, color:0xffffff, transparent:true})`.
  - **Scroll → progress:** `pTarget = clamp((scrollY - story.offsetTop) / (story.offsetHeight - innerHeight), 0, 1)`; `pCur += (pTarget - pCur) * (1 - 0.001**dt)` in the rAF loop (buttery scrub both directions).
  - **Cards:** for card *i* with window `[wi0, wi1]` = `[[0,.22],[.25,.47],[.5,.72],[.78,1]]`: `k = smoothstep-in/out over the window`; set `style.opacity = k`, `style.transform = translateY((1-k)*24px)`, toggle `.is-live` at `k > 0.5`.
  - **Camera keyframes:** `setCamera(p)` lerps position/lookAt through 5 keyframes (far-orbit → lens close-up → detection field → chip macro → arm wide) with smoothstep between chapter bounds.
  - **Chapter 1 animation (p 0–0.25):** particle field slowly rotates; fog density eases `0.09 → 0.045` (world "comes into focus" through the lens); lens ring rotates subtly, fades out `p 0.22–0.3`.
  - rAF loop + IO pause on `.story-sticky` + `visibilitychange` pause.
- [ ] **Step 2: Verify.** `node --check assets/js/story-scene.js` → silent. Browser: scrolling scrubs chapter-1 focus effect and card 0 fades in/out; reverse scroll symmetric; `story-static` class NOT present; console clean. Emulate reduced motion (devtools rendering tab) → static stacked page, canvas hidden.
- [ ] **Step 3: Commit** `git commit -am "Liquid Optics 5/…: story-scene — rig scroll + chapitre VOIR"`

---

### Task 5b: `story-scene.js` — chapters 2 & 3 (DÉTECTER, COMPRESSER)

**Files:** Modify: `assets/js/story-scene.js`

- [ ] **Step 1:**
  - **Detection (p 0.25–0.5):** three drifting "objects" (small `IcosahedronGeometry`, `BoxGeometry`, `CylinderGeometry` in dark glass physical material) orbiting slowly at fixed offsets; around each, a bounding box: `LineSegments(EdgesGeometry(BoxGeometry(1.2·s)))`, accent, additive, opacity 0 → 0.7 with a per-box stagger + tiny scale-pop when p crosses its lock threshold (0.3/0.35/0.4). Boxes and objects fade out p 0.5–0.56.
  - **Compression (p 0.5–0.75):** `m1 = smoothstep(0.46, 0.6, p)` (cloud→lattice), `m2 = smoothstep(0.6, 0.74, p)` (lattice→chip). **Chip:** group at (0, 0.6, 0): `BoxGeometry(1.5, 0.12, 1.5)` dark physical + top face emissive plane (`MeshStandardMaterial emissive accent, intensity 0.9`) + accent `EdgesGeometry` glow lines; scale 0→1 pops in at `m2 > 0.5`; particle material opacity eases down to 0.15 as `m2 → 1` (mass "enters" the chip).
- [ ] **Step 2: Verify.** `node --check` silent; browser: boxes lock with stagger in ch2, particles collapse into the lit chip in ch3, reverse scroll replays backwards, mobile width (devtools) still ≥ 30 fps feel, console clean.
- [ ] **Step 3: Commit** `git commit -am "Liquid Optics 5b/…: story-scene — chapitres DÉTECTER + COMPRESSER"`

---

### Task 5c: `story-scene.js` — chapter 4 (DÉPLOYER: arm + dock + cursor)

**Files:** Modify: `assets/js/story-scene.js`

- [ ] **Step 1:**
  - **Arm:** port the hierarchy/pose math from `three-scene.js` (plinth → yawBase → shoulder → elbow → wrist → head) with the new materials: links `MeshPhysicalMaterial({color:0x0c0e11, metalness:0.92, roughness:0.3})`, joints darker, accents = thin emissive strips (`0x34d3a6`, intensity 0.6), single-lens head (one barrel + glass disc + accent iris). Arm group sits at (0,0,-1), `visible=false` until p > 0.72; rises from y −1.5 → 0 and fades in (materials `transparent` during intro) over p 0.75–0.85.
  - **Dock:** chip travels from its ch3 position to a socket on the arm head (`head.getWorldPosition` each frame; `chip.position.lerpVectors(chipHome, headSocket, smoothstep(0.78, 0.9, p))`, shrinking to 0.4 scale); at p ≥ 0.9 chip parents visually into the head (keep world-position trick: just keep lerping to the moving socket — no reparenting needed).
  - **Wake:** iris emissive 0 → 1.1 over p 0.88–0.94; cursor tracking (raycast onto plane z=2.2, same clamps/easing as `three-scene.js`) blended in with weight `w = smoothstep(0.9, 1, p)` so scrubbing back scrubs the arm back to rest.
  - **Camera:** final keyframe pulls back/up to frame arm + card 3.
- [ ] **Step 2: Verify.** `node --check` silent; browser: full story scrubs smoothly end-to-end and backwards, arm tracks cursor at the end, reduced-motion & devtools-WebGL-off (`--disable-webgl` flags or override) show the static stacked fallback, console clean.
- [ ] **Step 3: Commit** `git commit -am "Liquid Optics 5c/…: story-scene — chapitre DÉPLOYER, bras + docking + curseur"`

**CHECKPOINT — ask the user to scroll the home story end-to-end and approve the feel before page rollout.**

---

### Task 6: `about.html`

**Files:** Modify: `about.html` (rebuild body content; keep head skeleton, add importmap + `glass-bg.js`)

- [ ] **Step 1:** Hero (`pt-32`, `relative`, `[data-glass-bg]` layer): label `À propos`, h1 "L'œil, puis la main.", one line "De l'infrastructure IT au deep learning déployé — je construis des systèmes qui voient et agissent." Portrait `.panel` card (existing `assets/img` portrait, rounded 28px). Below: three facet `.panel` cards, one line each — **Vision** ("Détection, segmentation, suivi 3D — YOLO, ViT, OpenCV."), **Edge** ("Compression et temps réel sur Jetson — TensorRT, INT8."), **Systèmes** ("10 ans d'infrastructure : réseaux, Linux, fiabilité."). Chips only for tools. All longer paragraphs deleted. End with CTA row (`Voir le CV` btn + `Me contacter` ghost).
- [ ] **Step 2: Verify.** Browser: renders, bokeh drifts behind hero, nav active state on "À propos", console clean.
- [ ] **Step 3: Commit** `git commit -am "Liquid Optics 6/…: about — verre + copie minimale"`

---

### Task 7: `experience.html`

**Files:** Modify: `experience.html` (rebuild; add `glass-bg.js` wiring)

- [ ] **Step 1:** Hero: label `Parcours`, h1 "Dix ans de systèmes. Trois ans de vision." Timeline = vertical accent rail (2px gradient line) with `.panel` stops, newest first, **facts exactly from `data/cv.json`**: Isitec International (Mars 2026 – présent), WASORIA (Fév. 2024 – Juil. 2024), Radio Nigeria (Janv. 2013 – Fév. 2023). Each stop: role, company + location, dates chip, ONE line (first `points[]` entry, trimmed), chips for stack. Education: three compact `.panel` tiles from `cv.json` education. Certifications section: drop (empty in cv.json).
- [ ] **Step 2: Verify.** Browser render + console clean; `grep -c 'AlloPanas' experience.html` → `0`.
- [ ] **Step 3: Commit** `git commit -am "Liquid Optics 7/…: experience — rail de verre, faits du cv.json"`

---

### Task 8: `projects.html`

**Files:** Modify: `projects.html` (restyle in place — this page keeps its detail)

- [ ] **Step 1:** Keep structure, filters, case-study content and the web-project modal. Swap: `.hud` decorations removed, `.scanline` classes removed, filter buttons → `.chip`-style segmented control (active = `.btn` look), cards already `.panel` (inherit new glass), modal container → `.panel` with heavier blur. Add `[data-glass-bg]` hero layer + `glass-bg.js` wiring. Trim only the page intro to one line ("Études de cas — de la calibration au déploiement."); case-study copy stays.
- [ ] **Step 2: Verify.** Browser: filters work, modal opens/closes, images load, console clean.
- [ ] **Step 3: Commit** `git commit -am "Liquid Optics 8/…: projects — habillage verre, détails conservés"`

---

### Task 9: `lab.html` + `lab.js` retint

**Files:** Modify: `lab.html`, `assets/js/lab.js`

- [ ] **Step 1:** `lab.html`: intro cut to one line ("Le quotidien d'un ingénieur vision, rendu tangible."); panels inherit glass; remove `.scanline`/`.hud` usage; keep `#lab-stage`, `[data-detect]` media, webcam button (restyle `.btn--ghost`).
- [ ] **Step 2:** `lab.js`: replace every `0xA3E635`/`#A3E635`/`0xB4FF39`/volt reference with accent `0x34D3A6`/`#34D3A6`; detection-overlay boxes get 1px accent borders + `backdrop-filter: blur(2px)` tint; point-cloud material opacity ≤ 0.8 additive.
- [ ] **Step 3: Verify.** `node --check assets/js/lab.js` silent; browser: point cloud animates in new hue, detect boxes animate on media, webcam toggle still works (permission prompt OK), console clean. `grep -ci 'a3e635\|b4ff39' assets/js/lab.js lab.html` → `0`.
- [ ] **Step 4: Commit** `git commit -am "Liquid Optics 9/…: lab — reteinté accent émeraude, verre"`

---

### Task 10: `contact.html`

**Files:** Modify: `contact.html` (rebuild)

- [ ] **Step 1:** Near-empty by design: `[data-glass-bg]` hero, label `Contact`, h1 "Construisons.", one `.panel` card containing the existing mailto form (fields restyled: transparent inputs, `border-b border-line`, focus border accent) + direct links column (mail, LinkedIn, GitHub as `.chip` rows). Availability chip. Nothing else.
- [ ] **Step 2: Verify.** Browser: form submits to mailto, links correct (waledroid@gmail.com, linkedin.com/in/waledroid, github.com/waledroid), console clean.
- [ ] **Step 3: Commit** `git commit -am "Liquid Optics 10/…: contact — carte de verre unique"`

---

### Task 11: `DESIGN_BRIEF.md` update

**Files:** Modify: `DESIGN_BRIEF.md` (§ design language / tokens / components / skeleton)

- [ ] **Step 1:** Rewrite the design-language sections: name the system **"LIQUID OPTICS"**, document the new tokens (ink `#050607`, glass rgba values, accent `#34D3A6`), the component classes (`.panel` glass recipe, `.btn` pills, `.chip`, `.glass-nav`, `.story-card`), the updated page skeleton (importmap pages: index → `story-scene.js`, others → `glass-bg.js` optional), and the copy rule (one headline + one line + chips; long-form only on projects/CV). §1 facts unchanged.
- [ ] **Step 2: Commit** `git commit -am "Liquid Optics 11/…: DESIGN_BRIEF à jour (système Liquid Optics)"`

---

### Task 12: Final verification + merge + deploy

**Files:** none new

- [ ] **Step 1:** Full sweep with `node server.js`: all six pages — console clean, nav/footer inject, active states, story scrub, glass-bg on subpages, cv.html editor unchanged and still saves via `/api/cv`.
- [ ] **Step 2:** Fallback matrix: reduced-motion emulation (home = static stack, subpages static), narrow mobile viewport (reduced particles, layout intact), WebGL disabled (all pages usable).
- [ ] **Step 3:** `grep -ri 'a3e635\|b4ff39' --include='*.html' --include='*.css' --include='*.js' .` (excluding `docs/`, `cv.html`, `assets/js/cv.js`) → no hits.
- [ ] **Step 4:** Lighthouse spot-check on home (devtools): performance & a11y not worse than v1 baseline by more than ~5 points; body-text contrast passes.
- [ ] **Step 5:** **User approval gate** — user eyeballs the full site on the branch.
- [ ] **Step 6:** Merge & deploy:
```bash
git checkout main && git pull --rebase origin main
git merge --no-ff redesign/liquid-optics -m "Refonte Liquid Optics : design verre liquide + récit 3D au scroll"
git push
git tag -a v2-liquid-optics -m "Refonte Liquid Optics en ligne" && git push origin v2-liquid-optics
```
Rollback path if needed: `git revert -m 1 <merge-commit>` or redeploy `v1-edge-vision`.
