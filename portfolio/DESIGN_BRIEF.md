# LIQUID OPTICS — Design & Content Brief (read fully before building)

You are building ONE page of a 6-page static portfolio for **Atanda Abdullahi**. The shared
design system already exists. Your page MUST look and feel like it belongs to the same site.
**Language: French.** No build step — plain HTML + Tailwind CDN + the shared CSS/JS below.

---
## 1. WHO THE CANDIDATE IS (use ONLY these facts — do not invent employers, dates, or metrics)

- **Name:** Atanda Abdullahi (handle `waledroid`). Always spell it "Atanda Abdullahi".
- **Positioning:** *Ingénieur Vision par Ordinateur & Edge-AI*, built on **10 years of IT systems & support**. He bridges deep-learning research and real, deployed, edge hardware + robotics.
- **Email:** waledroid@gmail.com · **Phone:** +33 7 49 49 99 78 · **Location:** 33 boulevard de l'Europe, Montmein Sud, 69600 Oullins (Lyon), France
- **LinkedIn:** https://linkedin.com/in/waledroid · **GitHub:** https://github.com/waledroid
- **Languages:** Anglais (langue maternelle), Français (niveau B1).
- **Status:** *Disponible pour un entretien.*

### Experience (most recent first — exact)
1. **Ingénieur ML & Vision par Ordinateur** — Isitec, Millery (Lyon) (Mars 2026 – présent, poste actuel). Système de vision industrielle multi-caméras (entrepôt) : suivi métrique 2D/3D temps réel (homographie, fusion multi-caméras, triangulation DLT); détecteurs edge interchangeables (YOLO/RF-DETR, ONNX/OpenVINO/TensorRT, Jetson Orin) + pipeline de données synthétiques (SDXL/ControlNet/SAM2); dashboard opérateur FastAPI + jumeau numérique 3D (Three.js). *Projet propriétaire — pas de lien de dépôt public, ne pas nommer le client.*
2. **Technicien Informatique** — AlloPanas Ordi, Chalon-sur-Saône (Oct 2024 – Nov 2024). Diagnostic & réparation matériel/logiciel, imprimantes, appareils mobiles, à distance et sur site; documentation de l'état des dispositifs.
3. **Ingénieur en Apprentissage Automatique** — WASORIA, Le Creusot (Fév 2024 – Juil 2024). Distillation de connaissances sur Vision Transformers (ViT) lourds → **+25 % vitesse de détection et précision de segmentation**; **−40 % temps d'inférence** sur **Nvidia Jetson Orin Nano 8 Go**.
4. **Responsable Informatique** — Radio Nigeria, Ikoyi, Lagos (Janv 2013 – Fév 2023). Dépannage IT, haute satisfaction client; gestion **Active Directory** (utilisateurs, sécurité, déploiements); création d'un site web avec SEO (**+20 % engagement**).
5. **Analyste en Recherche Consommateur** — Cadbury Nigeria Plc, Ikeja, Lagos (Oct 2011 – Sept 2012). Analyse de données et optimisation des processus avec SAP & Excel.

### Education
- **DAQ 2.0** (Dispositif en Amont à la Qualification) — APOR, Le Creusot — *En cours*.
- **Master of Science (M2) — Vision par Ordinateur** — Université de Bourgogne, Le Creusot — Juillet 2024.
- **Diplôme d'études supérieures en Informatique** — University of Lagos — Mai 2015.

### Certification
- **Certificat Professionnel Google en Support Informatique** — 2024.

### Skills
- **Systèmes & Réseaux:** Windows, macOS, Linux (install/dépannage), VLAN, VPN, pare-feu, antivirus, Centreon, GLPI.
- **Support technique:** N2 & N3, TeamViewer, AnyDesk, Jira.
- **Langages:** Python (principal), JavaScript/React, SQL.
- **Cloud / MLOps:** AWS SageMaker, Google Cloud, Docker, VMware, Git.
- **Savoir-être:** collaboration agile, communication technique claire, gestion des priorités sous pression, résolution de problèmes complexes, adaptabilité.

