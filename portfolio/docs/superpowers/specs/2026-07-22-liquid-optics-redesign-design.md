# Liquid Optics — full-site redesign

**Date:** 2026-07-22
**Status:** Approved by user (scope, palette, 3D concept, copy level, final design)

## Goal

Evolve the portfolio from the "EDGE VISION" HUD-cyber look into a state-of-the-art dark
**liquid-glass** design (Apple-style translucent components) with **subtle, story-telling 3D**
and **Apple-minimal copy**. The site must immediately communicate the profile — computer-vision /
Edge-AI engineer who takes models from camera to deployed hardware — with far less text.

Decisions made with the user:

- **Scope:** full site overhaul (all six public pages + shared design system). `cv.html` untouched.
- **Palette:** dark glass + one **muted emerald/teal** accent. Volt-lime retired.
- **3D concept:** one scroll-driven story scene on the home page; light glass 3D accents elsewhere.
- **Copy:** Apple-minimal — one headline + one line per section + mono chips; long-form detail only
  in `projects.html` case studies and the CV.

## Constraints

- **No build step.** Plain HTML + Tailwind CDN + `site.css`; Three.js via CDN importmap;
  GSAP/ScrollTrigger/Lenis from CDN, exactly as today.
- Facts come only from `DESIGN_BRIEF.md` §1 / `data/cv.json`. Never invent metrics.
- Content stays in French. Name always "Atanda Abdullahi".
- Graceful degradation everywhere: no WebGL, `prefers-reduced-motion`, weak mobile.
- `netlify` deploy stays static; `server.js` / CV editor flow unchanged.

## 1. Design language (design system rewrite)

`assets/css/site.css` and `assets/js/tw-config.js` are rewritten in place; class names are kept
where semantics survive (`.panel`, `.btn`, `.label`, `.nav`…) so page markup changes stay small.

**Tokens** (`:root` + Tailwind theme):

- `--ink` deepens to `#050607`; surfaces become translucency, not paint:
  `--glass: rgba(255,255,255,0.045)`, `--glass-strong: rgba(255,255,255,0.08)`.
- Specular identity: every glass component gets a 1px top inner highlight
  (`inset 0 1px 0 rgba(255,255,255,0.10)`) + soft depth shadow (`0 24px 60px -30px rgb(0 0 0/.6)`).
- Accent: single muted emerald `--accent: #34d3a6` (desaturated vs old `#34D399`), used only for
  active states, one text gradient, chip glows, and 3D lighting. `--volt` removed.
- Radii up to 28px. More whitespace: section padding grows ~1.5×.
- Fonts unchanged (Space Grotesk / Inter / JetBrains Mono / ANAPOLINO signature).

**Components** (in `site.css`):

- `.panel` → liquid glass card: `--glass` bg, `backdrop-filter: blur(24px) saturate(140%)`,
  specular edge, hover = slightly stronger glass + lift. HUD corner brackets (`.hud`) become
  ultra-subtle (or removed from most call sites); `.scanline` retired.
- `.btn` → glass pill: translucent bg + specular edge; primary variant = accent-tinted glass,
  not solid lime. `.btn--ghost` = clear glass.
- Nav → floating glass island: centered rounded pill, detached from the top edge, heavy blur,
  compresses on scroll. Injected by `main.js` as today (markup template updated there).
- Footer simplified to one glass slab: name, availability dot, nav links, socials.
- Film grain overlay kept at reduced opacity; body radial glows re-tinted to the muted accent.
- Custom cursor kept but quieter (smaller ring, no blend-mode flash).

## 2. Home — scroll-driven story scene

`index.html` is rebuilt around a single fixed full-viewport WebGL canvas (`#story-canvas`)
rendered by a new ES module **`assets/js/story-scene.js`** (replaces `three-scene.js` on this
page). GSAP ScrollTrigger scrubs one master timeline across four pinned chapters; Lenis keeps
scroll smooth. Each chapter overlays exactly one glass card: headline + one line + mono chips.

| Chapter | 3D beat | Card copy (FR, indicative) |
|---|---|---|
| 1 · VOIR | Particle point-cloud world drifts, then resolves into focus through a glass lens ring | "Atanda Abdullahi" + "Je déploie la vision." + chips (Lyon · Disponible · M2 Vision) |
| 2 · DÉTECTER | Translucent bounding boxes lock onto drifting objects, mono confidence labels | "Détection temps réel" + one line (YOLO · RF-DETR · 60 FPS) |
| 3 · COMPRESSER | The particle lattice collapses/folds into a small glowing chip | "Modèles compressés" + one line (Distillation · INT8/FP16 · TensorRT) |
| 4 · DÉPLOYER | Chip docks into the robot arm head (arm re-materialed in dark glass/metal); arm wakes and tracks the cursor; camera pulls back | "Déployé sur le réel" + CTA buttons (Voir les projets / Voir le CV) |

