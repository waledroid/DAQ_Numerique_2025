/* ============================================================
   EDGE VISION — izifill / IziFiller immersive case study (izifill-scene.js)
   A continuous, cinematic WebGL stage scrubbed by page scroll
   following the exact split-screen architecture & visual language
   of story-scene.js (3D anchored on the left, cards on the right,
   reversible video-scrub feel):
     0. HERO        — Paper Application Form on Clipboard + izifill MV3 Badge
     1. DÉTECTER    — Paper Form Scanned by Laser + FR/EN Profile Matcher
     2. REMPLIR     — Detailed Paper Application Form with 2-Col / 1-Col
                      Input Boxes & Green/Orange/Red Confidence Fill
     3. APPRENDRE   — Central 3D Database Icon (Stacked Cylinders) +
                      Decision Action Flow ("Enregistrer Q→R ? → ✔ OUI")
     4. SUIVRE      — Multi-Step Paper Form Stack → Application Tracker Sheet
   ============================================================ */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ---------- Brand Tokens ------------------------------------- */
const ACCENT = 0xa3e635;      // site --accent (volt-lime)
const ACCENT_HEX = '#A3E635';
const EMERALD = 0x34d399;     // high confidence (filled)
const EMERALD_HEX = '#34D399';
const AMBER = 0xf59e0b;       // uncertain confidence (inferred)
const AMBER_HEX = '#F59E0B';
const ROSE = 0xf43f5e;        // unknown field (manual / learn)
const ROSE_HEX = '#F43F5E';
const CYAN = 0x38bdf8;
const CYAN_HEX = '#38BDF8';
const FOG_COLOR = 0x050607;

/* Card reveal windows over scroll progress (disjoint 5 chapters). */
const CARD_WINDOWS = [
  [0.00, 0.14],
  [0.18, 0.34],
  [0.38, 0.54],
  [0.58, 0.76],
  [0.82, 1.00],
];
const CARD_FADE = 0.04;
const CARD_RISE = 24;