### Projects (real — link them)
- **ISI Monitor 3D — Vision industrielle** — Système de vision multi-caméras d'entrepôt : ingestion RTSP (GStreamer), suivi métrique 2D/3D (homographie, fusion multi-caméras, triangulation DLT, ByteTrack métrique), détecteurs edge YOLO11/RF-DETR (ONNX Runtime, CUDA/OpenVINO — volontairement sans TensorRT pour rester portable Jetson), publication UDP/MQTT vers AGV/WMS, dashboard FastAPI + jumeau numérique. Écosystème d'outillage : **isiCal** (studio web de calibration guidée — intrinsèques/extrinsèques ChArUco via Multical, auto-capture, extrinsèques sans mire SuperPoint+LightGlue) et **isiGen** (générateur de données synthétiques SDXL + ControlNet profondeur + SAM2 + LoRA : 50–100 photos réelles par classe → dataset de segmentation auto-annoté). Cibles : PC GPU (RTX) en dev, Jetson Orin NX 16 Go en prod. *Python, OpenCV, ONNX Runtime/OpenVINO, GStreamer, MQTT, FastAPI, Three.js.* **Isitec (proprietary) — do NOT link a repo, do NOT name the client (Celio); screenshot `assets/img/isimonitor1.png` only (no client footage).**
- **IsiDetector — Détection edge & MLOps** — Moteur de segmentation d'instances (YOLO/RF-DETR) pour colis sur convoyeur : entraînement → compression INT8/FP16 → déploiement multi-backend (ONNX/OpenVINO/TensorRT), **mAP@50 ≈ 0,96 en validation** (YOLOv26 & RF-DETR, classes carton/polybag, ~5 000 images), comptage ByteTrack par franchissement de ligne + trigger UDP vers automate de tri, double backend Flask/FastAPI, Docker. *Python, PyTorch, ONNX/TensorRT, OpenVINO, FastAPI.* Isitec — **public repo, lien autorisé:** https://github.com/waledroid/IsiDetector (still Isitec-copyrighted; do NOT name the client). Sibling of ISI Monitor 3D but distinct: the edge-detection/MLOps engine, NOT the 3D digital twin. Portfolio card is a coded HUD (no screenshot in repo).
- **Compression & benchmark de modèles (outil `compression/` du dépôt IsiDetector)** — Outil interactif (TUI Rich/questionary) et scriptable pour préparer les modèles au déploiement edge : conversion FP16 (~½ taille, <0,5 % mAP), quantification INT8 dynamique et statique QDQ par canal (~¼ taille, calibration sur images réelles), simplification de graphe (onnxsim), export OpenVINO IR ; benchmark (médiane/p95/FPS, provider effectif) et validation d'accuracy contre la référence FP32 (appariement IoU, dérive des boîtes, verdict good/acceptable/degraded/broken). Architecture à plugins (registre de stages). *Python, ONNX Runtime, onnxconverter-common, OpenVINO, Rich.* Isitec — même lien de dépôt que IsiDetector. Card = coded HUD; user will add real screenshots/GIFs later.
- **ROSBot Harmony** — Système autonome de communication inter-robots. *Python, ROS, PyTorch.* Repo: https://git.new/XptbXPB
- **Système de tri des déchets en temps réel** — Amélioration de la précision de segmentation par compression. *Roboflow, PyTorch, Transformers, TensorRT, OpenMMLab.* Repo: https://git.new/s5dJOD9
- **Compression de ViT lourds pour l'edge** — thèse M2 / travaux WASORIA (knowledge distillation, TensorRT, Jetson).
- Web (DAQ Numérique, Chalon-sur-Saône, 2025): **Calculatrice** (https://calculatrice-daq.netlify.app/), **CodaQ Formation** maquette Figma + site (https://codaq-siteweb.netlify.app/), **HiveGames UI** React (https://hivegames.netlify.app/).

### Signature metrics to feature as stats
`10 ans` IT/infra · `M2` Vision par Ordinateur · `+25 %` détection · `−40 %` inférence (Jetson) · `+20 %` engagement web.

---
## 2. DESIGN LANGUAGE — "LIQUID OPTICS"

Dark liquid glass. Near-black ink (`#050607`) with translucent glass surfaces — `rgba(255,255,255,0.045)`
resting / `rgba(255,255,255,0.08)` on hover, `backdrop-filter: blur()` + a 1px inset specular
highlight along the top edge, and soft outer depth shadows. Radii are generous — up to 28px on
cards, fully pill (`999px`) on buttons/chips/nav. **One** muted-emerald accent, `#34D3A6` — used
sparingly (ticks, glows, one word per headline, chip icons), never as a wash. Motifs: glass panels
with specular edges, a floating pill-shaped nav island, a scroll-driven 3D "story" on the home
page, mono chips for facts/telemetry instead of paragraphs. Generous whitespace, big confident
display type, restrained accent use. Award-show polish (Awwwards/FWA-grade) — but **fast,
accessible, legible**.

The old lime-green accent is retired site-wide; `volt` and `emerald` now resolve to lighter/darker
**tints of the same emerald** (see tokens below), kept only as legacy Tailwind class names — never
introduce a second hue.

**Do:** big `font-display` headings (clamp sizing), mono `.label` eyebrows over sections, `.panel`
glass cards, `.chip` for facts instead of prose, `data-reveal` on entrance, one strong idea per
section (headline + one line + chips), asymmetric grids.
**Don't:** rainbow colors, hard drop-shadows, walls of text outside `projects.html`/the CV, fake
logos, emojis, HUD brackets/scanlines (retired — see Components).

### Tokens (from `assets/js/tw-config.js` + `assets/css/site.css` `:root` — copy exactly)
Colors (Tailwind utilities): `ink` `#050607` (bg), `surface` `#0B0D10`, `surface2` `#12151A`,
`line` `rgba(255,255,255,0.08)` (border), `mist` `#F2F4F7` (text), `muted` `#98A2AE` (2nd text),
`accent` `#34D3A6`, `volt` `#4BE0B8` (legacy class name — lighter accent tint), `emerald`
`#2FBF97` (legacy class name — darker accent tint).
CSS custom properties (`site.css` `:root`, used by the component classes below): `--ink #050607`,
`--surface #0B0D10`, `--line rgba(255,255,255,0.08)`, `--line-strong rgba(255,255,255,0.16)`,
`--mist #F2F4F7`, `--muted #98A2AE`, `--accent #34D3A6`, `--accent-soft rgba(52,211,166,0.14)`,
`--glass rgba(255,255,255,0.045)`, `--glass-strong rgba(255,255,255,0.08)`,
`--specular inset 0 1px 0 rgba(255,255,255,0.10)`, `--depth 0 24px 60px -30px rgba(0,0,0,0.6)`,
`--ease cubic-bezier(0.22,1,0.36,1)`.
Fonts: `font-display` (Space Grotesk), `font-sans` (Inter), `font-mono` (JetBrains Mono), `font-signature` (ANAPOLINO).
Layout width: `max-w-shell` (76rem) centered with `px-5 sm:px-8`.

### Ready-made component classes (in assets/css/site.css — USE THESE)
- `.label` / `.label--plain` — mono uppercase eyebrow with a short accent tick (`--plain` hides it).
- `.panel` — the core glass card: `--glass` fill, 1px `--line` border, `border-radius: 28px`,
  `backdrop-filter: blur(24px) saturate(140%)`, specular + depth shadow; on hover, fill/border
  strengthen and it lifts 2px.
- `.btn` — glass pill CTA: emerald-tinted gradient fill, emerald border, blur, specular + emerald
  glow shadow, lifts on hover. `.btn--ghost` — same pill shape on a neutral `--glass` fill/border
  (no emerald tint) for secondary actions.
- `.chip` — small mono pill for a single fact/telemetry value (e.g. `YOLO11`, `60 FPS`); glass
  fill + border + blur; icons inside inherit the accent color.
- `.glass-nav` (+ `.nav-link`) — the floating pill nav island injected by `main.js` into
  `[data-site-nav]`: fixed, centered, translucent (`rgba(10,12,15,0.55)` → `0.75` once
  `.nav--scrolled`), blurred, with `.nav-link` items and an `.is-active` state. `.drawer` is the
  matching glass mobile menu slab.
- `.text-gradient` — accent gradient text (`#6FE8C8` → `--accent`).
- `.link-u` — animated underline link.
- `.story-card` — an absolutely-positioned glass card (built on `.panel`) used inside the home
  `#story` scroll section; fades/rises in per scroll-chapter. `.story-static` (a `<body>` class
  toggled by `story-scene.js`) is the no-WebGL / reduced-motion fallback: it forces the story
  cards to stack statically instead of scroll-scrubbing (see §3b).
- `.grid-bg` — faint masked grid background layer.
- `.marquee` + `.marquee__track` — infinite logo/skill marquee.
- `.stat__num` — large stat figure.
- `.divider` / `.kbd` — hairline rule / keyboard-key mono badge.
- `[data-reveal]` (+ optional `data-delay="1..4"`) — fade/slide in on scroll.
- `[data-magnetic]` — magnetic hover pull (use sparingly on CTAs).
- `[data-scramble]` — text decode effect on a short heading/word.
- `[data-glass-bg]` — host element for the optional Three.js bokeh backdrop (`glass-bg.js`); see §3.
- **Retired (kept as harmless no-op shells for back-compat only — do not reach for these):**
  `.hud` (HUD corner brackets — its `::before`/`::after` now render `content: none`) and
  `.scanline` (moving scan highlight — its `::after` now renders `content: none`). Any legacy
  markup using them still lays out fine; just don't add new `.hud`/`.scanline` usage.

---
## 3. EXACT PAGE SKELETON (copy this; fill the `<main>`)

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="PAGE-SPECIFIC 150-char FR description" />
  <title>PAGE TITLE — Atanda Abdullahi</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="assets/js/tw-config.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link href="https://db.onlinewebfonts.com/c/b8cc7a4c2204f4530415a8552c2d827d?family=ANAPOLINO" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg" />
  <link rel="stylesheet" href="assets/css/site.css" />
</head>
<body class="bg-ink text-mist">
  <div id="cursor-dot"></div><div id="cursor-ring"></div>
  <header data-site-nav></header>

  <main>
    <!-- ====== YOUR PAGE CONTENT — first section needs top padding (pt-32) to clear the fixed nav ====== -->
  </main>

  <footer data-site-footer></footer>

  <!-- libs (order matters) -->
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js"></script>
  <script src="assets/js/main.js"></script>
</body>
</html>
```

**The nav and footer are injected by `main.js` — do NOT hand-write them.** Just include the
`<header data-site-nav>` and `<footer data-site-footer>` hosts exactly as above. First `<main>`
section needs `pt-32` to clear the fixed nav — **except** on the home page, whose `<main>` starts
directly with the full-bleed `#story` section (no top padding; the story cards position
themselves).

