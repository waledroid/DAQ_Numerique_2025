/* ============================================================
   EDGE VISION — izifill / IziFiller immersive case study (izifill-scene.js)
   A continuous, cinematic WebGL stage scrubbed by page scroll
   following the exact split-screen architecture & visual language
   of story-scene.js (3D anchored on the left at x = -1.8, cards on
   the right, reversible video-scrub feel):
     0. HERO        — 3D Chrome MV3 Extension Vault & Local Profile Core
     1. DÉTECTER    — 3D DOM Scanner & Bilingual FR/EN Heuristic Matcher (31 keys)
     2. REMPLIR     — 3D Job Application Form with Green/Orange/Red Confidence Fill
     3. APPRENDRE   — Smart Q→R Memory Bank & ChunkedStore 7 KB Sync Cubes
     4. SUIVRE      — Multi-Step Pilot Pipeline & Automatic Application Tracker Board
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
const MIST_HEX = '#F2F4F7';
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

  // Scene + Fog + Studio Environment (matches homepage story-scene.js)
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
  scene.add(new THREE.AmbientLight(0x161a1f, 1.4));
  const keyLight = new THREE.DirectionalLight(0xdff0e8, 1.8);
  keyLight.position.set(6, 9, 7);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(ACCENT, 1.4, 35);
  rimLight.position.set(-5, 3.5, 4);
  scene.add(rimLight);

  const fillCyan = new THREE.PointLight(CYAN, 0.9, 25);
  fillCyan.position.set(4, -1, 3);
  scene.add(fillCyan);

  /* ==========================================================
     CANVAS TEXTURE HELPERS (Shared HUD & Soft Glow)
     ========================================================== */
  function makeTextSprite(lines, opts = {}) {
    const scale = opts.scale || 0.22;
    const color = opts.color || ACCENT_HEX;
    const font = opts.font || '600 36px "JetBrains Mono", monospace';
    const bg = opts.bg || 'rgba(5, 7, 10, 0.85)';
    const border = opts.border || 'rgba(163, 230, 53, 0.5)';

    const cv = document.createElement('canvas');
    let ctx = cv.getContext('2d');
    ctx.font = font;
    let maxW = 0;
    lines.forEach((l) => {
      const w = ctx.measureText(l).width;
      if (w > maxW) maxW = w;
    });
    cv.width = Math.max(540, Math.ceil(maxW + 76));
    cv.height = 128 * lines.length;
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
      ctx.fillText(line, 32, 64 + idx * 100);
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
     BACKGROUND AMBIENCE — Soft Optical Dust
     ========================================================== */
  const DUST_COUNT = 800;
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
    size: 0.12,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  const STAGE_X = -1.8;

  // Shared Floor Grid & Anchor Ring on the Left Stage
  const stageFloorGroup = new THREE.Group();
  stageFloorGroup.position.set(STAGE_X, -1.35, 0);
  scene.add(stageFloorGroup);

  const floorGrid = new THREE.GridHelper(6.6, 16, ACCENT, 0x16202a);
  floorGrid.material.transparent = true;
  floorGrid.material.opacity = 0.22;
  stageFloorGroup.add(floorGrid);

  /* ==========================================================
     CHAPTER 0: HERO — 3D Chrome MV3 Extension Vault & Local Core
     Anchored at x = -1.8.
     ========================================================== */
  const ch0Group = new THREE.Group();
  ch0Group.position.set(STAGE_X, 0.15, 0);
  scene.add(ch0Group);

  const vaultCore = new THREE.Group();
  vaultCore.rotation.set(0.18, 0.35, 0);
  ch0Group.add(vaultCore);

  const darkChassisMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c0f14,
    metalness: 0.85,
    roughness: 0.28,
    clearcoat: 0.5,
    transparent: true,
    opacity: 1,
  });
  const glassPanelMat = new THREE.MeshPhysicalMaterial({
    color: 0x070b10,
    metalness: 0.7,
    roughness: 0.12,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.92,
  });
  const voltGlowMat = new THREE.MeshBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.9,
  });
  const cyanGlowMat = new THREE.MeshBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.8,
  });

  // Main Octagonal / Rounded Extension Shield Chassis
  const shieldSlab = new THREE.Mesh(
    new RoundedBoxGeometry(2.3, 2.3, 0.42, 6, 0.18),
    darkChassisMat
  );
  vaultCore.add(shieldSlab);

  // Inner Glass Faceplate
  const facePlate = new THREE.Mesh(
    new RoundedBoxGeometry(1.98, 1.98, 0.46, 4, 0.12),
    glassPanelMat
  );
  vaultCore.add(facePlate);

  // Glowing Perimeter Ring
  const outerHalo = new THREE.Mesh(
    new THREE.TorusGeometry(1.48, 0.025, 16, 64),
    voltGlowMat
  );
  vaultCore.add(outerHalo);

  const innerOrbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.12, 0.016, 16, 64),
    cyanGlowMat
  );
  vaultCore.add(innerOrbitRing);

  // Central Extension Puzzle / Profile Emblem (stylized 3D autofill bars inside the vault)
  const emblemGroup = new THREE.Group();
  emblemGroup.position.z = 0.26;
  vaultCore.add(emblemGroup);

  const barColors = [EMERALD, ACCENT, CYAN];
  const emblemBars = [];
  for (let i = 0; i < 3; i++) {
    const y = 0.42 - i * 0.42;
    const track = new THREE.Mesh(
      new RoundedBoxGeometry(1.35, 0.22, 0.06, 3, 0.04),
      new THREE.MeshStandardMaterial({
        color: 0x111722,
        metalness: 0.6,
        roughness: 0.4,
        transparent: true,
        opacity: 1,
      })
    );
    track.position.set(0, y, 0);
    emblemGroup.add(track);

    const fillMat = new THREE.MeshStandardMaterial({
      color: barColors[i],
      emissive: barColors[i],
      emissiveIntensity: 0.75,
      roughness: 0.2,
      transparent: true,
      opacity: 0.95,
    });
    const fillBar = new THREE.Mesh(
      new RoundedBoxGeometry(1.22, 0.14, 0.08, 3, 0.03),
      fillMat
    );
    fillBar.position.set(-0.04, y, 0.02);
    emblemGroup.add(fillBar);
    emblemBars.push({ mesh: fillBar, mat: fillMat, baseScale: 0.75 + i * 0.1 });
  }

  // Orbiting Local Profile Cards around the Vault
  const orbitCardsGroup = new THREE.Group();
  ch0Group.add(orbitCardsGroup);

  const ch0CardSpecs = [
    { label: ['PROFIL LOCAL · 31 CLÉS', 'chrome.storage.sync'], pos: [-1.45, 0.95, 0.6], color: ACCENT_HEX, border: 'rgba(163,230,53,0.6)' },
    { label: ['CV & LETTRE · PDF', 'DataTransfer · local'], pos: [1.45, 0.75, 0.5], color: CYAN_HEX, border: 'rgba(56,189,248,0.6)' },
    { label: ['0 APPEL RÉSEAU', '100% Navigateur · FR/EN'], pos: [0.0, -1.35, 0.75], color: EMERALD_HEX, border: 'rgba(52,211,153,0.6)' },
  ];
  const ch0Sprites = ch0CardSpecs.map((spec) => {
    const s = makeTextSprite(spec.label, {
      scale: 0.34,
      color: spec.color,
      border: spec.border,
    });
    s.sprite.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    orbitCardsGroup.add(s.sprite);
    return s;
  });

  /* ==========================================================
     CHAPTER 1: DÉTECTER & MATCHER — 3D DOM Scanner & Dictionary
     Left side: Browser DOM inputs. Right side of stage: 31-key
     FR/EN Synonym Engine connected by glowing matching arcs.
     ========================================================== */
  const ch1Group = new THREE.Group();
  ch1Group.position.set(STAGE_X, 0.1, 0);
  ch1Group.visible = false;
  scene.add(ch1Group);

  // Left sub-panel: DOM Snapshot Frame
  const domFrame = new THREE.Group();
  domFrame.position.set(-1.15, 0.05, 0);
  domFrame.rotation.y = 0.22;
  ch1Group.add(domFrame);

  const domBoard = new THREE.Mesh(
    new RoundedBoxGeometry(2.0, 2.5, 0.1, 4, 0.06),
    glassPanelMat
  );
  domFrame.add(domBoard);

  const domBorder = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.02, 2.52, 0.11)),
    new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.45 })
  );
  domFrame.add(domBorder);

  // 5 DOM field rows inside the browser snapshot
  const domFieldY = [0.78, 0.38, -0.02, -0.42, -0.82];
  const domFieldMeshes = [];
  domFieldY.forEach((y) => {
    const slot = new THREE.Mesh(
      new RoundedBoxGeometry(1.62, 0.24, 0.06, 2, 0.03),
      new THREE.MeshStandardMaterial({
        color: 0x111926,
        metalness: 0.4,
        roughness: 0.5,
        transparent: true,
        opacity: 0.95,
      })
    );
    slot.position.set(0, y, 0.06);
    domFrame.add(slot);
    domFieldMeshes.push(slot);
  });

  // Laser Scanner Bar sweeping vertically across the DOM frame
  const scanLaserMat = new THREE.MeshBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.85,
  });
  const scanLaser = new THREE.Mesh(
    new THREE.BoxGeometry(1.88, 0.045, 0.16),
    scanLaserMat
  );
  scanLaser.position.set(0, 0, 0.09);
  domFrame.add(scanLaser);

  // Right sub-panel: Heuristic Dictionary Nodes (FR / EN)
  const dictFrame = new THREE.Group();
  dictFrame.position.set(1.2, 0.05, 0.15);
  dictFrame.rotation.y = -0.22;
  ch1Group.add(dictFrame);

  const dictCore = new THREE.Mesh(
    new RoundedBoxGeometry(1.75, 2.35, 0.14, 4, 0.08),
    darkChassisMat
  );
  dictFrame.add(dictCore);

  const dictBorder = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.77, 2.37, 0.15)),
    new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.55 })
  );
  dictFrame.add(dictBorder);

  const dictNodeY = [0.78, 0.38, -0.02, -0.42, -0.82];
  const dictNodes = [];
  dictNodeY.forEach((y, idx) => {
    const nodeColor = idx === 3 ? AMBER : EMERALD;
    const node = new THREE.Mesh(
      new RoundedBoxGeometry(1.42, 0.24, 0.08, 2, 0.03),
      new THREE.MeshStandardMaterial({
        color: nodeColor,
        emissive: nodeColor,
        emissiveIntensity: 0.5,
        roughness: 0.25,
        transparent: true,
        opacity: 0.9,
      })
    );
    node.position.set(0, y, 0.08);
    dictFrame.add(node);
    dictNodes.push(node);
  });

  // Matching Arcs connecting DOM inputs to Profile Dictionary keys
  const matchArcs = [];
  const matchPulses = [];
  domFieldY.forEach((y, idx) => {
    const start = new THREE.Vector3(-0.35, y + 0.05, 0.12);
    const mid = new THREE.Vector3(0.0, y + 0.28, 0.65);
    const end = new THREE.Vector3(0.45, dictNodeY[idx] + 0.05, 0.22);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const pts = curve.getPoints(28);
    const arcGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const arcColor = idx === 3 ? AMBER : ACCENT;
    const arcMat = new THREE.LineBasicMaterial({
      color: arcColor,
      transparent: true,
      opacity: 0.65,
    });
    const arcLine = new THREE.Line(arcGeo, arcMat);
    ch1Group.add(arcLine);
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

  const ch1HudDom = makeTextSprite(
    ['DOM SNAPSHOT · FR / EN', 'label · aria · autocomplete'],
    { scale: 0.32, color: CYAN_HEX, border: 'rgba(56,189,248,0.55)' }
  );
  ch1HudDom.sprite.position.set(-1.15, 1.58, 0.2);
  ch1Group.add(ch1HudDom.sprite);

  const ch1HudDict = makeTextSprite(
    ['MATCHER HEURISTIQUE', '31 clés · Oui↔Yes · Plages'],
    { scale: 0.32, color: ACCENT_HEX, border: 'rgba(163,230,53,0.6)' }
  );
  ch1HudDict.sprite.position.set(1.15, 1.58, 0.25);
  ch1Group.add(ch1HudDict.sprite);

  /* ==========================================================
     CHAPTER 2: REMPLIR — 3D Job Application Form with Live
     Green / Orange / Red Confidence Color-Coding
     ========================================================== */
  const ch2Group = new THREE.Group();
  ch2Group.position.set(STAGE_X, 0.1, 0);
  ch2Group.visible = false;
  scene.add(ch2Group);

  const formRig = new THREE.Group();
  formRig.rotation.set(0.08, 0.24, 0);
  ch2Group.add(formRig);

  // Main 3D Browser Application Card
  const formBody = new THREE.Mesh(
    new RoundedBoxGeometry(3.15, 3.1, 0.16, 5, 0.1),
    darkChassisMat
  );
  formRig.add(formBody);

  const formWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(3.17, 3.12, 0.17)),
    new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.45 })
  );
  formRig.add(formWire);

  // Top browser header bar
  const headerBar = new THREE.Mesh(
    new RoundedBoxGeometry(2.92, 0.26, 0.06, 3, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x141b24, roughness: 0.4, metalness: 0.5 })
  );
  headerBar.position.set(0, 1.28, 0.08);
  formRig.add(headerBar);

  // 6 Form Fields with Confidence Color Coding:
  // 0, 1, 2, 3 = HIGH (Green/Emerald)
  // 4 = UNCERTAIN / INFERRED (Orange/Amber)
  // 5 = UNKNOWN / MANUAL (Red/Rose)
  const formRows = [
    { y: 0.82, color: EMERALD, targetFill: 0.94 }, // Identity: Nom & Prénom
    { y: 0.44, color: EMERALD, targetFill: 0.88 }, // Contact: Email & Téléphone
    { y: 0.06, color: EMERALD, targetFill: 0.96 }, // File: CV_Atanda.pdf (DataTransfer)
    { y: -0.32, color: EMERALD, targetFill: 0.84 }, // Links: GitHub / Portfolio
    { y: -0.70, color: AMBER, targetFill: 0.72 },   // Inferred range: 38k–45k€
    { y: -1.08, color: ROSE, targetFill: 0.22 },    // Unknown custom recruiter question
  ];

  const formFieldItems = formRows.map((row) => {
    const slotMat = new THREE.MeshStandardMaterial({
      color: 0x0f151e,
      metalness: 0.4,
      roughness: 0.5,
      transparent: true,
      opacity: 0.95,
    });
    const slot = new THREE.Mesh(
      new RoundedBoxGeometry(2.74, 0.27, 0.06, 3, 0.04),
      slotMat
    );
    slot.position.set(0, row.y, 0.08);
    formRig.add(slot);

    // Highlight border ring around each field
    const ringMat = new THREE.LineBasicMaterial({
      color: row.color,
      transparent: true,
      opacity: 0.9,
    });
    const ring = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(2.76, 0.28, 0.07)),
      ringMat
    );
    ring.position.set(0, row.y, 0.085);
    formRig.add(ring);

    // Animated Fill Progress Bar inside the field
    const fillMat = new THREE.MeshStandardMaterial({
      color: row.color,
      emissive: row.color,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      transparent: true,
      opacity: 0.9,
    });
    const maxW = 2.58;
    const fillMesh = new THREE.Mesh(
      new RoundedBoxGeometry(maxW, 0.16, 0.05, 2, 0.03),
      fillMat
    );
    fillMesh.position.set(0, row.y, 0.11);
    formRig.add(fillMesh);

    return {
      slotMat,
      ringMat,
      fillMesh,
      fillMat,
      maxW,
      targetFill: row.targetFill,
    };
  });

  // Floating Confidence Legend HUD Badges around the 3D Form
  const ch2HudSummary = makeTextSprite(
    ['IZIFILL · REMPLISSAGE EN 1 CLIC', '4 Verts · 1 Orange · 1 Rouge'],
    { scale: 0.35, color: ACCENT_HEX, border: 'rgba(163,230,53,0.65)' }
  );
  ch2HudSummary.sprite.position.set(0.0, 1.82, 0.35);
  ch2Group.add(ch2HudSummary.sprite);

  const ch2HudGreen = makeTextSprite(
    ['● VERT : PROFIL & CV PDF (HAUTE)'],
    { scale: 0.22, color: EMERALD_HEX, border: 'rgba(52,211,153,0.6)' }
  );
  ch2HudGreen.sprite.position.set(1.75, 0.45, 0.55);
  ch2Group.add(ch2HudGreen.sprite);

  const ch2HudOrange = makeTextSprite(
    ['● ORANGE : TRANCHE DÉDUITE'],
    { scale: 0.22, color: AMBER_HEX, border: 'rgba(245,158,11,0.6)' }
  );
  ch2HudOrange.sprite.position.set(1.75, -0.58, 0.55);
  ch2Group.add(ch2HudOrange.sprite);

  const ch2HudRed = makeTextSprite(
    ['● ROUGE : À COMPLÉTER / APPRENDRE'],
    { scale: 0.22, color: ROSE_HEX, border: 'rgba(244,63,94,0.6)' }
  );
  ch2HudRed.sprite.position.set(1.75, -1.12, 0.55);
  ch2Group.add(ch2HudRed.sprite);

  /* ==========================================================
     CHAPTER 3: APPRENDRE — Smart Q→R Memory & ChunkedStore 7 KB
     Shows a newly answered Question transforming into a learned
     crystal block and slotting into a 3D grid of 7 KB sync chunks.
     ========================================================== */
  const ch3Group = new THREE.Group();
  ch3Group.position.set(STAGE_X, 0.1, 0);
  ch3Group.visible = false;
  scene.add(ch3Group);

  const storeCluster = new THREE.Group();
  storeCluster.rotation.set(0.24, -0.32, 0);
  ch3Group.add(storeCluster);

  // 2x3 Grid of 7 KB ChunkedStore Cubes
  const chunkCubes = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const x = (c - 1) * 1.05;
      const y = (0.5 - r) * 1.05 - 0.25;
      const isLearnedSlot = r === 0 && c === 1;
      const cubeColor = isLearnedSlot ? EMERALD : c === 2 ? CYAN : ACCENT;

      const cubeGroup = new THREE.Group();
      cubeGroup.position.set(x, y, 0);
      storeCluster.add(cubeGroup);

      const coreMat = new THREE.MeshPhysicalMaterial({
        color: 0x0c121a,
        metalness: 0.8,
        roughness: 0.25,
        clearcoat: 0.6,
        transparent: true,
        opacity: 0.94,
      });
      const cubeMesh = new THREE.Mesh(
        new RoundedBoxGeometry(0.82, 0.82, 0.82, 4, 0.08),
        coreMat
      );
      cubeGroup.add(cubeMesh);

      const edgeMat = new THREE.LineBasicMaterial({
        color: cubeColor,
        transparent: true,
        opacity: 0.75,
      });
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(0.84, 0.84, 0.84)),
        edgeMat
      );
      cubeGroup.add(edges);

      const innerCoreMat = new THREE.MeshStandardMaterial({
        color: cubeColor,
        emissive: cubeColor,
        emissiveIntensity: 0.7,
        roughness: 0.2,
        transparent: true,
        opacity: 0.85,
      });
      const innerCore = new THREE.Mesh(
        new RoundedBoxGeometry(0.42, 0.42, 0.42, 3, 0.05),
        innerCoreMat
      );
      cubeGroup.add(innerCore);

      chunkCubes.push({
        group: cubeGroup,
        coreMat,
        edgeMat,
        innerCore,
        innerCoreMat,
        baseY: y,
        isLearnedSlot,
      });
    }
  }

  const ch3HudLearn = makeTextSprite(
    ['APPRENTISSAGE Q → R EN 1 CLIC', 'Question normalisée · Réponse mémorisée'],
    { scale: 0.34, color: EMERALD_HEX, border: 'rgba(52,211,153,0.65)' }
  );
  ch3HudLearn.sprite.position.set(0.0, 1.58, 0.35);
  ch3Group.add(ch3HudLearn.sprite);

  const ch3HudSync = makeTextSprite(
    ['CHUNKEDSTORE · BLOCS DE 7 KO', 'chrome.storage.sync ⇄ repli local'],
    { scale: 0.32, color: CYAN_HEX, border: 'rgba(56,189,248,0.6)' }
  );
  ch3HudSync.sprite.position.set(0.0, -1.52, 0.35);
  ch3Group.add(ch3HudSync.sprite);

  /* ==========================================================
     CHAPTER 4: SUIVRE — Multi-Step Pilot & Application Tracker
     Upper stage: 3-step Pilot flow nodes (Étape 1 → Étape 2 →
     Confirmation ✔). Lower stage: 3D Kanban/Table Tracker Board.
     ========================================================== */
  const ch4Group = new THREE.Group();
  ch4Group.position.set(STAGE_X, 0.1, 0);
  ch4Group.visible = false;
  scene.add(ch4Group);

  // Upper 3-step Pilot Progression
  const pilotStepGroup = new THREE.Group();
  pilotStepGroup.position.set(0, 1.05, 0.15);
  ch4Group.add(pilotStepGroup);

  const stepPositions = [-1.35, 0.0, 1.35];
  const stepNodes = stepPositions.map((sx, idx) => {
    const col = idx === 2 ? EMERALD : ACCENT;
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      transparent: true,
      opacity: 0.95,
    });
    const node = new THREE.Mesh(
      new RoundedBoxGeometry(0.88, 0.36, 0.16, 3, 0.05),
      mat
    );
    node.position.set(sx, 0, 0);
    pilotStepGroup.add(node);
    return { node, mat };
  });

  // Connecting rail between Pilot steps
  const stepRailMat = new THREE.MeshBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.6,
  });
  const stepRail = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 0.04, 0.04),
    stepRailMat
  );
  pilotStepGroup.add(stepRail);

  // Lower 3D Application Tracker Dashboard Board
  const trackerBoard = new THREE.Group();
  trackerBoard.position.set(0, -0.35, 0);
  trackerBoard.rotation.set(0.14, 0.18, 0);
  ch4Group.add(trackerBoard);

  const trackerSlab = new THREE.Mesh(
    new RoundedBoxGeometry(3.35, 2.05, 0.14, 5, 0.08),
    darkChassisMat
  );
  trackerBoard.add(trackerSlab);

  const trackerBorder = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(3.37, 2.07, 0.15)),
    new THREE.LineBasicMaterial({ color: EMERALD, transparent: true, opacity: 0.55 })
  );
  trackerBoard.add(trackerBorder);

  // 4 Tracked Application Rows with Status Badges (Postulé / Entretien / Offre)
  const trackerRowColors = [EMERALD, CYAN, ACCENT, EMERALD];
  const trackerRows = [];
  for (let i = 0; i < 4; i++) {
    const y = 0.58 - i * 0.39;
    const rowMesh = new THREE.Mesh(
      new RoundedBoxGeometry(2.96, 0.28, 0.06, 2, 0.03),
      new THREE.MeshStandardMaterial({
        color: 0x101722,
        metalness: 0.4,
        roughness: 0.5,
        transparent: true,
        opacity: 0.95,
      })
    );
    rowMesh.position.set(0, y, 0.08);
    trackerBoard.add(rowMesh);

    // Status pill on the right side of the row
    const badgeCol = trackerRowColors[i];
    const badgeMat = new THREE.MeshStandardMaterial({
      color: badgeCol,
      emissive: badgeCol,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: 0.95,
    });
    const badge = new THREE.Mesh(
      new RoundedBoxGeometry(0.68, 0.16, 0.08, 2, 0.03),
      badgeMat
    );
    badge.position.set(0.98, y, 0.11);
    trackerBoard.add(badge);

    // Company/title bar on the left side of the row
    const titleBar = new THREE.Mesh(
      new RoundedBoxGeometry(1.65, 0.12, 0.07, 2, 0.02),
      new THREE.MeshBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.75,
      })
    );
    titleBar.position.set(-0.52, y, 0.1);
    trackerBoard.add(titleBar);

    trackerRows.push({ rowMesh, badgeMat });
  }

  const ch4HudPilot = makeTextSprite(
    ['PILOT MULTI-ÉTAPES → TRACKER ✔', 'Candidature journalisée automatiquement'],
    { scale: 0.35, color: EMERALD_HEX, border: 'rgba(52,211,153,0.65)' }
  );
  ch4HudPilot.sprite.position.set(0.0, 1.68, 0.35);
  ch4Group.add(ch4HudPilot.sprite);

  const ch4HudStats = makeTextSprite(
    ['POSTULÉ · ENTRETIEN · OFFRE', '178 tests Vitest · Zéro réseau'],
    { scale: 0.32, color: ACCENT_HEX, border: 'rgba(163,230,53,0.6)' }
  );
  ch4HudStats.sprite.position.set(0.0, -1.62, 0.35);
  ch4Group.add(ch4HudStats.sprite);

  /* ==========================================================
     CAMERA CHOREOGRAPHY (Split-Screen Left Stage, Same as Homepage)
     On desktop (>= 768px), camera sits at x = +0.60 and looks at
     x = +0.60 while the 3D scene is anchored at STAGE_X = -1.8.
     ========================================================== */
  const CAM_KF = [
    { p: 0.00, pos: [0.0, 0.35, 6.2], look: [0.0, 0.10, 0.0] },
    { p: 0.25, pos: [0.0, 0.25, 6.5], look: [0.0, 0.08, 0.0] },
    { p: 0.46, pos: [0.0, 0.20, 6.4], look: [0.0, 0.05, 0.0] },
    { p: 0.66, pos: [0.0, 0.35, 6.2], look: [0.0, 0.05, 0.0] },
    { p: 0.90, pos: [0.0, 0.25, 6.5], look: [0.0, 0.05, 0.0] },
    { p: 1.00, pos: [0.0, 0.25, 6.5], look: [0.0, 0.05, 0.0] },
  ];

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();

  function sampleCamera(p) {
    const isDesktop = width >= 768;
    const offsetX = isDesktop ? 0.6 : -1.8;

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

    // Camera choreography
    sampleCamera(p);
    camera.position.set(
      camPos.x + mouse.x * 0.16,
      camPos.y - mouse.y * 0.10,
      camPos.z
    );
    camera.lookAt(camLook.x, camLook.y, camLook.z);

    // Sync HTML cards
    applyCards(p);

    // Ambient dust drift
    dustPoints.rotation.y = t * 0.018 + p * 0.35;

    // --- CHAPTER 0: HERO (3D Chrome MV3 Vault) [0.00 .. 0.18] ---
    const ch0Alpha = 1 - smoothstep(0.13, 0.19, p);
    ch0Group.visible = ch0Alpha > 0.001;
    if (ch0Group.visible) {
      vaultCore.rotation.y = 0.32 + Math.sin(t * 0.7) * 0.18 + p * 1.4;
      vaultCore.rotation.x = 0.16 + Math.cos(t * 0.5) * 0.08;
      outerHalo.rotation.z = t * 0.4;
      innerOrbitRing.rotation.z = -t * 0.6;

      emblemBars.forEach((b, idx) => {
        const pulse = 0.85 + 0.15 * Math.sin(t * 2.5 + idx * 1.1);
        b.mesh.scale.x = b.baseScale * pulse;
        b.mat.opacity = 0.95 * ch0Alpha;
      });
      ch0Sprites.forEach((s, idx) => {
        s.mat.opacity = 0.92 * ch0Alpha;
        s.sprite.position.y =
          ch0CardSpecs[idx].pos[1] + Math.sin(t * 1.4 + idx * 1.5) * 0.06;
      });
    }

    // --- CHAPTER 1: DÉTECTER & MATCHER (DOM Scanner + Dictionary) [0.16 .. 0.36] ---
    const ch1Alpha = smoothstep(0.15, 0.20, p) * (1 - smoothstep(0.33, 0.38, p));
    ch1Group.visible = ch1Alpha > 0.001;
    if (ch1Group.visible) {
      ch1Group.position.y = 0.1 - (1 - ch1Alpha) * 0.25;
      // Laser sweeps vertically over DOM fields
      scanLaser.position.y = Math.sin(t * 2.1) * 0.95;
      scanLaserMat.opacity = 0.85 * ch1Alpha;

      matchArcs.forEach((m) => {
        m.opacity = 0.65 * ch1Alpha;
      });
      matchPulses.forEach((mp) => {
        const u = (t * 0.65 + mp.offset) % 1;
        mp.curve.getPoint(u, _pt);
        mp.mesh.position.copy(_pt);
        mp.mat.opacity = Math.sin(Math.PI * u) * 0.95 * ch1Alpha;
      });

      ch1HudDom.mat.opacity = 0.92 * ch1Alpha;
      ch1HudDict.mat.opacity = 0.92 * ch1Alpha;
    }

    // --- CHAPTER 2: REMPLIR (3D Form with Confidence Color-Coding) [0.35 .. 0.56] ---
    const ch2Alpha = smoothstep(0.35, 0.40, p) * (1 - smoothstep(0.53, 0.58, p));
    ch2Group.visible = ch2Alpha > 0.001;
    if (ch2Group.visible) {
      ch2Group.position.y = 0.1 - (1 - ch2Alpha) * 0.25;
      formRig.rotation.y = 0.22 + Math.sin(t * 0.55) * 0.1;

      const fillProgress = clamp(smoothstep(0.37, 0.48, p), 0.15, 1.0);
      formFieldItems.forEach((item, idx) => {
        const wave = 0.94 + 0.06 * Math.sin(t * 2.2 + idx * 0.7);
        const s = Math.max(0.08, item.targetFill * fillProgress * wave);
        item.fillMesh.scale.x = s;
        item.fillMesh.position.x = -item.maxW * 0.5 * (1 - s);
        item.fillMat.opacity = 0.92 * ch2Alpha;
        item.ringMat.opacity = 0.9 * ch2Alpha;
      });

      ch2HudSummary.mat.opacity = 0.94 * ch2Alpha;
      ch2HudGreen.mat.opacity = 0.9 * ch2Alpha;
      ch2HudOrange.mat.opacity = 0.9 * ch2Alpha;
      ch2HudRed.mat.opacity = 0.9 * ch2Alpha;
    }

    // --- CHAPTER 3: APPRENDRE (Smart Q→R Memory & ChunkedStore 7 KB) [0.55 .. 0.78] ---
    const ch3Alpha = smoothstep(0.55, 0.60, p) * (1 - smoothstep(0.75, 0.80, p));
    ch3Group.visible = ch3Alpha > 0.001;
    if (ch3Group.visible) {
      storeCluster.rotation.y = -0.28 + Math.sin(t * 0.6) * 0.16 + (p - 0.65) * 1.1;
      storeCluster.rotation.x = 0.22 + Math.cos(t * 0.45) * 0.06;

      const slotT = smoothstep(0.58, 0.70, p);
      chunkCubes.forEach((cb, idx) => {
        const floatY = Math.sin(t * 1.6 + idx * 0.9) * 0.05;
        if (cb.isLearnedSlot) {
          // The newly learned Q→R block drops into its ChunkedStore slot
          cb.group.position.y = cb.baseY + (1 - slotT) * 0.65 + floatY;
          cb.innerCore.rotation.y = t * 1.2;
        } else {
          cb.group.position.y = cb.baseY + floatY;
          cb.innerCore.rotation.y = t * 0.5;
        }
        cb.coreMat.opacity = 0.92 * ch3Alpha;
        cb.edgeMat.opacity = 0.8 * ch3Alpha;
        cb.innerCoreMat.opacity = 0.88 * ch3Alpha;
      });

      ch3HudLearn.mat.opacity = 0.92 * ch3Alpha;
      ch3HudSync.mat.opacity = 0.92 * ch3Alpha;
    }

    // --- CHAPTER 4: SUIVRE (Multi-Step Pilot & Application Tracker) [0.77 .. 1.00] ---
    const ch4Alpha = smoothstep(0.77, 0.82, p);
    ch4Group.visible = ch4Alpha > 0.001;
    if (ch4Group.visible) {
      ch4Group.position.y = 0.1 - (1 - ch4Alpha) * 0.25;
      trackerBoard.rotation.y = 0.18 + Math.sin(t * 0.5) * 0.1;

      stepNodes.forEach((sn, idx) => {
        const pulse = 0.6 + 0.4 * Math.sin(t * 3.0 - idx * 1.1);
        sn.mat.emissiveIntensity = pulse;
        sn.mat.opacity = 0.95 * ch4Alpha;
      });
      stepRailMat.opacity = 0.6 * ch4Alpha;

      trackerRows.forEach((tr, idx) => {
        tr.badgeMat.opacity = 0.95 * ch4Alpha;
        tr.badgeMat.emissiveIntensity = 0.55 + 0.35 * Math.sin(t * 2.2 + idx);
      });

      ch4HudPilot.mat.opacity = 0.94 * ch4Alpha;
      ch4HudStats.mat.opacity = 0.92 * ch4Alpha;
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