/* ---------- Math Helpers ------------------------------------- */
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
function smoothstep(edge0, edge1, x) {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function init() {
  const container = document.getElementById('story-canvas');
  if (!container) return;
  const body = document.body;

  const reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    body.classList.add('story-static');
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    body.classList.add('story-static');
    return;
  }
  if (!renderer || !renderer.getContext()) {
    body.classList.add('story-static');
    return;
  }

  let width = container.clientWidth || window.innerWidth || 1;
  let height = container.clientHeight || window.innerHeight || 1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.038);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 1.8, 8.2);
  camera.lookAt(0, 0, 0);
  scene.add(camera);

  // Studio Lighting
  scene.add(new THREE.AmbientLight(0x22262e, 1.55));
  const keyLight = new THREE.DirectionalLight(0xfffdf8, 1.9);
  keyLight.position.set(5, 8, 7);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(ACCENT, 1.3, 35);
  rimLight.position.set(-5, 3.5, 4);
  scene.add(rimLight);

  const fillCyan = new THREE.PointLight(CYAN, 0.85, 25);
  fillCyan.position.set(4, -1, 3);
  scene.add(fillCyan);

  /* ==========================================================
     CANVAS TEXTURE HELPERS (HUD Sprites & Paper Form Textures)
     ========================================================== */
  function makeTextSprite(lines, opts = {}) {
    const scale = opts.scale || 0.22;
    const color = opts.color || ACCENT_HEX;
    const font = opts.font || '600 34px "JetBrains Mono", monospace';
    const bg = opts.bg || 'rgba(5, 7, 10, 0.88)';
    const border = opts.border || 'rgba(163, 230, 53, 0.55)';

    const cv = document.createElement('canvas');
    let ctx = cv.getContext('2d');
    ctx.font = font;
    let maxW = 0;
    lines.forEach((l) => {
      const w = ctx.measureText(l).width;
      if (w > maxW) maxW = w;
    });
    cv.width = Math.max(520, Math.ceil(maxW + 72));
    cv.height = 122 * lines.length;
    ctx = cv.getContext('2d');

    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 8, cv.width - 16, cv.height - 16, 16);
    ctx.fill();
    ctx.stroke();

    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    lines.forEach((line, idx) => {
      ctx.fillText(line, 32, 62 + idx * 96);
    });

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(scale * (cv.width / cv.height), scale, 1);
    return { sprite, mat };
  }

  // Draws a tactile off-white paper grain background onto a 2D canvas
  function paintPaperGrain(ctx, w, h, baseColor = '#F4F1EA') {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);

    // Subtle paper fiber speckles &ruled lines
    for (let i = 0; i < 2200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const a = Math.random() * 0.045;
      ctx.fillStyle = i % 2 === 0 ? `rgba(80,70,55,${a})` : `rgba(255,255,255,${a * 1.4})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Subtle page border shadow
    ctx.strokeStyle = '#D6D1C4';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, w - 24, h - 24);
  }

  /**
   * Builds a crisp paper application form texture with real form headers,
   * field labels, input boxes, checkboxes, and a submit button.
   */
  function makePaperFormTexture(mode = 'hero') {
    const w = 1024;
    const h = 1360;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');

    paintPaperGrain(ctx, w, h, '#F5F2EB');

    // Top Document Header Band
    ctx.fillStyle = '#141923';
    ctx.fillRect(48, 48, w - 96, 118);

    ctx.fillStyle = ACCENT_HEX;
    ctx.font = '700 26px "JetBrains Mono", monospace';
    ctx.fillText('FORMULAIRE DE CANDIDATURE · JOB APPLICATION', 80, 96);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillText(' PORTAIL RECRUTEMENT · FR / EN   |   RÉF : ING-CV-2026', 80, 136);

    // Helper to draw a labeled input box on the paper
    function drawInputBox(x, y, bw, bh, label, valueText, state = 'normal') {
      // Field label above box
      ctx.fillStyle = '#334155';
      ctx.font = '700 22px "Inter", sans-serif';
      ctx.fillText(label, x, y - 12);

      // Input Box background + border
      let bg = '#FFFFFF';
      let stroke = '#CBD5E1';
      let badgeText = '';
      let badgeColor = '#10B981';

      if (state === 'green') {
        bg = '#ECFDF5';
        stroke = '#10B981';
        badgeText = '✔ PROFIL';
        badgeColor = '#059669';
      } else if (state === 'orange') {
        bg = '#FFFBEB';
        stroke = '#F59E0B';
        badgeText = '≈ DÉDUIT';
        badgeColor = '#D97706';
      } else if (state === 'red') {
        bg = '#FFF1F2';
        stroke = '#F43F5E';
        badgeText = '! MANUEL';
        badgeColor = '#E11D48';
      }

      ctx.fillStyle = bg;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = state === 'normal' ? 3 : 5;
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, 12);
      ctx.fill();
      ctx.stroke();

      // Status pill in top-right of input
      if (badgeText) {
        ctx.fillStyle = badgeColor;
        ctx.font = '700 18px "JetBrains Mono", monospace';
        const tw = ctx.measureText(badgeText).width;
        ctx.fillText(badgeText, x + bw - tw - 16, y - 12);
      }

      // Value text inside the input box
      if (valueText) {
        ctx.fillStyle = state === 'red' ? '#BE123C' : '#0F172A';
        ctx.font = '600 25px "JetBrains Mono", monospace';
        ctx.fillText(valueText, x + 22, y + bh / 2 + 9);
      } else {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '400 23px "Inter", sans-serif';
        ctx.fillText('Saisir ici / Enter value...', x + 22, y + bh / 2 + 8);
      }
    }

    const colW = (w - 96 - 32) / 2;
    const fullW = w - 96;
    const isFilled = mode === 'filled' || mode === 'hero';

    // Row 1: 2-Column (Prénom + Nom)
    drawInputBox(
      48, 230, colW, 82,
      'Prénom / First Name *',
      isFilled ? 'Atanda' : '',
      isFilled ? 'green' : 'normal'
    );
    drawInputBox(
      48 + colW + 32, 230, colW, 82,
      'Nom / Last Name *',
      isFilled ? 'Abdullahi' : '',
      isFilled ? 'green' : 'normal'
    );

    // Row 2: 2-Column (Email + Téléphone)
    drawInputBox(
      48, 378, colW, 82,
      'Courriel / Email *',
      isFilled ? 'atanda@grenoble-inp.org' : '',
      isFilled ? 'green' : 'normal'
    );
    drawInputBox(
      48 + colW + 32, 378, colW, 82,
      'Téléphone / Phone *',
      isFilled ? '+33 6 •• •• •• ••' : '',
      isFilled ? 'green' : 'normal'
    );

    // Row 3: Full-width File Dropzone (CV PDF)
    ctx.fillStyle = '#334155';
    ctx.font = '700 22px "Inter", sans-serif';
    ctx.fillText('Curriculum Vitae / Resume (PDF) *', 48, 514);

    ctx.save();
    ctx.setLineDash([12, 8]);
    ctx.fillStyle = isFilled ? '#ECFDF5' : '#F8FAFC';
    ctx.strokeStyle = isFilled ? '#10B981' : '#94A3B8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(48, 526, fullW, 96, 14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = isFilled ? '#065F46' : '#64748B';
    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.fillText(
      isFilled
        ? '📎 CV_Atanda_Abdullahi_2026.pdf  [DataTransfer · 142 Ko]'
        : 'Glisser-déposer votre CV PDF / Drop Resume here',
      78,
      584
    );

    // Row 4: 2-Column Select Dropdowns (Work Permit + Salary Range)
    drawInputBox(
      48, 690, colW, 82,
      'Autorisation UE / Work Permit *',
      isFilled ? 'Oui / Yes  ▾' : '— Choisir —  ▾',
      isFilled ? 'green' : 'normal'
    );
    drawInputBox(
      48 + colW + 32, 690, colW, 82,
      'Fourchette salariale / Salary',
      isFilled ? '35 000 € – 45 000 €  ▾' : '— Tranche —  ▾',
      mode === 'filled' ? 'orange' : isFilled ? 'green' : 'normal'
    );

    // Row 5: Custom Recruiter Question Textarea
    drawInputBox(
      48, 840, fullW, 132,
      'Question recruteur : Expérience embarquée (Jetson / TensorRT) ?',
      mode === 'filled'
        ? 'À compléter ou mémoriser en 1 clic (Q → R)...'
        : isFilled
        ? '3 ans — PyTorch, ONNX, TensorRT & OpenVINO'
        : '',
      mode === 'filled' ? 'red' : isFilled ? 'green' : 'normal'
    );

    // Row 6: Checkboxes (RGPD Consent ticked vs Marketing left unticked)
    const cbY = 1018;
    // Checkbox 1 (RGPD)
    ctx.fillStyle = isFilled ? '#10B981' : '#FFFFFF';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.fillRect(48, cbY, 34, 34);
    ctx.strokeRect(48, cbY, 34, 34);
    if (isFilled) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 26px sans-serif';
      ctx.fillText('✓', 54, cbY + 27);
    }
    ctx.fillStyle = '#1E293B';
    ctx.font = '600 21px "Inter", sans-serif';
    ctx.fillText("J'accepte la politique de confidentialité (RGPD) *", 98, cbY + 25);

    // Checkbox 2 (Marketing — intentionally unticked)
    const cb2Y = 1072;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#94A3B8';
    ctx.fillRect(48, cb2Y, 34, 34);
    ctx.strokeRect(48, cb2Y, 34, 34);
    ctx.fillStyle = '#64748B';
    ctx.font = '500 21px "Inter", sans-serif';
    ctx.fillText('Recevoir les offres partenaires / Newsletter (ignoré par izifill)', 98, cb2Y + 25);

    // Bottom Submit Button Bar
    ctx.fillStyle = '#141923';
    ctx.beginPath();
    ctx.roundRect(48, 1155, 360, 78, 16);
    ctx.fill();
    ctx.fillStyle = ACCENT_HEX;
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText('POSTULER / SUBMIT →', 86, 1203);

    // Stamp on the right of the footer
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(w - 370, 1155, 322, 78, 14);
    ctx.stroke();
    ctx.fillStyle = '#059669';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText('⚡ REMPLI EN 4 SEC', w - 340, 1202);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  /**
   * Builds a paper card texture for the Tracker sheet in Chapter 4.
   */
  function makeTrackerSheetTexture() {
    const w = 1024;
    const h = 740;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');

    paintPaperGrain(ctx, w, h, '#F5F2EB');

    ctx.fillStyle = '#141923';
    ctx.fillRect(40, 40, w - 80, 96);
    ctx.fillStyle = ACCENT_HEX;
    ctx.font = '700 26px "JetBrains Mono", monospace';
    ctx.fillText('SUIVI DES CANDIDATURES · APPLICATION TRACKER', 70, 98);

    const rows = [
      { co: 'Isitec International', role: 'Vision IA & Edge Engineer', date: '18 Oct', st: 'OFFRE ✔', col: '#059669', bg: '#D1FAE5' },
      { co: 'Robotics Lab Grenoble', role: 'Computer Vision Engineer', date: '16 Oct', st: 'ENTRETIEN', col: '#0284C7', bg: '#E0F2FE' },
      { co: 'Smart Logistics EU', role: 'MLOps & ONNX Engineer', date: '14 Oct', st: 'POSTULÉ ✔', col: '#4D7C0F', bg: '#ECFCCB' },
      { co: 'DeepEdge Systems', role: 'Embedded AI Developer', date: '11 Oct', st: 'POSTULÉ ✔', col: '#4D7C0F', bg: '#ECFCCB' },
    ];

    rows.forEach((r, idx) => {
      const y = 168 + idx * 126;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(40, y, w - 80, 104, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = '700 25px "Inter", sans-serif';
      ctx.fillText(r.co, 68, y + 44);

      ctx.fillStyle = '#475569';
      ctx.font = '500 21px "JetBrains Mono", monospace';
      ctx.fillText(`${r.role}  ·  ${r.date}`, 68, y + 80);

      // Status Pill
      ctx.fillStyle = r.bg;
      ctx.strokeStyle = r.col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(w - 285, y + 24, 215, 56, 28);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = r.col;
      ctx.font = '700 21px "JetBrains Mono", monospace';
      ctx.fillText(r.st, w - 252, y + 60);
    });

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  function makeSoftGlowDisc() {
    const s = 128;
    const cv = document.createElement('canvas');
    cv.width = s;
    cv.height = s;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(163,230,53,0.8)');
    g.addColorStop(0.7, 'rgba(163,230,53,0.15)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const softGlowTexture = makeSoftGlowDisc();

  /* ==========================================================
     BACKGROUND AMBIENCE — Soft Optical Dust & Stage Floor
     ========================================================== */
  const DUST_COUNT = 700;
  const dustPos = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i++) {
    dustPos[i * 3 + 0] = (Math.random() - 0.5) * 24;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 16;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    map: softGlowTexture,
    color: ACCENT,
    size: 0.11,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  const STAGE_X = -1.45;

  const stageFloorGroup = new THREE.Group();
  stageFloorGroup.position.set(STAGE_X, -1.45, 0);
  scene.add(stageFloorGroup);

  const floorGrid = new THREE.GridHelper(6.6, 16, ACCENT, 0x16202a);
  floorGrid.material.transparent = true;
  floorGrid.material.opacity = 0.22;
  stageFloorGroup.add(floorGrid);

  // Shared Paper Textures
  const heroFormTex = makePaperFormTexture('hero');
  const blankFormTex = makePaperFormTexture('blank');
  const filledFormTex = makePaperFormTexture('filled');

  const paperSideMat = new THREE.MeshStandardMaterial({
    color: 0xe6e1d6,
    roughness: 0.75,
    metalness: 0.05,
  });

  /* ==========================================================
     CHAPTER 0: HERO — 3D Paper Application Form on Clipboard
     with Floating izifill Chrome MV3 Extension Badge
     ========================================================== */
  const ch0Group = new THREE.Group();
  ch0Group.position.set(STAGE_X, 0.0, 0);
  scene.add(ch0Group);

  const clipboardRig = new THREE.Group();
  clipboardRig.rotation.set(-0.08, 0.26, -0.02);
  ch0Group.add(clipboardRig);

  // Dark slate clipboard backing board
  const boardBacking = new THREE.Mesh(
    new RoundedBoxGeometry(2.55, 3.32, 0.08, 4, 0.06),
    new THREE.MeshPhysicalMaterial({
      color: 0x121721,
      metalness: 0.65,
      roughness: 0.35,
      clearcoat: 0.4,
    })
  );
  boardBacking.position.set(0, 0, -0.05);
  clipboardRig.add(boardBacking);

  // Metallic clipboard clip at top
  const metalClip = new THREE.Mesh(
    new RoundedBoxGeometry(0.82, 0.22, 0.14, 3, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 })
  );
  metalClip.position.set(0, 1.62, 0.02);
  clipboardRig.add(metalClip);

  // Second stacked paper sheet slightly rotated behind main sheet
  const backSheet = new THREE.Mesh(
    new THREE.BoxGeometry(2.34, 3.08, 0.03),
    paperSideMat
  );
  backSheet.position.set(0.06, -0.04, -0.01);
  backSheet.rotation.z = -0.035;
  clipboardRig.add(backSheet);

  // Main Paper Application Form Sheet with printed form texture
  const ch0PaperMat = new THREE.MeshStandardMaterial({
    map: heroFormTex,
    roughness: 0.62,
    metalness: 0.04,
    transparent: true,
    opacity: 1,
  });
  const mainSheet = new THREE.Mesh(
    new THREE.BoxGeometry(2.34, 3.08, 0.04),
    [paperSideMat, paperSideMat, paperSideMat, paperSideMat, ch0PaperMat, paperSideMat]
  );
  mainSheet.position.set(0, 0, 0.03);
  clipboardRig.add(mainSheet);

  // Subtle glowing perimeter frame around the clipboard form
  const ch0HaloMat = new THREE.LineBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.55,
  });
  const ch0HaloFrame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.38, 3.12, 0.05)),
    ch0HaloMat
  );
  ch0HaloFrame.position.set(0, 0, 0.035);
  clipboardRig.add(ch0HaloFrame);

  // Floating izifill Chrome Badge above-left of the paper form
  const extBadge = makeTextSprite(
    ['⚡ izifill · CHROME MV3', 'Formulaire rempli en 1 clic'],
    { scale: 0.32, color: ACCENT_HEX, border: 'rgba(163,230,53,0.75)' }
  );
  extBadge.sprite.position.set(-0.85, 1.56, 0.45);
  ch0Group.add(extBadge.sprite);

  const localBadge = makeTextSprite(
    ['100% LOCAL · 0 RÉSEAU', 'Profil + CV PDF injectés'],
    { scale: 0.30, color: EMERALD_HEX, border: 'rgba(52,211,153,0.65)' }
  );
  localBadge.sprite.position.set(0.88, -1.52, 0.45);
  ch0Group.add(localBadge.sprite);

  /* ==========================================================
     CHAPTER 1: DÉTECTER & MATCHER — Paper Form Scanned by
     Laser + 31-Key Bilingual FR/EN Profile Card
     ========================================================== */
  const ch1Group = new THREE.Group();
  ch1Group.position.set(STAGE_X, 0.0, 0);
  ch1Group.visible = false;
  scene.add(ch1Group);

  // Left side: Blank/Unfilled Paper Form being scanned
  const scanFormRig = new THREE.Group();
  scanFormRig.position.set(-1.05, 0.0, 0);
  scanFormRig.rotation.y = 0.22;
  ch1Group.add(scanFormRig);

  const ch1PaperMat = new THREE.MeshStandardMaterial({
    map: blankFormTex,
    roughness: 0.65,
    metalness: 0.04,
    transparent: true,
    opacity: 1,
  });
  const scanPaperMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 2.7, 0.04),
    [paperSideMat, paperSideMat, paperSideMat, paperSideMat, ch1PaperMat, paperSideMat]
  );
  scanFormRig.add(scanPaperMesh);

  // Glowing green laser bar scanning vertically over the paper form
  const scanLaserMat = new THREE.MeshBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.9,
  });
  const scanLaser = new THREE.Mesh(
    new THREE.BoxGeometry(2.18, 0.05, 0.12),
    scanLaserMat
  );
  scanLaser.position.set(0, 0, 0.06);
  scanFormRig.add(scanLaser);

  // Right side: Saved User Profile Card (31 FR/EN Keys)
  const profileCardRig = new THREE.Group();
  profileCardRig.position.set(1.18, 0.0, 0.12);
  profileCardRig.rotation.y = -0.22;
  ch1Group.add(profileCardRig);

  function makeProfileCardTexture() {
    const w = 760;
    const h = 1000;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');

    paintPaperGrain(ctx, w, h, '#111722');

    ctx.fillStyle = ACCENT_HEX;
    ctx.font = '700 28px "JetBrains Mono", monospace';
    ctx.fillText('PROFIL ENREGISTRÉ (31 CLÉS)', 44, 72);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillText('Dictionnaire bilingue FR ⇄ EN', 44, 110);

    const keys = [
      ['identity.fullName', 'Prénom & Nom / Full Name', '#34D399'],
      ['contact.email', 'Courriel / Email & Phone', '#34D399'],
      ['files.cv', 'CV_Atanda.pdf (DataTransfer)', '#38BDF8'],
      ['standard.salary', '38 000 € → Tranche [35k–45k]', '#F59E0B'],
      ['eligibility.eu', 'Autorisé UE : Oui ⇄ Yes', '#A3E635'],
    ];

    keys.forEach((k, i) => {
      const y = 165 + i * 155;
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = k[2];
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(40, y, w - 80, 125, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = k[2];
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.fillText(k[0], 68, y + 48);

      ctx.fillStyle = '#F1F5F9';
      ctx.font = '600 24px "Inter", sans-serif';
      ctx.fillText(k[1], 68, y + 92);
    });

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const ch1ProfileMat = new THREE.MeshStandardMaterial({
    map: makeProfileCardTexture(),
    roughness: 0.4,
    metalness: 0.2,
    transparent: true,
    opacity: 1,
  });
  const profileCardMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 2.45, 0.05),
    [paperSideMat, paperSideMat, paperSideMat, paperSideMat, ch1ProfileMat, paperSideMat]
  );
  profileCardRig.add(profileCardMesh);

  // Connecting Matching Arcs between Paper Form fields and Profile Keys
  const matchFieldY = [0.78, 0.40, 0.02, -0.36, -0.74];
  const matchArcs = [];
  const matchPulses = [];
  matchFieldY.forEach((y, idx) => {
    const start = new THREE.Vector3(-0.2, y, 0.1);
    const mid = new THREE.Vector3(0.05, y + 0.24, 0.65);
    const end = new THREE.Vector3(0.38, y, 0.18);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const pts = curve.getPoints(28);
    const arcGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const arcColor = idx === 3 ? AMBER : ACCENT;
    const arcMat = new THREE.LineBasicMaterial({
      color: arcColor,
      transparent: true,
      opacity: 0.75,
    });
    ch1Group.add(new THREE.Line(arcGeo, arcMat));
    matchArcs.push(arcMat);

    const pMat = new THREE.MeshBasicMaterial({
      color: arcColor,
      transparent: true,
      opacity: 0.95,
    });
    const pMesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), pMat);
    ch1Group.add(pMesh);
    matchPulses.push({ mesh: pMesh, mat: pMat, curve, offset: idx * 0.2 });
  });

  const ch1Hud = makeTextSprite(
    ['ANALYSE DU PAPIER / DOM → 31 CLÉS FR/EN'],
    { scale: 0.26, color: ACCENT_HEX, border: 'rgba(163,230,53,0.65)' }
  );
  ch1Hud.sprite.position.set(0.0, 1.52, 0.3);
  ch1Group.add(ch1Hud.sprite);

  /* ==========================================================
     CHAPTER 2: REMPLIR — Close-up Paper Application Form with
     3D Input Boxes & Green / Orange / Red Confidence Fill
     ========================================================== */
  const ch2Group = new THREE.Group();
  ch2Group.position.set(STAGE_X, 0.04, 0);
  ch2Group.visible = false;
  scene.add(ch2Group);

  const ch2PaperRig = new THREE.Group();
  ch2PaperRig.rotation.set(0.03, 0.18, 0);
  ch2Group.add(ch2PaperRig);

  const ch2PaperMat = new THREE.MeshStandardMaterial({
    map: filledFormTex,
    roughness: 0.58,
    metalness: 0.04,
    transparent: true,
    opacity: 1,
  });
  const ch2PaperSheet = new THREE.Mesh(
    new THREE.BoxGeometry(2.54, 3.30, 0.05),
    [paperSideMat, paperSideMat, paperSideMat, paperSideMat, ch2PaperMat, paperSideMat]
  );
  ch2PaperRig.add(ch2PaperSheet);

  // Exact canvas-to-3D coordinate mapping for the 8 input boxes on the 2.54 x 3.30 paper sheet:
  // Canvas is 1024 x 1360:
  //   3D X = ((cx + cw/2) / 1024 - 0.5) * 2.54
  //   3D Y = (0.5 - (cy + ch/2) / 1360) * 3.30
  const ch2BoxSpecs = [
    { x: -0.575, y: 0.992, w: 1.07, h: 0.20, col: EMERALD }, // Prénom
    { x: 0.575, y: 0.992, w: 1.07, h: 0.20, col: EMERALD },  // Nom
    { x: -0.575, y: 0.633, w: 1.07, h: 0.20, col: EMERALD }, // Email
    { x: 0.575, y: 0.633, w: 1.07, h: 0.20, col: EMERALD },  // Téléphone
    { x: 0.0, y: 0.257, w: 2.30, h: 0.23, col: EMERALD },    // CV PDF Dropzone
    { x: -0.575, y: -0.124, w: 1.07, h: 0.20, col: EMERALD },// Autorisation UE
    { x: 0.575, y: -0.124, w: 1.07, h: 0.20, col: AMBER },   // Fourchette salariale (Orange)
    { x: 0.0, y: -0.548, w: 2.30, h: 0.32, col: ROSE },      // Question recruteur (Rouge)
  ];

  const ch2InputFrames = ch2BoxSpecs.map((b) => {
    const edgeMat = new THREE.LineBasicMaterial({
      color: b.col,
      transparent: true,
      opacity: 0.95,
    });
    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(b.w, b.h, 0.025)),
      edgeMat
    );
    frame.position.set(b.x, b.y, 0.038);
    ch2PaperRig.add(frame);

    return { frame, edgeMat };
  });

  const ch2HudLegend = makeTextSprite(
    ['● VERT : Profil   ● ORANGE : Déduit   ● ROUGE : Manuel'],
    { scale: 0.26, color: ACCENT_HEX, border: 'rgba(163,230,53,0.65)' }
  );
  ch2HudLegend.sprite.position.set(0.0, -1.58, 0.35);
  ch2Group.add(ch2HudLegend.sprite);

  /* ==========================================================
     CHAPTER 3: APPRENDRE — Central 3D Database Icon (Stacked
     Cylinders) + Decision Action Flow ("Enregistrer Q→R ? → ✔ OUI")
     ========================================================== */
  const ch3Group = new THREE.Group();
  ch3Group.position.set(STAGE_X, 0.0, 0);
  ch3Group.visible = false;
  scene.add(ch3Group);

  // 1) Left side: Mini Paper Question Snippet + Decision Action Card
  const decisionGroup = new THREE.Group();
  decisionGroup.position.set(-1.28, 0.08, 0.15);
  decisionGroup.rotation.y = 0.22;
  ch3Group.add(decisionGroup);

  function makeDecisionCardTexture() {
    const w = 680;
    const h = 760;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');

    paintPaperGrain(ctx, w, h, '#F5F2EB');

    // Top header
    ctx.fillStyle = '#141923';
    ctx.fillRect(36, 36, w - 72, 86);
    ctx.fillStyle = ROSE_HEX;
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText('QUESTION INÉDITE DÉTECTÉE', 62, 90);

    // Question Box
    ctx.fillStyle = '#334155';
    ctx.font = '700 22px "Inter", sans-serif';
    ctx.fillText('Question du formulaire :', 44, 174);

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(44, 190, w - 88, 86, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0F172A';
    ctx.font = '600 23px "Inter", sans-serif';
    ctx.fillText('« Expérience Jetson / TensorRT ? »', 66, 242);

    // User Answer Box
    ctx.fillStyle = '#334155';
    ctx.font = '700 22px "Inter", sans-serif';
    ctx.fillText('Votre réponse saisie :', 44, 332);

    ctx.fillStyle = '#ECFDF5';
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(44, 348, w - 88, 92, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#065F46';
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText('« 3 ans — PyTorch & TensorRT »', 66, 404);

    // Decision Action Box at bottom
    ctx.fillStyle = '#141923';
    ctx.strokeStyle = ACCENT_HEX;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(44, 488, w - 88, 218, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 24px "Inter", sans-serif';
    ctx.fillText('DÉCISION : Mémoriser cette Q→R ?', 74, 544);

    // YES Button (Active Green)
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.roundRect(74, 578, 310, 92, 14);
    ctx.fill();
    ctx.fillStyle = '#05070A';
    ctx.font = '700 26px "JetBrains Mono", monospace';
    ctx.fillText('✔ OUI, ENREGISTRER', 96, 634);

    // NO Button (Muted)
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(410, 578, 190, 92, 14);
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 23px "JetBrains Mono", monospace';
    ctx.fillText('Ignorer', 458, 634);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  const decisionCardMat = new THREE.MeshStandardMaterial({
    map: makeDecisionCardTexture(),
    roughness: 0.55,
    metalness: 0.05,
    transparent: true,
    opacity: 1,
  });
  const decisionCardMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.78, 2.0, 0.05),
    [paperSideMat, paperSideMat, paperSideMat, paperSideMat, decisionCardMat, paperSideMat]
  );
  decisionGroup.add(decisionCardMesh);

  // 3D Decision Diamond Node in the center between the Form Card and the Database
  const diamondGroup = new THREE.Group();
  diamondGroup.position.set(-0.02, 0.08, 0.35);
  ch3Group.add(diamondGroup);

  const diamondMat = new THREE.MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.5,
    transparent: true,
    opacity: 0.95,
  });
  const diamondMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), diamondMat);
  diamondGroup.add(diamondMesh);

  const diamondHaloMat = new THREE.MeshBasicMaterial({
    color: EMERALD,
    transparent: true,
    opacity: 0.85,
  });
  const diamondHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.02, 16, 48),
    diamondHaloMat
  );
  diamondGroup.add(diamondHalo);

  // 2) Right-Center: Classic 3D Database Icon (3 Stacked Cylindrical Platters)
  const dbGroup = new THREE.Group();
  dbGroup.position.set(1.18, 0.02, 0.05);
  dbGroup.rotation.set(0.18, -0.25, 0);
  ch3Group.add(dbGroup);

  const dbCylinderMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.82,
    roughness: 0.22,
    clearcoat: 0.7,
    transparent: true,
    opacity: 0.98,
  });
  const dbCapMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    metalness: 0.75,
    roughness: 0.25,
    clearcoat: 0.6,
    transparent: true,
    opacity: 0.98,
  });

  const dbDiscs = [];
  const discYs = [0.68, 0.0, -0.68];
  discYs.forEach((dy, idx) => {
    const discTier = new THREE.Group();
    discTier.position.y = dy;
    dbGroup.add(discTier);

    // Main Database Platter Cylinder
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.92, 0.48, 48),
      [dbCylinderMat, dbCapMat, dbCapMat]
    );
    discTier.add(cyl);

    // Glowing Neon Ring around the platter bevel
    const ringCol = idx === 0 ? EMERALD : idx === 1 ? ACCENT : CYAN;
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringCol,
      transparent: true,
      opacity: 0.95,
    });
    const topRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.93, 0.026, 16, 64),
      ringMat
    );
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = 0.22;
    discTier.add(topRing);

    const botRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.93, 0.018, 16, 64),
      ringMat
    );
    botRing.rotation.x = Math.PI / 2;
    botRing.position.y = -0.22;
    discTier.add(botRing);

    // Front LED Status Indicator Bars on each Database Cylinder
    for (let led = 0; led < 3; led++) {
      const ledMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 12, 12),
        ringMat
      );
      const angle = -0.35 + led * 0.22;
      ledMesh.position.set(Math.sin(angle) * 0.94, 0, Math.cos(angle) * 0.94);
      discTier.add(ledMesh);
    }

    dbDiscs.push({ tier: discTier, ringMat, baseY: dy });
  });

  // Data Flow Stream from Decision Card → Decision Diamond → 3D Database
  const dbStreamCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.45, -0.25, 0.22),
    new THREE.Vector3(-0.02, 0.08, 0.35),
    new THREE.Vector3(0.55, 0.45, 0.25),
    new THREE.Vector3(1.18, 0.68, 0.1),
  ]);
  const dbStreamLineMat = new THREE.LineBasicMaterial({
    color: EMERALD,
    transparent: true,
    opacity: 0.85,
  });
  ch3Group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(dbStreamCurve.getPoints(36)),
      dbStreamLineMat
    )
  );

  const dbPackets = [];
  for (let i = 0; i < 4; i++) {
    const pkMat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? EMERALD : ACCENT,
      transparent: true,
      opacity: 0.95,
    });
    const pkMesh = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), pkMat);
    ch3Group.add(pkMesh);
    dbPackets.push({ mesh: pkMesh, mat: pkMat, offset: i * 0.25 });
  }

  const ch3HudDb = makeTextSprite(
    ['BASE DE DONNÉES LOCALE (ChunkedStore)', 'Q → R enregistrée pour les prochains formulaires'],
    { scale: 0.32, color: EMERALD_HEX, border: 'rgba(52,211,153,0.65)' }
  );
  ch3HudDb.sprite.position.set(0.15, 1.48, 0.35);
  ch3Group.add(ch3HudDb.sprite);

  /* ==========================================================
     CHAPTER 4: SUIVRE — Multi-Step Paper Form Progression +
     Paper Application Tracker Sheet
     ========================================================== */
  const ch4Group = new THREE.Group();
  ch4Group.position.set(STAGE_X, -0.04, 0);
  ch4Group.visible = false;
  scene.add(ch4Group);

  // Upper 3-step Mini Form Progression (Étape 1 ✔ → Étape 2 ✔ → Envoyé ✔)
  const pilotStepGroup = new THREE.Group();
  pilotStepGroup.position.set(0, 1.08, 0.15);
  ch4Group.add(pilotStepGroup);

  const stepLabels = ['ÉTAPE 1 ✔', 'ÉTAPE 2 ✔', 'ENVOYÉ ✔'];
  const stepPositions = [-1.22, 0.0, 1.22];
  const stepNodes = stepPositions.map((sx, idx) => {
    const col = idx === 2 ? EMERALD : ACCENT;
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: 0.6,
      roughness: 0.25,
      transparent: true,
      opacity: 0.95,
    });
    const node = new THREE.Mesh(
      new RoundedBoxGeometry(0.84, 0.32, 0.12, 3, 0.05),
      mat
    );
    node.position.set(sx, 0, 0);
    pilotStepGroup.add(node);
    return { node, mat, label: stepLabels[idx] };
  });

  const stepRailMat = new THREE.MeshBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.65,
  });
  pilotStepGroup.add(
    new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.04, 0.04), stepRailMat)
  );

  // Lower Paper Application Tracker Sheet
  const trackerRig = new THREE.Group();
  trackerRig.position.set(0, -0.32, 0);
  trackerRig.rotation.set(0.08, 0.16, 0);
  ch4Group.add(trackerRig);

  const trackerTexMat = new THREE.MeshStandardMaterial({
    map: makeTrackerSheetTexture(),
    roughness: 0.55,
    metalness: 0.05,
    transparent: true,
    opacity: 1,
  });
  const trackerSheetMesh = new THREE.Mesh(
    new THREE.BoxGeometry(3.15, 2.25, 0.05),
    [paperSideMat, paperSideMat, paperSideMat, paperSideMat, trackerTexMat, paperSideMat]
  );
  trackerRig.add(trackerSheetMesh);

  const ch4Hud = makeTextSprite(
    ['CANDIDATURE CONFIRMÉE → JOURNALISÉE ✔'],
    { scale: 0.28, color: EMERALD_HEX, border: 'rgba(52,211,153,0.65)' }
  );
  ch4Hud.sprite.position.set(0.0, 1.54, 0.35);
  ch4Group.add(ch4Hud.sprite);

  /* ==========================================================
     CAMERA CHOREOGRAPHY (Split-Screen Left Stage, Same as Homepage)
     ========================================================== */
  const CAM_KF = [
    { p: 0.00, pos: [0.0, 0.25, 6.8], look: [0.0, 0.04, 0.0] },
    { p: 0.25, pos: [0.0, 0.20, 7.0], look: [0.0, 0.04, 0.0] },
    { p: 0.46, pos: [0.0, 0.16, 6.8], look: [0.0, 0.02, 0.0] },
    { p: 0.66, pos: [0.0, 0.24, 6.9], look: [0.0, 0.04, 0.0] },
    { p: 0.90, pos: [0.0, 0.20, 7.0], look: [0.0, 0.02, 0.0] },
    { p: 1.00, pos: [0.0, 0.20, 7.0], look: [0.0, 0.02, 0.0] },
  ];

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();

  function sampleCamera(p) {
    const isDesktop = width >= 768;
    const offsetX = isDesktop ? 0.6 : -1.45;

    let i = 0;
    while (i < CAM_KF.length - 2 && p > CAM_KF[i + 1].p) i++;
    const a = CAM_KF[i];
    const b = CAM_KF[i + 1];
    const localT = smoothstep(a.p, b.p, p);

    camPos.set(
      THREE.MathUtils.lerp(a.pos[0], b.pos[0], localT) + offsetX,
      THREE.MathUtils.lerp(a.pos[1], b.pos[1], localT),
      THREE.MathUtils.lerp(a.pos[2], b.pos[2], localT)
    );
    camLook.set(
      THREE.MathUtils.lerp(a.look[0], b.look[0], localT) + offsetX,
      THREE.MathUtils.lerp(a.look[1], b.look[1], localT),
      THREE.MathUtils.lerp(a.look[2], b.look[2], localT)
    );
  }

  /* ==========================================================
     SCROLL BINDING & DOM STORY CARDS
     ========================================================== */
  const storyEl = document.getElementById('story');
  const cards = Array.from(document.querySelectorAll('.story-card'));
  const cardBases = cards.map(() => '');

  function computeCardBases() {
    const desktop = window.matchMedia('(min-width: 768px)').matches;
    for (let i = 0; i < cards.length; i++) {
      cardBases[i] = desktop ? 'translateY(-50%)' : '';
    }
  }
  computeCardBases();

  function applyCards(p) {
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const win = CARD_WINDOWS[i] || [0, 0];
      const start = win[0];
      const end = win[1];

      let alpha = 0;
      let shiftY = 0;

      if (i === 0 && p <= end + CARD_FADE) {
        alpha = 1 - smoothstep(end - CARD_FADE, end + CARD_FADE, p);
        shiftY = -CARD_RISE * (1 - alpha);
      } else if (i === cards.length - 1 && p >= start - CARD_FADE) {
        alpha = smoothstep(start - CARD_FADE, start + CARD_FADE, p);
        shiftY = CARD_RISE * (1 - alpha);
      } else {
        const fadeIn = smoothstep(start - CARD_FADE, start + CARD_FADE, p);
        const fadeOut = 1 - smoothstep(end - CARD_FADE, end + CARD_FADE, p);
        alpha = Math.min(fadeIn, fadeOut);
        shiftY = p < (start + end) * 0.5 ? CARD_RISE * (1 - fadeIn) : -CARD_RISE * (1 - fadeOut);
      }

      card.style.opacity = alpha.toFixed(3);
      const base = cardBases[i];
      card.style.transform = base
        ? `${base} translate3d(0, ${shiftY.toFixed(1)}px, 0)`
        : `translate3d(0, ${shiftY.toFixed(1)}px, 0)`;
      card.style.pointerEvents = alpha > 0.45 ? 'auto' : 'none';
    }
  }

  let targetProgress = 0;
  let progress = 0;
  let storyTop = 0;
  let storySpan = 1;

  function measureStory() {
    if (!storyEl) return;
    const rect = storyEl.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset || 0;
    storyTop = rect.top + scrollY;
    storySpan = Math.max(1, storyEl.offsetHeight - window.innerHeight);
  }

  function readScroll() {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    targetProgress = clamp((scrollY - storyTop) / storySpan, 0, 1);
  }

  measureStory();
  readScroll();
  progress = targetProgress;
  applyCards(progress);

  if (window.gsap && window.ScrollTrigger && storyEl) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.ScrollTrigger.create({
      trigger: storyEl,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: (self) => {
        targetProgress = clamp(self.progress, 0, 1);
      },
    });
  } else {
    window.addEventListener('scroll', readScroll, { passive: true });
  }

  // Subtle Mouse Parallax
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener(
    'pointermove',
    (e) => {
      mouse.tx = (e.clientX / Math.max(1, width) - 0.5) * 2;
      mouse.ty = (e.clientY / Math.max(1, height) - 0.5) * 2;
    },
    { passive: true }
  );

  /* ==========================================================
     FRAME UPDATE (Continuous Reversible Scroll-Driven State)
     ========================================================== */
  const _pt = new THREE.Vector3();

  function update(dt) {
    readScroll();
    const lerpFactor = 1 - Math.exp(-dt * 12);
    progress += (targetProgress - progress) * lerpFactor;
    if (Math.abs(targetProgress - progress) < 0.0002) progress = targetProgress;

    const p = progress;
    const t = performance.now() * 0.001;

    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    sampleCamera(p);
    camera.position.set(
      camPos.x + mouse.x * 0.16,
      camPos.y - mouse.y * 0.10,
      camPos.z
    );
    camera.lookAt(camLook.x, camLook.y, camLook.z);

    applyCards(p);
    dustPoints.rotation.y = t * 0.018 + p * 0.35;

    // --- CHAPTER 0: HERO (Paper Clipboard Form + izifill Badge) [0.00 .. 0.18] ---
    const ch0Alpha = 1 - smoothstep(0.13, 0.19, p);
    ch0Group.visible = ch0Alpha > 0.001;
    if (ch0Group.visible) {
      clipboardRig.rotation.y = 0.24 + Math.sin(t * 0.65) * 0.12 + p * 0.8;
      clipboardRig.rotation.x = -0.06 + Math.cos(t * 0.5) * 0.05;
      ch0PaperMat.opacity = ch0Alpha;
      ch0HaloMat.opacity = 0.55 * ch0Alpha;
      extBadge.mat.opacity = 0.94 * ch0Alpha;
      localBadge.mat.opacity = 0.92 * ch0Alpha;
    }

    // --- CHAPTER 1: DÉTECTER & MATCHER (Paper Form Scanner + 31-Key Card) [0.16 .. 0.36] ---
    const ch1Alpha = smoothstep(0.15, 0.20, p) * (1 - smoothstep(0.33, 0.38, p));
    ch1Group.visible = ch1Alpha > 0.001;
    if (ch1Group.visible) {
      ch1Group.position.y = -(1 - ch1Alpha) * 0.22;
      scanLaser.position.y = Math.sin(t * 2.1) * 1.05;
      scanLaserMat.opacity = 0.9 * ch1Alpha;
      ch1PaperMat.opacity = ch1Alpha;
      ch1ProfileMat.opacity = ch1Alpha;

      matchArcs.forEach((m) => {
        m.opacity = 0.75 * ch1Alpha;
      });
      matchPulses.forEach((mp) => {
        const u = (t * 0.65 + mp.offset) % 1;
        mp.curve.getPoint(u, _pt);
        mp.mesh.position.copy(_pt);
        mp.mat.opacity = Math.sin(Math.PI * u) * 0.95 * ch1Alpha;
      });
      ch1Hud.mat.opacity = 0.92 * ch1Alpha;
    }

    // --- CHAPTER 2: REMPLIR (Paper Form + Green/Orange/Red Input Boxes) [0.35 .. 0.56] ---
    const ch2Alpha = smoothstep(0.35, 0.40, p) * (1 - smoothstep(0.53, 0.58, p));
    ch2Group.visible = ch2Alpha > 0.001;
    if (ch2Group.visible) {
      ch2Group.position.y = 0.04 - (1 - ch2Alpha) * 0.22;
      ch2PaperRig.rotation.y = 0.18 + Math.sin(t * 0.55) * 0.08;
      ch2PaperMat.opacity = ch2Alpha;

      ch2InputFrames.forEach((item, idx) => {
        const pulse = 0.65 + 0.35 * Math.sin(t * 2.6 - idx * 0.5);
        item.edgeMat.opacity = pulse * ch2Alpha;
      });
      ch2HudLegend.mat.opacity = 0.94 * ch2Alpha;
    }

    // --- CHAPTER 3: APPRENDRE (Central 3D Database + Decision Action) [0.55 .. 0.78] ---
    const ch3Alpha = smoothstep(0.55, 0.60, p) * (1 - smoothstep(0.75, 0.80, p));
    ch3Group.visible = ch3Alpha > 0.001;
    if (ch3Group.visible) {
      ch3Group.position.y = -(1 - ch3Alpha) * 0.22;
      decisionCardMat.opacity = ch3Alpha;

      // Decision diamond rotates and pulses
      diamondMesh.rotation.y = t * 1.4;
      diamondMesh.rotation.x = t * 0.8;
      diamondHalo.rotation.z = -t * 1.1;
      diamondMat.opacity = 0.95 * ch3Alpha;
      diamondHaloMat.opacity = 0.85 * ch3Alpha;

      // 3D Database cylinders breathe & rotate gently
      dbGroup.rotation.y = -0.25 + Math.sin(t * 0.6) * 0.12;
      dbDiscs.forEach((d, idx) => {
        d.tier.position.y = d.baseY + Math.sin(t * 2.0 - idx * 0.8) * 0.035;
        d.ringMat.opacity = (0.75 + 0.25 * Math.sin(t * 3.0 - idx)) * ch3Alpha;
      });

      dbStreamLineMat.opacity = 0.85 * ch3Alpha;
      dbPackets.forEach((pk) => {
        const u = (t * 0.55 + pk.offset) % 1;
        dbStreamCurve.getPoint(u, _pt);
        pk.mesh.position.copy(_pt);
        pk.mat.opacity = Math.sin(Math.PI * u) * 0.95 * ch3Alpha;
      });

      ch3HudDb.mat.opacity = 0.94 * ch3Alpha;
    }

    // --- CHAPTER 4: SUIVRE (Multi-Step Flow + Paper Tracker Sheet) [0.77 .. 1.00] ---
    const ch4Alpha = smoothstep(0.77, 0.82, p);
    ch4Group.visible = ch4Alpha > 0.001;
    if (ch4Group.visible) {
      ch4Group.position.y = -0.04 - (1 - ch4Alpha) * 0.22;
      trackerRig.rotation.y = 0.16 + Math.sin(t * 0.5) * 0.08;
      trackerTexMat.opacity = ch4Alpha;

      stepNodes.forEach((sn, idx) => {
        sn.mat.emissiveIntensity = 0.5 + 0.35 * Math.sin(t * 2.8 - idx);
        sn.mat.opacity = 0.95 * ch4Alpha;
      });
      stepRailMat.opacity = 0.65 * ch4Alpha;
      ch4Hud.mat.opacity = 0.94 * ch4Alpha;
    }
  }

  /* ==========================================================
     LOOP & LIFECYCLE
     ========================================================== */
  const clock = new THREE.Clock();
  let isTabVisible = true;

  function loop() {
    requestAnimationFrame(loop);
    if (!isTabVisible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt);
    renderer.render(scene, camera);
  }

  function onResize() {
    width = container.clientWidth || window.innerWidth || 1;
    height = container.clientHeight || window.innerHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    measureStory();
    readScroll();
    computeCardBases();
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(onResize).observe(container);
  } else {
    window.addEventListener('resize', onResize, { passive: true });
  }

  const stickyHost = document.querySelector('.story-sticky') || container;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        isTabVisible = entries[0].isIntersecting;
        if (isTabVisible) clock.getDelta();
      },
      { threshold: 0.0 }
    ).observe(stickyHost);
  }

  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
    if (isTabVisible) clock.getDelta();
  });

  loop();
}

try {
  init();
} catch (err) {
  document.body.classList.add('story-static');
  if (window.console && console.warn) console.warn('[izifill-scene] fallback:', err);
}