### Importmap pages (script order: gsap → ScrollTrigger → lenis → importmap → module → main.js)
Only pages that render Three.js content load the importmap + an ES module, placed **just before**
`assets/js/main.js`:

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
} }
</script>
<script type="module" src="assets/js/story-scene.js"></script>
```

- **`index.html` (home)** → `assets/js/story-scene.js`, targeting `#story-canvas` inside the
  `#story` section (see §3b). This is the only page with a scroll-driven full scene.
- **Sub-pages (about, experience, projects, lab, contact)** → **optional** `assets/js/glass-bg.js`,
  targeting any `[data-glass-bg]` element — currently used on the hero section of about.html,
  experience.html, projects.html and contact.html as `<div data-glass-bg class="absolute inset-0
  -z-10"></div>` placed first inside a `position: relative` hero, behind a `.grid-bg` layer and
  the content. It renders a slow-drifting field of soft emerald bokeh discs (near/mid/far Three.js
  point groups) for a subtle depth backdrop — no-ops silently without WebGL, and pauses off-screen.
  Add it only where a hero benefits from ambient depth; it is not required on every page.
- **`lab.html`** keeps its own dedicated module, `assets/js/lab.js` (Three.js point-cloud in
  `#lab-stage` + detection-box overlay + optional webcam), unrelated to `story-scene.js`/`glass-bg.js`.

