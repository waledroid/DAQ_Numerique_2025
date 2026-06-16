# EDGE VISION — Design & Content Brief (read fully before building)

You are building ONE page of a 6-page static portfolio for **Atanda Abdullahi**. The shared
design system already exists. Your page MUST look and feel like it belongs to the same site.
**Language: French.** No build step — plain HTML + Tailwind CDN + the shared CSS/JS below.

---
## 1. WHO THE CANDIDATE IS (use ONLY these facts — do not invent employers, dates, or metrics)

- **Name:** Atanda Abdullahi (handle `waledroid`). Always spell it "Atanda Abdullahi".
- **Positioning:** *Ingénieur Vision par Ordinateur & Edge-AI*, built on **10 years of IT systems & support**. He bridges deep-learning research and real, deployed, edge hardware + robotics.
- **Email:** waledroid@gmail.com · **Phone:** +33 7 49 49 99 78 · **Location:** Le Creusot, 71200, Bourgogne, France
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
- **ISI Monitor 3D — Vision industrielle** — Système de vision multi-caméras d'entrepôt : suivi métrique 2D/3D (homographie, fusion multi-caméras, triangulation), détecteurs edge YOLO/RF-DETR, génération de données synthétiques (SDXL/ControlNet/SAM2), dashboard FastAPI + jumeau numérique 3D (Three.js). *Python, OpenCV, ONNX/TensorRT, FastAPI, Three.js.* **Isitec (proprietary) — do NOT link a repo, do NOT name the client (Celio); screenshot `assets/img/isimonitor1.png` only (no client footage).**
- **ROSBot Harmony** — Système autonome de communication inter-robots. *Python, ROS, PyTorch.* Repo: https://git.new/XptbXPB
- **Système de tri des déchets en temps réel** — Amélioration de la précision de segmentation par compression. *Roboflow, PyTorch, Transformers, TensorRT, OpenMMLab.* Repo: https://git.new/s5dJOD9
- **Compression de ViT lourds pour l'edge** — thèse M2 / travaux WASORIA (knowledge distillation, TensorRT, Jetson).
- Web (DAQ Numérique, Chalon-sur-Saône, 2025): **Calculatrice** (https://calculatrice-daq.netlify.app/), **CodaQ Formation** maquette Figma + site (https://codaq-siteweb.netlify.app/), **HiveGames UI** React (https://hivegames.netlify.app/).

### Signature metrics to feature as stats
`10 ans` IT/infra · `M2` Vision par Ordinateur · `+25 %` détection · `−40 %` inférence (Jetson) · `+20 %` engagement web.

---
## 2. DESIGN LANGUAGE — "EDGE VISION"

Lab-grade, cinematic, dark. Near-black with a **volt-green / emerald** accent. Computer-vision &
robotics motifs: HUD corner brackets, detection bounding boxes, scanlines, mono telemetry labels,
faint grid, point-cloud feel. Generous whitespace, big confident display type, restrained accent use.
Award-show polish (think Awwwards/FWA dark portfolios) — but **fast, accessible, legible**.

**Do:** big `font-display` headings (clamp sizing), mono `.label` eyebrows over sections, `.panel`
cards, `data-reveal` on entrance, asymmetric grids, one strong idea per section.
**Don't:** rainbow colors, drop-shadows everywhere, walls of text, fake logos, emojis.

### Tokens (Tailwind utilities, already configured)
Colors: `ink` `#08090B` (bg), `surface`, `surface2`, `mist` (text), `muted` (2nd text), `accent` `#A3E635`, `volt` `#B4FF39`, `emerald` `#34D399`, border `line`.
Fonts: `font-display` (Space Grotesk), `font-sans` (Inter), `font-mono` (JetBrains Mono), `font-signature` (ANAPOLINO).
Layout width: `max-w-shell` (76rem) centered with `px-5 sm:px-8`.

### Ready-made component classes (in assets/css/site.css — USE THESE)
- `.label` / `.label--plain` — mono uppercase eyebrow (auto accent tick).
- `.panel` — glass card with hover-glow border.
- `.btn` / `.btn--ghost` — pill buttons.
- `.text-gradient` — volt→emerald gradient text.
- `.link-u` — animated underline link.
- `.hud` — HUD corner brackets on a relative container.
- `.grid-bg` — faint masked grid background layer.
- `.scanline` — moving scan highlight over a media frame.
- `.marquee` + `.marquee__track` — infinite logo/skill marquee.
- `.stat__num` — large stat figure.
- `[data-reveal]` (+ optional `data-delay="1..4"`) — fade/slide in on scroll.
- `[data-magnetic]` — magnetic hover pull (use sparingly on CTAs).
- `[data-scramble]` — text decode effect on a short heading/word.

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
`<header data-site-nav>` and `<footer data-site-footer>` hosts exactly as above.

### For pages that use Three.js (Home hero, Lab) add, just before `assets/js/main.js`:
```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
} }
</script>
<script type="module" src="assets/js/three-scene.js"></script>   <!-- or lab.js on the Lab page -->
```
The 3D module looks for a container by id. Home hero container id = **`#hero-canvas`**.
Lab page 3D container id = **`#lab-stage`**. Just place an empty `<div>` with that id and a
sensible height; the module handles the rest. Provide a graceful fallback look (a dark `.panel`
with a `.scanline`) inside the container in case WebGL is unavailable.

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
