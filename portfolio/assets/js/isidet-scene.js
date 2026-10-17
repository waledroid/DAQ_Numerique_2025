/* ============================================================
   EDGE VISION — IsiDetector immersive case study (isidet-scene.js)
   A continuous, cinematic WebGL stage scrubbed by page scroll
   following the exact split-screen architecture & visual language
   of story-scene.js (3D anchored on the left at x = -1.8, cards on
   the right, reversible video-scrub feel):
     0. HERO        — Zenithal Machine Vision Optics & CMOS Sensor Assembly
     1. SEGMENTER   — Sorting Conveyor Line with Live Instance Masks & BBoxes
     2. COMPRESSER  — 3D Neural Network Pruning & Intel OpenVINO INT8 CPU Module
     3. COMPTER     — ByteTrack & 0.71 ROI Trigger Line with Live Counter HUD
     4. DÉCLENCHER  — High-Speed UDP Pulses (~70 B, 78 µs) to Sorter PLC & Diverter
   ============================================================ */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ---------- Brand Tokens ------------------------------------- */
const ACCENT = 0xa3e635;      // site --accent (volt-lime)
const ACCENT_HEX = '#A3E635';
const EMERALD = 0x34d399;
const CYAN = 0x38bdf8;
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
    cv.width = 560;
    cv.height = 128 * lines.length;
    const ctx = cv.getContext('2d');

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

  /* ==========================================================
     CHAPTER 0: HERO — Zenithal Machine Vision Optics & Sensor
     Matches Homepage Chapter 0 C-Mount lens & CMOS sensor style,
     anchored at x = -1.8.
     ========================================================== */
  const ch0Group = new THREE.Group();
  ch0Group.position.set(STAGE_X, 0.2, 0);
  scene.add(ch0Group);

  const lensAssembly = new THREE.Group();
  lensAssembly.rotation.set(0.22, 0.40, -0.02);
  ch0Group.add(lensAssembly);

  const metalBodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c0e12,
    metalness: 0.85,
    roughness: 0.32,
    clearcoat: 0.4,
    transparent: true,
    opacity: 1,
  });
  const knurlMat = new THREE.MeshPhysicalMaterial({
    color: 0x16191f,
    metalness: 0.7,
    roughness: 0.5,
    transparent: true,
    opacity: 1,
  });
  const glassDomeMat = new THREE.MeshPhysicalMaterial({
    color: 0x05080c,
    metalness: 0.9,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.15,
    transparent: true,
    opacity: 0.96,
  });
  const accentTrimMat = new THREE.MeshStandardMaterial({
    color: 0x0a0d10,
    emissive: ACCENT,
    emissiveIntensity: 0.8,
  });

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.2, 1.7, 48), metalBodyMat);
  barrel.rotation.x = Math.PI / 2;
  lensAssembly.add(barrel);

  const focusRing = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 0.42, 48), knurlMat);
  focusRing.rotation.x = Math.PI / 2;
  focusRing.position.z = -0.2;
  lensAssembly.add(focusRing);

  const apertureRing = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.34, 48), knurlMat);
  apertureRing.rotation.x = Math.PI / 2;
  apertureRing.position.z = 0.38;
  lensAssembly.add(apertureRing);

  const focusStripe = new THREE.Mesh(new THREE.TorusGeometry(1.245, 0.015, 8, 48), accentTrimMat);
  focusStripe.position.z = -0.2;
  lensAssembly.add(focusStripe);

  function makeCh0RingTex() {
    const s = 1024;
    const cv = document.createElement('canvas');
    cv.width = s;
    cv.height = s;
    const ctx = cv.getContext('2d');
    ctx.translate(s / 2, s / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = '600 36px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = 'ISIDETECTOR VISION · ZENITHAL 320px · OPENVINO CPU · ';
    let angle = -Math.PI / 2;
    const step = (Math.PI * 2) / text.length;
    for (let i = 0; i < text.length; i++) {
      ctx.save();
      ctx.rotate(angle + i * step);
      ctx.translate(0, -470);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const textRingMat = new THREE.MeshBasicMaterial({
    map: makeCh0RingTex(),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const textRing = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.18, 64), textRingMat);
  textRing.position.z = 0.86;
  lensAssembly.add(textRing);

  const domeGeo = new THREE.SphereGeometry(4.0, 48, 32, 0, Math.PI * 2, 0, 0.28);
  domeGeo.translate(0, -4.0, 0);
  const frontGlass = new THREE.Mesh(domeGeo, glassDomeMat);
  frontGlass.rotation.x = Math.PI / 2;
  frontGlass.position.z = 0.85;
  lensAssembly.add(frontGlass);

  // Converging Optical Light Rays
  const RAY_COUNT = 16;
  const rayGeo = new THREE.BufferGeometry();
  const rayPos = [];
  for (let i = 0; i < RAY_COUNT; i++) {
    const th = (i / RAY_COUNT) * Math.PI * 2;
    const rWide = 2.2;
    rayPos.push(Math.cos(th) * rWide, Math.sin(th) * rWide, 3.0);
    rayPos.push(Math.cos(th) * 0.9, Math.sin(th) * 0.9, 0.85);
    rayPos.push(Math.cos(th) * 0.9, Math.sin(th) * 0.9, 0.85);
    rayPos.push(0, 0, -0.2);
  }
  rayGeo.setAttribute('position', new THREE.Float32BufferAttribute(rayPos, 3));
  const rayMat = new THREE.LineBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  lensAssembly.add(new THREE.LineSegments(rayGeo, rayMat));

  // CMOS Sensor Package behind the lens
  const cmosPcb = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.3, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x092115, roughness: 0.5, metalness: 0.3 })
  );
  cmosPcb.position.z = -1.1;
  lensAssembly.add(cmosPcb);

  const { sprite: ch0HudSprite, mat: ch0HudMat } = makeTextSprite(
    ['CAMÉRA ZÉNITHALE · ROI 320 PX', '1 DÉCISION / COLIS · CPU SEUL'],
    { scale: 0.23 }
  );
  ch0HudSprite.position.set(0.2, -1.25, 0.9);
  lensAssembly.add(ch0HudSprite);

  /* ==========================================================
     SHARED SORTING LINE CELL (Used in Ch 1 SEGMENTER, Ch 3 COMPTER,
     Ch 4 DÉCLENCHER — anchored cleanly at x = -1.8!)
     ========================================================== */
  const cellGroup = new THREE.Group();
  cellGroup.visible = false;
  scene.add(cellGroup);

  const cellFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 11),
    new THREE.MeshStandardMaterial({ color: 0x080a0e, roughness: 0.5, metalness: 0.3 })
  );
  cellFloor.rotation.x = -Math.PI / 2;
  cellFloor.position.set(STAGE_X, -1.2, 0);
  cellGroup.add(cellFloor);

  const floorGrid = new THREE.GridHelper(9.5, 16, 0x1f2732, 0x10151c);
  floorGrid.position.set(STAGE_X, -1.19, 0);
  cellGroup.add(floorGrid);

  // Elevated Sorting Conveyor Line (runs along Z at x = -2.35, matching homepage!)
  const CONV_X = STAGE_X - 0.55;
  const BELT_Y = -0.42;
  const BELT_LEN = 7.4;
  const BELT_W = 0.94;
  const TRIGGER_Z = 0.85; // 0.71 of the visible ROI span

  const conveyorGroup = new THREE.Group();
  conveyorGroup.position.set(CONV_X, 0, 0);
  cellGroup.add(conveyorGroup);

  const beltMesh = new THREE.Mesh(
    new THREE.BoxGeometry(BELT_W, 0.06, BELT_LEN),
    new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.75, metalness: 0.15 })
  );
  beltMesh.position.y = BELT_Y;
  conveyorGroup.add(beltMesh);

  // Safety Side Rails (muted rust-orange industrial accent)
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8a3b2a, roughness: 0.5, metalness: 0.35 });
  for (const rx of [-BELT_W / 2 - 0.04, BELT_W / 2 + 0.04]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, BELT_LEN), railMat);
    rail.position.set(rx, BELT_Y + 0.08, 0);
    conveyorGroup.add(rail);
  }

  // Steel Rollers
  const rollerMat = new THREE.MeshStandardMaterial({ color: 0x47515c, roughness: 0.3, metalness: 0.8 });
  const rollerGeo = new THREE.CylinderGeometry(0.055, 0.055, BELT_W + 0.04, 16);
  const rollers = [];
  for (let z = -BELT_LEN / 2 + 0.4; z <= BELT_LEN / 2 - 0.4; z += 0.8) {
    const r = new THREE.Mesh(rollerGeo, rollerMat);
    r.rotation.z = Math.PI / 2;
    r.position.set(0, BELT_Y - 0.06, z);
    conveyorGroup.add(r);
    rollers.push(r);
  }

  // Support Legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1b2028, roughness: 0.7 });
  for (const lz of [-BELT_LEN / 2 + 0.6, 0, BELT_LEN / 2 - 0.6]) {
    for (const lx of [-BELT_W / 2 + 0.08, BELT_W / 2 - 0.08]) {
      const legH = BELT_Y - (-1.2);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, legH, 0.08), legMat);
      leg.position.set(lx, -1.2 + legH / 2, lz);
      conveyorGroup.add(leg);
    }
  }

  // Overhead Zenithal Inspection Gantry Arch (at z = -0.35)
  const gantryArch = new THREE.Group();
  gantryArch.position.set(0, BELT_Y, -0.35);
  conveyorGroup.add(gantryArch);

  const gantryMetal = new THREE.MeshStandardMaterial({ color: 0x222832, roughness: 0.4, metalness: 0.7 });
  for (const gx of [-BELT_W / 2 - 0.12, BELT_W / 2 + 0.12]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.45, 0.08), gantryMetal);
    p.position.set(gx, 0.72, 0);
    gantryArch.add(p);
  }
  const gantryTop = new THREE.Mesh(new THREE.BoxGeometry(BELT_W + 0.34, 0.08, 0.14), gantryMetal);
  gantryTop.position.set(0, 1.45, 0);
  gantryArch.add(gantryTop);

  const camUnit = new THREE.Mesh(
    new RoundedBoxGeometry(0.26, 0.20, 0.20, 4, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.35, metalness: 0.4 })
  );
  camUnit.position.set(0, 1.30, 0);
  gantryArch.add(camUnit);

  const camCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.75, 1.2, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  camCone.position.set(0, 0.62, 0);
  gantryArch.add(camCone);

  const { sprite: zenithLabel, mat: zenithMat } = makeTextSprite(
    ['CAMÉRA ZÉNITHALE · 320 px'],
    { scale: 0.16, color: MIST_HEX }
  );
  zenithLabel.position.set(0, 1.72, 0);
  gantryArch.add(zenithLabel);

  //Trigger Line at 0.71 of ROI (for Chapter 3 COMPTER & Chapter 4 DÉCLENCHER)
  const triggerLineMat = new THREE.MeshBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const triggerLineMesh = new THREE.Mesh(new THREE.PlaneGeometry(BELT_W + 0.12, 0.06), triggerLineMat);
  triggerLineMesh.rotation.x = -Math.PI / 2;
  triggerLineMesh.position.set(0, BELT_Y + 0.04, TRIGGER_Z);
  conveyorGroup.add(triggerLineMesh);

  const flashPadMat = new THREE.MeshBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const flashPad = new THREE.Mesh(new THREE.PlaneGeometry(BELT_W + 0.06, 0.38), flashPadMat);
  flashPad.rotation.x = -Math.PI / 2;
  flashPad.position.set(0, BELT_Y + 0.038, TRIGGER_Z);
  conveyorGroup.add(flashPad);

  const { sprite: lineHud, mat: lineHudMat } = makeTextSprite(
    ['LIGNE DE COMPTAGE · 0.71 ROI', 'BORD AVANT · BYTETRACK'],
    { scale: 0.19 }
  );
  lineHud.position.set(0.55, BELT_Y + 0.55, TRIGGER_Z + 0.25);
  conveyorGroup.add(lineHud);

  // Live Incrementing Counter Board above the Conveyor (Chapter 3)
  const counterState = { carton: 12, polybag: 8 };
  const counterCv = document.createElement('canvas');
  counterCv.width = 640;
  counterCv.height = 160;
  const counterCtx = counterCv.getContext('2d');
  const counterTex = new THREE.CanvasTexture(counterCv);
  counterTex.colorSpace = THREE.SRGBColorSpace;
  const counterMat = new THREE.SpriteMaterial({
    map: counterTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const counterSprite = new THREE.Sprite(counterMat);
  counterSprite.scale.set(0.24 * (counterCv.width / counterCv.height), 0.24, 1);
  counterSprite.position.set(0.85, BELT_Y + 1.15, TRIGGER_Z - 0.15);
  conveyorGroup.add(counterSprite);

  function redrawCounter() {
    counterCtx.clearRect(0, 0, counterCv.width, counterCv.height);
    counterCtx.fillStyle = 'rgba(5, 7, 10, 0.90)';
    counterCtx.strokeStyle = 'rgba(163, 230, 53, 0.75)';
    counterCtx.lineWidth = 5;
    counterCtx.beginPath();
    counterCtx.roundRect(8, 8, counterCv.width - 16, counterCv.height - 16, 18);
    counterCtx.fill();
    counterCtx.stroke();

    counterCtx.font = '700 38px "JetBrains Mono", monospace';
    counterCtx.fillStyle = ACCENT_HEX;
    counterCtx.textAlign = 'center';
    counterCtx.textBaseline = 'middle';
    counterCtx.fillText(
      'CARTONS ' + counterState.carton + '  ·  POLYBAGS ' + counterState.polybag,
      counterCv.width / 2,
      counterCv.height / 2
    );
    counterTex.needsUpdate = true;
  }
  redrawCounter();

  // Flowing Parcels with Translucent Segmentation Masks & Wireframe BBoxes
  const cartonMat = new THREE.MeshStandardMaterial({ color: 0xb58957, roughness: 0.85 });
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0x7a5b33, roughness: 0.6 });
  const polybagMat = new THREE.MeshStandardMaterial({ color: 0x1d242e, roughness: 0.4, metalness: 0.2 });

  function buildParcelItem(cls, labelText, baseZ) {
    const g = new THREE.Group();
    let dims;
    if (cls === 'carton') {
      dims = [0.54, 0.35, 0.62];
      const box = new THREE.Mesh(new RoundedBoxGeometry(0.50, 0.32, 0.58, 4, 0.02), cartonMat);
      const tape = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.02, 0.11), tapeMat);
      tape.position.y = 0.165;
      box.add(tape);
      g.add(box);
    } else {
      dims = [0.52, 0.24, 0.58];
      const bag = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.20, 0.54, 4, 0.05), polybagMat);
      g.add(bag);
    }

    // Instance Segmentation Translucent Mask Shell
    const maskMat = new THREE.MeshBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const maskMesh = new THREE.Mesh(new RoundedBoxGeometry(dims[0], dims[1], dims[2], 3, 0.02), maskMat);
    g.add(maskMesh);

    // 3D Bounding Box
    const boxMat = new THREE.LineBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...dims)), boxMat);
    g.add(wire);

    const { sprite, mat: labelMat } = makeTextSprite([labelText], { scale: 0.16 });
    sprite.position.set(0, dims[1] / 2 + 0.18, 0);
    g.add(sprite);

    g.position.y = BELT_Y + dims[1] / 2 - 0.01;
    conveyorGroup.add(g);

    return {
      group: g,
      cls,
      baseZ,
      halfLen: dims[2] / 2,
      maskMat,
      boxMat,
      wire,
      labelMat,
      wasPast: false,
    };
  }

  const parcels = [
    buildParcelItem('carton', '#14 carton 0.97 [YOLO26-seg]', 0.0),
    buildParcelItem('polybag', '#11 polybag 0.95 [RF-DETR]', 2.45),
    buildParcelItem('carton', '#19 carton 0.98 [YOLO26-seg]', 4.9),
  ];

  // Industrial PLC Sorter Cabinet & UDP Datagram Pulses (Chapter 4 DÉCLENCHER)
  const plcGroup = new THREE.Group();
  plcGroup.position.set(STAGE_X + 0.85, -1.2, 0.35);
  cellGroup.add(plcGroup);

  const plcCabinet = new THREE.Mesh(
    new RoundedBoxGeometry(0.85, 1.55, 0.65, 4, 0.04),
    new THREE.MeshPhysicalMaterial({ color: 0x1a2028, metalness: 0.65, roughness: 0.38, clearcoat: 0.3 })
  );
  plcCabinet.position.y = 0.775;
  plcGroup.add(plcCabinet);

  const plcTrim = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.87, 1.57, 0.67)),
    new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.5 })
  );
  plcTrim.position.y = 0.775;
  plcGroup.add(plcTrim);

  const plcLedMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 });
  const plcLed = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), plcLedMat);
  plcLed.position.set(0, 1.32, 0.35);
  plcGroup.add(plcLed);

  const { sprite: plcHud, mat: plcHudMat } = makeTextSprite(
    ['AUTOMATE DU TRIEUR · IsiCom', 'UDP ~70 OCTETS · 78 µs MÉD'],
    { scale: 0.2 }
  );
  plcHud.position.set(0, 1.85, 0);
  plcGroup.add(plcHud);

  const { sprite: winHud, mat: winHudMat } = makeTextSprite(
    ['FENÊTRE 600–1100 ms · 1 DÉCISION / COLIS'],
    { scale: 0.17, color: MIST_HEX }
  );
  winHud.position.set(-0.3, 0.35, 0.65);
  plcGroup.add(winHud);

  const udpCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(CONV_X, BELT_Y + 0.15, TRIGGER_Z),
    new THREE.Vector3(STAGE_X + 0.15, 0.65, 0.6),
    new THREE.Vector3(STAGE_X + 0.85, 0.12, 0.35)
  );
  const udpPulses = [];
  const udpSphereGeo = new THREE.SphereGeometry(0.065, 12, 12);
  for (let i = 0; i < 3; i++) {
    const pMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 });
    const pMesh = new THREE.Mesh(udpSphereGeo, pMat);
    cellGroup.add(pMesh);
    udpPulses.push({ mesh: pMesh, mat: pMat, off: i / 3 });
  }

  /* ==========================================================
     CHAPTER 2: COMPRESSER — 3D Neural Network Pruning & Intel
     OpenVINO INT8 CPU Module (Matches Homepage Chapter 2!)
     ========================================================== */
  const ch2Group = new THREE.Group();
  ch2Group.position.set(STAGE_X, 0.1, 0);
  ch2Group.visible = false;
  scene.add(ch2Group);

  const nnGroup = new THREE.Group();
  ch2Group.add(nnGroup);

  const NN_LAYERS = [
    { x: -2.1, count: 5, r: 0.85 },
    { x: -0.85, count: 8, r: 1.35 },
    { x: 0.4, count: 8, r: 1.35 },
    { x: 1.75, count: 4, r: 0.75 },
  ];
  const nodeMat = new THREE.MeshBasicMaterial({ color: ACCENT });
  const nodeGeo = new THREE.SphereGeometry(0.065, 16, 16);
  const nodePositions = [];

  NN_LAYERS.forEach((l) => {
    for (let j = 0; j < l.count; j++) {
      const theta = (j / l.count) * Math.PI * 2;
      const y = Math.sin(theta) * l.r;
      const z = Math.cos(theta) * (l.r * 0.72);
      const m = new THREE.Mesh(nodeGeo, nodeMat);
      m.position.set(l.x, y, z);
      nnGroup.add(m);
      nodePositions.push(new THREE.Vector3(l.x, y, z));
    }
  });

  const synapsePos = [];
  let layerOffset = 0;
  for (let l = 0; l < NN_LAYERS.length - 1; l++) {
    const curCount = NN_LAYERS[l].count;
    const nextCount = NN_LAYERS[l + 1].count;
    const nextOffset = layerOffset + curCount;
    for (let c = 0; c < curCount; c++) {
      for (let n = 0; n < nextCount; n++) {
        if ((c + n) % 2 === 0 || (c * n) % 3 === 0) {
          const p1 = nodePositions[layerOffset + c];
          const p2 = nodePositions[nextOffset + n];
          synapsePos.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        }
      }
    }
    layerOffset += curCount;
  }
  const synapseGeo = new THREE.BufferGeometry();
  synapseGeo.setAttribute('position', new THREE.Float32BufferAttribute(synapsePos, 3));
  const synapseMat = new THREE.LineBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  nnGroup.add(new THREE.LineSegments(synapseGeo, synapseMat));

  // Intel OpenVINO INT8 Industrial CPU Module
  const cpuGroup = new THREE.Group();
  cpuGroup.position.set(0, -0.2, 0);
  cpuGroup.scale.setScalar(0.001);
  ch2Group.add(cpuGroup);

  const pcbBoard = new THREE.Mesh(
    new RoundedBoxGeometry(2.4, 0.12, 1.85, 4, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x071510, roughness: 0.55, metalness: 0.4 })
  );
  cpuGroup.add(pcbBoard);

  function makeCpuLidTex() {
    const s = 512;
    const cv = document.createElement('canvas');
    cv.width = s;
    cv.height = s;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#1c2128';
    ctx.fillRect(0, 0, s, s);

    ctx.fillStyle = ACCENT_HEX;
    ctx.font = '700 32px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('OPENVINO INT8 ENGINE', s / 2, 175);

    ctx.fillStyle = '#f2f4f7';
    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.fillText('NNCF QUANTIZED · VNNI', s / 2, 230);

    ctx.fillStyle = '#98a2ae';
    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillText('11 Mo → 2.8 Mo · 21–23 IM/S', s / 2, 285);

    ctx.strokeStyle = 'rgba(163, 230, 53, 0.65)';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, s - 64, s - 64);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const heatSpreader = new THREE.Mesh(
    new RoundedBoxGeometry(1.38, 0.1, 1.38, 4, 0.03),
    new THREE.MeshPhysicalMaterial({
      color: 0x222830,
      metalness: 0.85,
      roughness: 0.25,
      map: makeCpuLidTex(),
    })
  );
  heatSpreader.position.set(0, 0.09, 0);
  cpuGroup.add(heatSpreader);

  const traces = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 0.13, 1.65)),
    new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.8 })
  );
  cpuGroup.add(traces);

  const { sprite: fp32Badge, mat: fp32Mat } = makeTextSprite(
    ['FP32 BASELINE · ONNX', '11.0 Mo · CPU SITE'],
    { scale: 0.2, color: MIST_HEX }
  );
  fp32Badge.position.set(-1.25, 0.9, 0);
  nnGroup.add(fp32Badge);

  const { sprite: int8Badge, mat: int8Mat } = makeTextSprite(
    ['INT8 NNCF · OPENVINO IR', '2.8 Mo (÷4) · 21–23 IM/S', '~3× PLUS RAPIDE SUR VNNI'],
    { scale: 0.22, color: ACCENT_HEX }
  );
  int8Badge.position.set(1.25, 0.82, 0);
  cpuGroup.add(int8Badge);

  /* ==========================================================
     CAMERA RIG — Anchored on the Left (matches story-scene.js)
     ========================================================== */
  const CAMERA_KEYS = [
    { at: 0.00, pos: new THREE.Vector3(0, 0.8, 7.8),  look: new THREE.Vector3(0, 0.15, 0) },
    { at: 0.25, pos: new THREE.Vector3(0, 1.9, 7.2),  look: new THREE.Vector3(0, -0.35, 0) },
    { at: 0.46, pos: new THREE.Vector3(0, 0.9, 5.4),  look: new THREE.Vector3(0, 0.0, 0) },
    { at: 0.66, pos: new THREE.Vector3(0, 2.0, 6.8),  look: new THREE.Vector3(0, -0.30, 0.35) },
    { at: 0.92, pos: new THREE.Vector3(0, 1.75, 7.4), look: new THREE.Vector3(0, -0.25, 0.2) },
    { at: 1.00, pos: new THREE.Vector3(0, 1.85, 7.6), look: new THREE.Vector3(0, -0.25, 0.2) },
  ];
  const _camLook = new THREE.Vector3();
  const mqSm = window.matchMedia('(min-width:640px)');
  const mqMd = window.matchMedia('(min-width:768px)');

  function setCamera(p) {
    let i = 0;
    while (i < CAMERA_KEYS.length - 2 && p > CAMERA_KEYS[i + 1].at) i++;
    const kA = CAMERA_KEYS[i];
    const kB = CAMERA_KEYS[i + 1];
    const t = smoothstep(kA.at, kB.at, p);
    camera.position.lerpVectors(kA.pos, kB.pos, t);
    _camLook.lerpVectors(kA.look, kB.look, t);

    // Exact homepage split-screen camera offset:
    // Looking at x = 0.6 frames 3D models at x = -1.8 cleanly in the left half.
    const camX = mqMd.matches ? 0.6 : STAGE_X;
    camera.position.x = camX;
    _camLook.x = camX;

    camera.lookAt(_camLook);
  }

  /* ==========================================================
     CARD REVEAL ENGINE
     ========================================================== */
  const cardEls = Array.from(document.querySelectorAll('.story-card'));
  const cards = cardEls.map((el, idx) => {
    el.style.transition = 'none';
    const win = CARD_WINDOWS[idx] || CARD_WINDOWS[CARD_WINDOWS.length - 1];
    return {
      el,
      w0: win[0],
      w1: win[1],
      noLeadIn: win[0] === 0,
      noTrailOut: win[1] === 1,
      base: '',
      lastK: -1,
      live: false,
    };
  });

  function computeCardBases() {
    const wide = mqMd.matches || mqSm.matches;
    for (const c of cards) {
      const cl = c.el.classList;
      let t = '';
      if (cl.contains('-translate-x-1/2') || (wide && (cl.contains('sm:-translate-x-1/2') || cl.contains('md:-translate-x-1/2')))) {
        t += 'translateX(-50%) ';
      }
      if (cl.contains('-translate-y-1/2') || (wide && (cl.contains('sm:-translate-y-1/2') || cl.contains('md:-translate-y-1/2')))) {
        t += 'translateY(-50%) ';
      }
      c.base = t;
    }
  }
  computeCardBases();

  function updateCards(p) {
    for (const c of cards) {
      const lead = c.noLeadIn ? 1 : smoothstep(c.w0, c.w0 + CARD_FADE, p);
      const trail = c.noTrailOut ? 1 : 1 - smoothstep(c.w1 - CARD_FADE, c.w1, p);
      const k = lead * trail;
      if (k === 0 && c.lastK === 0) continue;
      c.lastK = k;
      c.el.style.opacity = k;
      c.el.style.transform = c.base + 'translateY(' + ((1 - k) * CARD_RISE) + 'px)';
      const live = k > 0.5;
      if (live !== c.live) {
        c.el.classList.toggle('is-live', live);
        c.live = live;
      }
    }
  }

  /* ==========================================================
     SCROLL MEASUREMENT & PROGRESS EASING
     ========================================================== */
  const story = document.getElementById('story');
  let storyTop = 0;
  let storyRange = 1;
  function measureStory() {
    if (!story) return;
    storyTop = story.offsetTop;
    storyRange = Math.max(1, story.offsetHeight - window.innerHeight);
  }
  measureStory();

  let pTarget = 0;
  let pCur = 0;
  function readScroll() {
    if (!story) return;
    pTarget = clamp((window.scrollY - storyTop) / storyRange, 0, 1);
  }
  readScroll();
  pCur = pTarget;

  /* ==========================================================
     UPDATE LOOP (Symmetric, 100% Reversible Scrub)
     ========================================================== */
  let flashTime = -10;
  const _pt = new THREE.Vector3();

  function update(dt) {
    readScroll();
    pCur += (pTarget - pCur) * (1 - Math.pow(0.001, dt));
    if (Math.abs(pTarget - pCur) < 0.0004) pCur = pTarget;
    const p = pCur;
    const t = performance.now() * 0.001;

    setCamera(p);
    updateCards(p);

    dustPoints.rotation.y = t * 0.018;
    dustPoints.rotation.x = t * 0.008;

    // --- CHAPTER 0: HERO (Zenithal Optics & CMOS Sensor) ---
    const ch0Alpha = 1 - smoothstep(0.13, 0.19, p);
    ch0Group.visible = ch0Alpha > 0.001;
    if (ch0Group.visible) {
      lensAssembly.rotation.y = 0.36 + p * 0.45 + Math.sin(t * 0.5) * 0.04;
      rayMat.opacity = 0.35 * ch0Alpha;
      metalBodyMat.opacity = ch0Alpha;
      knurlMat.opacity = ch0Alpha;
      glassDomeMat.opacity = 0.96 * ch0Alpha;
      textRingMat.opacity = 0.9 * ch0Alpha;
      ch0HudMat.opacity = 0.9 * ch0Alpha;
    }

    // --- CHAPTER 2: COMPRESSER (Neural Network & OpenVINO INT8 CPU) ---
    const ch2Alpha = smoothstep(0.35, 0.40, p) * (1 - smoothstep(0.53, 0.58, p));
    ch2Group.visible = ch2Alpha > 0.001;
    if (ch2Group.visible) {
      const pruneT = smoothstep(0.39, 0.49, p);
      nnGroup.scale.setScalar(Math.max(0.001, 1 - pruneT * 0.85));
      nnGroup.position.y = pruneT * -0.35;
      synapseMat.opacity = (1 - pruneT * 0.8) * 0.45 * ch2Alpha;

      const chipScale = smoothstep(0.41, 0.50, p);
      cpuGroup.scale.setScalar(Math.max(0.001, chipScale));
      cpuGroup.rotation.x = 0.52;
      cpuGroup.rotation.y = t * 0.25 + p * 1.1;

      fp32Mat.opacity = (1 - pruneT) * ch2Alpha;
      int8Mat.opacity = chipScale * ch2Alpha;
    }

    // --- SORTING LINE CELL (Active in Ch 1 [0.18..0.34] and Ch 3–4 [0.56..1.00]) ---
    const cellWin1 = smoothstep(0.14, 0.20, p) * (1 - smoothstep(0.34, 0.39, p));
    const cellWin2 = smoothstep(0.54, 0.60, p);
    const cellAlpha = Math.max(cellWin1, cellWin2);
    cellGroup.visible = cellAlpha > 0.001;

    if (cellGroup.visible) {
      const beltSpeed = 0.95;
      rollers.forEach((r) => {
        r.rotation.y = t * beltSpeed * 4;
      });

      const kLine = smoothstep(0.56, 0.62, p);
      const kPlc = smoothstep(0.78, 0.84, p);

      parcels.forEach((pItem) => {
        const curZ = ((pItem.baseZ + t * beltSpeed) % BELT_LEN) - BELT_LEN / 2;
        pItem.group.position.z = curZ;

        // Segmentation mask + BBox lock when passing under zenithal camera or trigger line
        const distCam = Math.abs(curZ - (-0.35));
        const lock = smoothstep(2.4, 0.4, distCam) * 0.7 + 0.3;
        pItem.maskMat.opacity = 0.22 * lock * cellAlpha;
        pItem.boxMat.opacity = 0.95 * lock * cellAlpha;
        pItem.labelMat.opacity = lock * cellAlpha;

        // Leading-edge crossing of 0.71 trigger line
        const past = curZ + pItem.halfLen >= TRIGGER_Z;
        if (past && !pItem.wasPast && curZ < TRIGGER_Z + 0.8) {
          if (kLine > 0.3) {
            counterState[pItem.cls] += 1;
            redrawCounter();
            flashTime = t;
          }
        }
        pItem.wasPast = past;
      });

      zenithMat.opacity = cellAlpha;

      // Chapter 3: Trigger line at 0.71 & live counter
      triggerLineMat.opacity = kLine * (0.75 + 0.25 * Math.sin(t * 4.0)) * cellAlpha;
      lineHudMat.opacity = kLine * cellAlpha;
      counterMat.opacity = kLine * (1 - kPlc * 0.4) * cellAlpha;
      const sinceFlash = t - flashTime;
      flashPadMat.opacity = kLine * Math.max(0, 1 - sinceFlash * 2.5) * 0.85 * cellAlpha;

      // Chapter 4: PLC Cabinet & UDP Pulses
      plcGroup.visible = kPlc > 0.01;
      if (plcGroup.visible) {
        plcLedMat.opacity = kPlc * (0.55 + 0.45 * Math.sin(t * 5.0));
        plcHudMat.opacity = kPlc;
        winHudMat.opacity = kPlc;
        for (const pu of udpPulses) {
          const u = (t * 0.55 + pu.off) % 1;
          udpCurve.getPoint(u, _pt);
          pu.mesh.position.copy(_pt);
          pu.mat.opacity = kPlc * Math.sin(Math.PI * u) * 0.95;
        }
      } else {
        for (const pu of udpPulses) pu.mat.opacity = 0;
      }
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
  if (window.console && console.warn) console.warn('[isidet-scene] fallback:', err);
}