The 3D module looks for its container by id/attribute and no-ops if absent — just place the host
element (`#story-canvas`, `[data-glass-bg]`, or `#lab-stage`) with sensible sizing; the module
handles the rest. Both modules respect `prefers-reduced-motion`, cap DPR at 2, and pause when
off-screen.

### 3b. Home story scene (`index.html` + `assets/js/story-scene.js`)
The home page's `<main>` opens with `<section id="story" style="height:520vh">` containing a
`sticky top-0 h-screen` wrapper (`.story-sticky`) that holds `#story-canvas` (the WebGL stage) and
four absolutely-positioned `.story-card.panel` elements (`data-chapter="0..3"`), one per chapter,
revealed in disjoint scroll-progress windows as the page scrolls through the 520vh section:
0. **VOIR** — name + "Je déploie la vision." + location/availability/M2 chips.
1. **DÉTECTER** — "Voir en temps réel." — multi-camera detection copy + YOLO11/RF-DETR/60 FPS chips.
2. **COMPRESSER** — "Des modèles qui tiennent dans la main." — distillation/edge copy + INT8-FP16/TensorRT chips.
3. **DÉPLOYER** — "Du modèle au réel." — deployment copy + CTAs to `projects.html` / `cv.html`.

Scroll progress drives the whole rig off `window.scrollY` (no GSAP — Lenis scrolling is
authoritative), eased per frame so the scrub is fully reversible. Visually the scene moves through
its own mini-story: a particle field, then celestial "detection objects" (a ringed planet, a moon,
a star) drifting near the origin — each gets a live bounding box and a class+confidence label
sprite (`planète 0.94`, `lune 0.89`, `étoile 0.91`) as chapter 2 locks on — and finally a
cursor-tracking, FANUC-style industrial robot arm (signature yellow body, dark joint covers,
emerald accent striping) rises into frame in chapter 4, ending in a wide two-lens stereo camera
head as its end effector. **`prefers-reduced-motion` or a WebGL failure** adds a `story-static`
class to `<body>`; the matching CSS (`site.css`) then forces `#story` to `height: auto`, the sticky
wrapper to `position: static`, hides `#story-canvas`, and stacks the `.story-card`s as normal
static blocks — a fully readable, no-JS-required fallback.