After the story, the page continues as normal scroll content in the glass system: a compact
selected-projects band (two glass cards), the tech marquee (kept, restyled), and the contact CTA.

**Implementation notes:**

- One master `gsap.timeline()` scrubbed by a ScrollTrigger spanning the pinned story section
  (~400vh). Scene state (camera path, particle morphs, box locks, chip transform, arm pose) is a
  set of tweened uniforms/group transforms keyed to timeline progress — no per-chapter scenes.
- Particle morphing via precomputed target position buffers (cloud → lattice → chip) interpolated
  in the vertex stage or on CPU per frame (≤ ~8k particles desktop, ~2.5k mobile).
- Robot arm: reuse the existing arm-building code from `three-scene.js`, re-materialed (dark
  glass/metal, muted emerald emissives); cursor-tracking behavior kept for the final chapter.
- Renderer: DPR ≤ 2, transparent clear, pause when story section off-screen, `visibilitychange`
  pause. Bloom (UnrealBloomPass via `three/addons`) only when `deviceMemory ≥ 8` and desktop
  viewport; otherwise emissive materials alone.
- **Fallbacks:** no WebGL or `prefers-reduced-motion` → the story section renders as a static
  hero (poster image / CSS-only) with the four cards stacked normally; no pinning. Mobile keeps
  the scroll story but with the reduced particle budget and no bloom.

## 3. Other pages

All rebuilt on the glass system with Apple-minimal copy. A tiny shared module
**`assets/js/glass-bg.js`** (ES module, importmap) renders a subtle depth backdrop — slow-drifting
soft particles / bokeh discs in the accent hue — into any `[data-glass-bg]` hero; no-ops without
WebGL, static under reduced motion.

- **about.html** — one glass portrait card + three short "facet" cards (Vision · Edge · Systèmes),
  each: icon, headline, one line. The long bio paragraph goes.
- **experience.html** — vertical glass rail timeline; each stop = role, company, dates, one line,
  chips. Education + certs as compact glass tiles.
- **projects.html** — glass case-study cards keep their current detail level (this page is the
  designated deep-dive surface); filters restyled as glass segmented control; web-modal restyled.
- **lab.html** — keeps its interactive point cloud & detection demos (`lab.js` re-tinted to the
  new palette/materials); intro copy cut to one line.
- **contact.html** — near-empty by design: one glass card with the mailto form + direct links.
- **cv.html** — untouched (standalone print tool).

`main.js` keeps its roles (nav/footer injection, reveals, cursor, Lenis, scramble) with updated
markup templates and quieter motion defaults; the `PAGES` array is unchanged (same six pages).

## 4. Performance & robustness

- Budgets: story scene ≤ ~2.5 MB JS total from CDN (three + gsap already cached today), 60 fps
  target desktop, 30 fps floor mobile; particle counts as in §2.
- Every 3D module: try/catch boot, no-op without target element/WebGL, IntersectionObserver
  pause, DPR cap, `prefers-reduced-motion` = static frame, listeners passive.
- SEO/a11y: real text stays in the DOM (cards are HTML, not textures); meta descriptions per
  page; `aria-hidden` canvases; focus-visible styles on glass components; contrast ≥ 4.5:1 for
  body text on glass.

## 5. Verification

No test harness exists (static site). Verification is by browser via `node server.js`:

1. Console clean on all six pages.
2. Home: story scrub smooth both directions; chapter cards legible at every breakpoint.
3. Fallbacks: `prefers-reduced-motion` emulation, WebGL disabled, and a mobile viewport each
   produce a usable page.
4. Nav/footer inject correctly on all pages; active states right; cv.html and CV editor flow
   untouched and still working.
5. Lighthouse spot-check on home (performance + accessibility) before/after.

## Build order (for the implementation plan)

1. Design system rewrite (`site.css`, `tw-config.js`, `main.js` templates) — site restyles wholesale.
2. Home story scene (`story-scene.js` + rebuilt `index.html`).
3. `glass-bg.js` + the five simpler pages.
4. Copy pass (Apple-minimal, French) across all pages.
5. Fallbacks, perf tuning, cross-page verification.
6. Update `DESIGN_BRIEF.md` (§2 tokens, §3 skeleton, component list) so it stays the authoritative
   spec for the new system; facts in §1 are unchanged.