### Copy rule
Every non-story, non-case-study section gets **one headline + one supporting line + a row of
`.chip`s** — not paragraphs. Long-form writing (multi-paragraph explanation, prose walkthroughs)
is reserved for the case-study detail views in `projects.html` and the CV (`cv.html`/`data/cv.json`).
If a section needs more than a headline, a line, and chips to make its point, it belongs in a case
study, not on a landing section.

---
## 4. AVAILABLE IMAGE ASSETS (use real paths; don't reference missing files)
`assets/cv.pdf` · `assets/img/` has: `ti.jpg` (robotics/hardware), `web.jpg`, `ai.png`, `design.png`,
`calc1.png` `calc2.png` (calculatrice), `codaq1.png` `codaq2.png`, `hives1.png` `hives2.png`,
`meme.png` `meme_no_bg.png` (portrait/avatar), `signature.png`, `chevron.png`, `hb.png`.
`assets/logo/` has: `wasoria.png`, `isitec.png`, `radionigeria.png`, `api.png`, `ai.png`,
`robotic-arm.png`, `js.png`, `ps.png`. Use grayscale→color hover on imagery (`grayscale group-hover:grayscale-0 transition`).

---
## 5. QUALITY BAR
- Fully responsive (mobile-first; test the 375px and 1280px mental models).
- Accessible: real headings order, `alt` text, color contrast, `aria-label` on icon buttons, keyboard-focusable.
- No console errors. No broken links. No Lorem Ipsum. No invented facts.
- Reuse the component classes above instead of re-styling from scratch — that's what keeps the 6 pages coherent.
