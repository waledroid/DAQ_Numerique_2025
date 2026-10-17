/* ============================================================
   EDGE VISION — Home scroll-story 3D scene (story-scene.js)
   A continuous, cinematic WebGL stage scrubbed by page scroll
   across four industrial Edge-AI chapters:
     0. VOIR        — Precision Optics & CMOS Sensor
     1. DÉTECTER    — Logistics Vision Cell (Parcels, Pallet, AGV, 3D Pose)
     2. COMPRESSER  — Neural Network Distillation & Jetson Orin INT8
     3. DÉPLOYER    — 6-Axis Industrial Robotic Arm & Actuation

   ES module — loaded via <script type="module"> with an importmap
   exposing "three" and "three/addons/". 100% procedural (no external assets).
   ============================================================ */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ---------- Brand Tokens ------------------------------------- */
const ACCENT = 0xa3e635;      // site --accent (volt-lime)
const ACCENT_HEX = '#A3E635';
const EMERALD = 0x34d399;     // emerald tint
const CYAN = 0x38bdf8;        // soft cyan for 3D pose joints
const MIST = 0xf2f4f7;        // text highlight
const FOG_COLOR = 0x050607;   // near-black lab void

// Card reveal windows across scroll progress [0, 1]
const CARD_WINDOWS = [
  [0.00, 0.22],
  [0.26, 0.48],
  [0.52, 0.74],
  [0.78, 1.00],
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

  // Reduced motion preference or no WebGL fallback
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  // Scene + Fog + Environment
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.038);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 1.8, 11);
  camera.lookAt(0, 0, 0);
  scene.add(camera);

  // Lighting
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
     CANVAS TEXTURE HELPERS (Shared across HUD & Labels)
     ========================================================== */
  function makeTextSprite(lines, opts = {}) {
    const scale = opts.scale || 0.22;
    const color = opts.color || ACCENT_HEX;
    const font = opts.font || '600 36px "JetBrains Mono", monospace';
    const bg = opts.bg || 'rgba(5, 7, 10, 0.85)';
    const border = opts.border || 'rgba(163, 230, 53, 0.5)';

    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 128 * lines.length;
    const ctx = cv.getContext('2d');

    // Rounded card background
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 4;
    const r = 16;
    ctx.beginPath();
    ctx.roundRect(8, 8, cv.width - 16, cv.height - 16, r);
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
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
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
     BACKGROUND AMBIENCE — Soft Optical Dust & Grid References
     (Clean, sparse, subtle — no radioactive swarm)
     ========================================================== */
  const DUST_COUNT = 900;
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
    opacity: 0.28,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  /* ==========================================================
     CHAPTER 0: VOIR — Industrial C-Mount Machine Vision Lens
     Angled in 3/4 perspective to frame the landing card, with
     converging optical light rays and CMOS sensor array.
     ========================================================== */
  const ch0Group = new THREE.Group();
  // Anchored in the left half of the viewport (x = -1.8)
  ch0Group.position.set(-1.8, 0.2, 0);
  scene.add(ch0Group);

  const lensAssembly = new THREE.Group();
  lensAssembly.rotation.set(0.14, 0.42, -0.02); // dynamic 3/4 machine vision perspective
  ch0Group.add(lensAssembly);

  // Materials
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
    transparent: true,
    opacity: 1,
  });

  // 1. Lens main barrel (C-mount industrial form)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.25, 1.8, 48), metalBodyMat);
  barrel.rotation.x = Math.PI / 2;
  lensAssembly.add(barrel);

  // 2. Ribbed focus & aperture knurl rings
  const focusRing = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.45, 48), knurlMat);
  focusRing.rotation.x = Math.PI / 2;
  focusRing.position.z = -0.2;
  lensAssembly.add(focusRing);

  const apertureRing = new THREE.Mesh(new THREE.CylinderGeometry(1.26, 1.26, 0.35, 48), knurlMat);
  apertureRing.rotation.x = Math.PI / 2;
  apertureRing.position.z = 0.4;
  lensAssembly.add(apertureRing);

  // Accent indicator stripes
  const focusStripe = new THREE.Mesh(new THREE.TorusGeometry(1.285, 0.015, 8, 48), accentTrimMat);
  focusStripe.position.z = -0.2;
  lensAssembly.add(focusStripe);

  // 3. Front bezel with engraved text
  function makeCh0TextRing() {
    const s = 1024;
    const cv = document.createElement('canvas');
    cv.width = s;
    cv.height = s;
    const ctx = cv.getContext('2d');
    ctx.translate(s / 2, s / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '600 36px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = 'ATANDA VISION OPTICS · 16mm F/1.4 C-MOUNT · MULTI-COATED · ';
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
    map: makeCh0TextRing(),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const textRing = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.22, 64), textRingMat);
  textRing.position.z = 0.91;
  lensAssembly.add(textRing);

  // 4. Multi-coated front glass dome
  const domeGeo = new THREE.SphereGeometry(4.2, 48, 32, 0, Math.PI * 2, 0, 0.28);
  domeGeo.translate(0, -4.2, 0);
  const frontGlass = new THREE.Mesh(domeGeo, glassDomeMat);
  frontGlass.rotation.x = Math.PI / 2;
  frontGlass.position.z = 0.9;
  lensAssembly.add(frontGlass);

  // Fresnel coating glints (cyan left, violet right, white specular core)
  const glintGeo = new THREE.PlaneGeometry(0.7, 0.45);
  const glintCyanMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    map: softGlowTexture,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glintVioletMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    map: softGlowTexture,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glintC = new THREE.Mesh(glintGeo, glintCyanMat);
  glintC.position.set(-0.35, 0.15, 0.95);
  const glintV = new THREE.Mesh(glintGeo, glintVioletMat);
  glintV.position.set(0.38, -0.15, 0.95);
  lensAssembly.add(glintC, glintV);

  // 5. Converging Optical Light Rays
  const RAY_COUNT = 18;
  const rayGeo = new THREE.BufferGeometry();
  const rayPos = [];
  for (let i = 0; i < RAY_COUNT; i++) {
    const th = (i / RAY_COUNT) * Math.PI * 2;
    const rWide = 2.4;
    // Enter wide in front, converge through front glass into focal center
    rayPos.push(Math.cos(th) * rWide, Math.sin(th) * rWide, 3.2);
    rayPos.push(Math.cos(th) * 0.95, Math.sin(th) * 0.95, 0.9);

    rayPos.push(Math.cos(th) * 0.95, Math.sin(th) * 0.95, 0.9);
    rayPos.push(0, 0, -0.2); // focal crossover point
  }
  rayGeo.setAttribute('position', new THREE.Float32BufferAttribute(rayPos, 3));
  const rayMat = new THREE.LineBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const opticalRays = new THREE.LineSegments(rayGeo, rayMat);
  lensAssembly.add(opticalRays);

  // 6. CMOS Sensor Package (Behind the lens)
  const cmosGroup = new THREE.Group();
  cmosGroup.position.z = -1.15;
  lensAssembly.add(cmosGroup);

  // Dark green substrate PCB
  const cmosPcb = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.4, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x092115, roughness: 0.5, metalness: 0.3 })
  );
  cmosGroup.add(cmosPcb);

  // Silicon die with Bayer matrix pattern
  function makeBayerTex() {
    const s = 256;
    const cv = document.createElement('canvas');
    cv.width = s;
    cv.height = s;
    const ctx = cv.getContext('2d');
    const sz = 16;
    for (let x = 0; x < s; x += sz) {
      for (let y = 0; y < s; y += sz) {
        const isR = (x / sz + y / sz) % 2 === 0;
        ctx.fillStyle = isR ? 'rgba(52, 211, 153, 0.45)' : 'rgba(163, 230, 53, 0.25)';
        ctx.fillRect(x + 1, y + 1, sz - 2, sz - 2);
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const cmosDie = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.8),
    new THREE.MeshStandardMaterial({
      color: 0x0a1510,
      roughness: 0.2,
      metalness: 0.9,
      map: makeBayerTex(),
      emissive: ACCENT,
      emissiveIntensity: 0.4,
    })
  );
  cmosDie.position.z = 0.045;
  cmosGroup.add(cmosDie);

  // 7. Floating Optics HUD Reticle
  const hudGroup = new THREE.Group();
  hudGroup.position.set(0, 0, 1.1);
  lensAssembly.add(hudGroup);

  const reticleRing = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 1.42, 64),
    new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.4, depthWrite: false })
  );
  hudGroup.add(reticleRing);

  const { sprite: ch0HudSprite, mat: ch0HudMat } = makeTextSprite(
    ['FOV 62.4° · f=16mm · F/1.4', 'EXPOSURE 1/250s · ISO 100'],
    { scale: 0.24 }
  );
  ch0HudSprite.position.set(1.4, -0.9, 0);
  ch0HudMat.opacity = 0.85;
  hudGroup.add(ch0HudSprite);

  /* ==========================================================
     CHAPTER 1: DÉTECTER — Industrial Conveyor Line & AGV Fleet
     Elevated sorting conveyor with rubber belt, steel rollers, side rails,
     down-looking inspection gantry, continuously flowing parcels (cartons &
     polybags) with YOLO11 detection bounding boxes, and an industrial
     floor plane with a large Automated Guided Vehicle (AGV) transporting cargo.
     ========================================================== */
  const ch1Group = new THREE.Group();
  ch1Group.visible = false;
  scene.add(ch1Group);

  // 1. Factory Floor Plane
  const ch1Floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshStandardMaterial({
      color: 0x080a0e,
      roughness: 0.5,
      metalness: 0.3,
    })
  );
  ch1Floor.rotation.x = -Math.PI / 2;
  ch1Floor.position.set(-1.8, -1.2, 0);
  ch1Group.add(ch1Floor);

  // Subtle coordinate grid on floor (minimal, non-distracting)
  const floorGrid = new THREE.GridHelper(10, 16, 0x1f2732, 0x10151c);
  floorGrid.position.set(-1.8, -1.19, 0);
  ch1Group.add(floorGrid);

  // AGV Floor Guide Line (dashed emerald/yellow track)
  const agvTrackGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.1, -1.18, -4.5),
    new THREE.Vector3(-1.1, -1.18, 3.5),
  ]);
  const agvTrack = new THREE.Line(
    agvTrackGeo,
    new THREE.LineDashedMaterial({
      color: ACCENT,
      dashSize: 0.3,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.6,
    })
  );
  agvTrack.computeLineDistances();
  ch1Group.add(agvTrack);

  // 2. Elevated Industrial Conveyor Line
  const CONVEYOR_X = -2.5;
  const BELT_Y = -0.45;
  const BELT_LEN = 7.5;
  const BELT_W = 0.90;

  const conveyorGroup = new THREE.Group();
  conveyorGroup.position.set(CONVEYOR_X, 0, 0);
  ch1Group.add(conveyorGroup);

  // Belt surface (dark ribbed rubber)
  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x111418,
    roughness: 0.75,
    metalness: 0.15,
  });
  const belt = new THREE.Mesh(new THREE.BoxGeometry(BELT_W, 0.06, BELT_LEN), beltMat);
  belt.position.set(0, BELT_Y, 0);
  conveyorGroup.add(belt);

  // Side guide rails (safety dark metal)
  const railMat = new THREE.MeshStandardMaterial({ color: 0x222832, roughness: 0.4, metalness: 0.7 });
  for (const rx of [-BELT_W / 2 - 0.04, BELT_W / 2 + 0.04]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, BELT_LEN), railMat);
    rail.position.set(rx, BELT_Y + 0.08, 0);
    conveyorGroup.add(rail);
  }

  // Steel Rollers under belt
  const rollerMat = new THREE.MeshStandardMaterial({ color: 0x47515c, roughness: 0.3, metalness: 0.8 });
  const rollerGeo = new THREE.CylinderGeometry(0.055, 0.055, BELT_W + 0.04, 16);
  const rollers = [];
  for (let z = -BELT_LEN / 2 + 0.4; z <= BELT_LEN / 2 - 0.4; z += 0.8) {
    const roller = new THREE.Mesh(rollerGeo, rollerMat);
    roller.rotation.z = Math.PI / 2;
    roller.position.set(0, BELT_Y - 0.06, z);
    conveyorGroup.add(roller);
    rollers.push(roller);
  }

  // Structural Support Legs to floor
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1b2028, roughness: 0.7 });
  for (const lz of [-BELT_LEN / 2 + 0.6, 0, BELT_LEN / 2 - 0.6]) {
    for (const lx of [-BELT_W / 2 + 0.08, BELT_W / 2 - 0.08]) {
      const legHeight = BELT_Y - (-1.2);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, legHeight, 0.08), legMat);
      leg.position.set(lx, -1.2 + legHeight / 2, lz);
      conveyorGroup.add(leg);
    }
  }

  // 3. Overhead Vision Inspection Gantry Arch
  const gantryArch = new THREE.Group();
  gantryArch.position.set(0, BELT_Y, -0.2); // inspection station
  conveyorGroup.add(gantryArch);

  const gantryPostGeo = new THREE.BoxGeometry(0.08, 1.4, 0.08);
  for (const gx of [-BELT_W / 2 - 0.12, BELT_W / 2 + 0.12]) {
    const p = new THREE.Mesh(gantryPostGeo, railMat);
    p.position.set(gx, 0.7, 0);
    gantryArch.add(p);
  }
  const gantryTop = new THREE.Mesh(new THREE.BoxGeometry(BELT_W + 0.32, 0.08, 0.14), railMat);
  gantryTop.position.set(0, 1.4, 0);
  gantryArch.add(gantryTop);

  // Machine Vision Camera Unit pointing straight down
  const camMat = new THREE.MeshStandardMaterial({ color: 0x0a0d10, roughness: 0.3, metalness: 0.8 });
  const camUnit = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.18), camMat);
  camUnit.position.set(0, 1.25, 0);
  gantryArch.add(camUnit);

  const camUnitLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 0.1, 16),
    new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.2, metalness: 0.9 })
  );
  camUnitLens.position.set(0, 1.15, 0);
  gantryArch.add(camUnitLens);

  // Soft Laser Inspection Scan Line across belt
  const laserBeamMat = new THREE.MeshBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const laserLine = new THREE.Mesh(new THREE.PlaneGeometry(BELT_W, 0.04), laserBeamMat);
  laserLine.rotation.x = -Math.PI / 2;
  laserLine.position.set(0, 0.035, 0);
  gantryArch.add(laserLine);

  // Machine Vision Inspection Light
  const gantryLight = new THREE.PointLight(0xf0fdf4, 3.2, 6);
  gantryLight.position.set(0, 1.1, 0);
  gantryArch.add(gantryLight);

  // 4. Moving Parcels on the Conveyor
  const cartonMat = new THREE.MeshStandardMaterial({ color: 0xb58957, roughness: 0.85 });
  const polybagMat = new THREE.MeshStandardMaterial({ color: 0x2e3846, roughness: 0.6, metalness: 0.2 });
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0x7a5b33, roughness: 0.6 });

  // Parcel A: Corrugated shipping carton
  const parcelCarton = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.36, 0.65, 4, 0.02), cartonMat);
  const tapeA = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.02, 0.12), tapeMat);
  tapeA.position.y = 0.185;
  parcelCarton.add(tapeA);

  // Parcel B: Logistics polybag
  const parcelPolybag = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.22, 0.58, 4, 0.04), polybagMat);

  // Parcel C: Compact carton
  const parcelMini = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.30, 0.44, 4, 0.02), cartonMat);
  const tapeC = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.02, 0.1), tapeMat);
  tapeC.position.y = 0.155;
  parcelMini.add(tapeC);

  const parcels = [
    { mesh: parcelCarton, baseZ: 0.0, label: 'carton 0.98 [YOLO11]', dims: [0.6, 0.42, 0.7] },
    { mesh: parcelPolybag, baseZ: 2.5, label: 'polybag 0.94 [RF-DETR]', dims: [0.52, 0.28, 0.62] },
    { mesh: parcelMini, baseZ: 5.0, label: 'colis 0.96 [60 FPS]', dims: [0.46, 0.36, 0.48] },
  ];

  parcels.forEach((p) => {
    p.mesh.position.y = BELT_Y + p.dims[1] / 2 - 0.02;
    conveyorGroup.add(p.mesh);

    // Dynamic Bounding Box
    const boxGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(...p.dims));
    const boxMat = new THREE.LineBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    p.box = new THREE.LineSegments(boxGeo, boxMat);
    p.boxMat = boxMat;
    p.mesh.add(p.box);

    const { sprite: lbl, mat: lblMat } = makeTextSprite([p.label], { scale: 0.16 });
    lbl.position.set(0, p.dims[1] / 2 + 0.16, 0);
    p.label = lbl;
    p.labelMat = lblMat;
    p.mesh.add(lbl);
  });

  // 5. BIGGER Industrial AGV on the Floor Plane
  const agvGroup = new THREE.Group();
  agvGroup.position.set(-1.1, -1.2, 0);
  ch1Group.add(agvGroup);

  const agvBodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    metalness: 0.4,
    roughness: 0.38,
    clearcoat: 0.3,
  });
  const agvBumperMat = new THREE.MeshStandardMaterial({ color: 0x12151a, roughness: 0.7 });

  // Main chassis: Big, rugged proportions
  const AGV_L = 1.95;
  const AGV_W = 1.05;
  const AGV_H = 0.44;

  const agvChassis = new THREE.Mesh(new RoundedBoxGeometry(AGV_W, AGV_H, AGV_L, 4, 0.06), agvBodyMat);
  agvChassis.position.y = AGV_H / 2 + 0.1;
  agvGroup.add(agvChassis);

  // Front & rear heavy-duty bumpers
  for (const bz of [-AGV_L / 2 + 0.06, AGV_L / 2 - 0.06]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(AGV_W + 0.04, 0.18, 0.12), agvBumperMat);
    bumper.position.set(0, 0.22, bz);
    agvGroup.add(bumper);
  }

  // 4 Large Industrial Drive Wheels
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.85 });
  const wheelHubMat = new THREE.MeshStandardMaterial({ color: 0x3d4652, roughness: 0.4, metalness: 0.7 });
  const wheelR = 0.16;
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.12, 20);
  const hubGeo = new THREE.CylinderGeometry(wheelR * 0.4, wheelR * 0.4, 0.13, 16);

  const agvWheels = [];
  for (let wx of [-AGV_W / 2 + 0.02, AGV_W / 2 - 0.02]) {
    for (let wz of [-AGV_L / 2 + 0.38, AGV_L / 2 - 0.38]) {
      const whGroup = new THREE.Group();
      whGroup.position.set(wx, wheelR, wz);

      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      whGroup.add(tire);

      const hub = new THREE.Mesh(hubGeo, wheelHubMat);
      hub.rotation.z = Math.PI / 2;
      whGroup.add(hub);

      agvGroup.add(whGroup);
      agvWheels.push(tire);
    }
  }

  // Front 270° Safety Lidar Scanner Bar (pulsing emerald)
  const lidarMat = new THREE.MeshBasicMaterial({ color: ACCENT });
  const lidarBar = new THREE.Mesh(new THREE.BoxGeometry(AGV_W * 0.75, 0.04, 0.06), lidarMat);
  lidarBar.position.set(0, 0.38, AGV_L / 2 + 0.02);
  agvGroup.add(lidarBar);

  // Top Deck Transport Cargo: Euro-pallet carrying a container
  const cargoGroup = new THREE.Group();
  cargoGroup.position.set(0, AGV_H + 0.12, 0);
  agvGroup.add(cargoGroup);

  const cargoPallet = new THREE.Mesh(
    new THREE.BoxGeometry(AGV_W * 0.85, 0.08, AGV_L * 0.75),
    new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.8 })
  );
  cargoPallet.position.y = 0.04;
  cargoGroup.add(cargoPallet);

  const cargoBox = new THREE.Mesh(
    new RoundedBoxGeometry(AGV_W * 0.75, 0.48, AGV_L * 0.65, 4, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x22303c, roughness: 0.5, metalness: 0.4 })
  );
  cargoBox.position.y = 0.32;
  cargoGroup.add(cargoBox);

  // Safety amber rotating beacon on cargo top
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12), beaconMat);
  beacon.position.set(0, 0.60, 0);
  cargoGroup.add(beacon);

  // Helper factory for BBoxes
  function makeBBox(dims, labelText, targetGroup) {
    const boxGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(...dims));
    const boxMat = new THREE.LineBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const box = new THREE.LineSegments(boxGeo, boxMat);
    targetGroup.add(box);

    const { sprite: label, mat: labelMat } = makeTextSprite([labelText], { scale: 0.16 });
    label.position.set(0, dims[1] / 2 + 0.14, 0);
    targetGroup.add(label);

    return { box, boxMat, label, labelMat };
  }

  const { box: agvBox, boxMat: agvBoxMat, label: agvLabel, labelMat: agvLabelMat } = makeBBox(
    [AGV_W + 0.15, AGV_H + 0.75, AGV_L + 0.15],
    'AGV FLEET 0.95 [60 FPS]',
    agvGroup
  );
  agvBox.position.y = (AGV_H + 0.75) / 2;
  agvLabel.position.y = AGV_H + 0.85;

  /* ==========================================================
     CHAPTER 2: COMPRESSER — 3D Neural Network & Jetson Silicon
     Deep network undergoing synaptic pruning, then condensing into
     an authentic NVIDIA Jetson Orin SoC compute module.
     ========================================================== */
  const ch2Group = new THREE.Group();
  // Anchored on the left side (x = -1.8)
  ch2Group.position.set(-1.8, 0.1, 0);
  ch2Group.visible = false;
  scene.add(ch2Group);

  // 1. 3D Neural Network Graph
  const nnGroup = new THREE.Group();
  ch2Group.add(nnGroup);

  const NN_LAYERS = [
    { x: -2.2, count: 5, r: 0.9 }, // Input feature maps
    { x: -0.9, count: 8, r: 1.4 }, // Conv block 1
    { x: 0.4, count: 8, r: 1.4 },  // Attention / Distillation bottleneck
    { x: 1.8, count: 4, r: 0.8 },  // Detection heads
  ];

  const nodeMat = new THREE.MeshBasicMaterial({ color: ACCENT });
  const nodeGeo = new THREE.SphereGeometry(0.065, 16, 16);
  const nodes = [];
  const nodePositions = [];

  NN_LAYERS.forEach((l) => {
    for (let j = 0; j < l.count; j++) {
      const theta = (j / l.count) * Math.PI * 2;
      const y = Math.sin(theta) * l.r + (Math.random() - 0.5) * 0.2;
      const z = Math.cos(theta) * (l.r * 0.75);
      const m = new THREE.Mesh(nodeGeo, nodeMat);
      m.position.set(l.x, y, z);
      nnGroup.add(m);
      nodes.push(m);
      nodePositions.push(new THREE.Vector3(l.x, y, z));
    }
  });

  // Synaptic connections between adjacent layers
  const synapsePos = [];
  let layerOffset = 0;
  for (let l = 0; l < NN_LAYERS.length - 1; l++) {
    const curCount = NN_LAYERS[l].count;
    const nextCount = NN_LAYERS[l + 1].count;
    const nextOffset = layerOffset + curCount;

    for (let c = 0; c < curCount; c++) {
      for (let n = 0; n < nextCount; n++) {
        // Drop some connections for sparsity
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
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const synapses = new THREE.LineSegments(synapseGeo, synapseMat);
  nnGroup.add(synapses);

  // 2. NVIDIA Jetson Orin SoC Compute Module
  const jetsonGroup = new THREE.Group();
  jetsonGroup.position.set(0, -0.2, 0);
  jetsonGroup.scale.setScalar(0.001); // scales in as NN condenses
  ch2Group.add(jetsonGroup);

  // PCB Board (Dark matte finish with gold pins)
  const pcbMat = new THREE.MeshStandardMaterial({ color: 0x071510, roughness: 0.6, metalness: 0.4 });
  const pcbBoard = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.12, 1.8, 4, 0.04), pcbMat);
  jetsonGroup.add(pcbBoard);

  // Gold PCIe Edge Connector Pins
  const goldPinMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
  const pins = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.04, 0.16), goldPinMat);
  pins.position.set(0, -0.04, 0.88);
  jetsonGroup.add(pins);

  // Central Laser-Etched Metallic Heat Spreader
  function makeJetsonHeatSpreaderTex() {
    const s = 512;
    const cv = document.createElement('canvas');
    cv.width = s;
    cv.height = s;
    const ctx = cv.getContext('2d');

    // Brushed metal tone
    ctx.fillStyle = '#1c2128';
    ctx.fillRect(0, 0, s, s);

    // Laser-etched text
    ctx.fillStyle = '#a3e635';
    ctx.font = '700 32px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NVIDIA JETSON ORIN', s / 2, 180);

    ctx.fillStyle = '#f2f4f7';
    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.fillText('INT8 TENSORRT ENGINE', s / 2, 230);

    ctx.fillStyle = '#98a2ae';
    ctx.font = '400 18px "JetBrains Mono", monospace';
    ctx.fillText('QUANTIZED QDQ · 60 FPS', s / 2, 280);

    // Circuit border lines
    ctx.strokeStyle = 'rgba(163, 230, 53, 0.6)';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, s - 64, s - 64);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const heatSpreaderMat = new THREE.MeshPhysicalMaterial({
    color: 0x222830,
    metalness: 0.85,
    roughness: 0.25,
    map: makeJetsonHeatSpreaderTex(),
  });
  const heatSpreader = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.1, 1.3, 4, 0.03), heatSpreaderMat);
  heatSpreader.position.set(0, 0.09, -0.05);
  jetsonGroup.add(heatSpreader);

  // Glowing circuit traces on PCB
  const traceGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 0.13, 1.6));
  const traceMat = new THREE.LineBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });
  const traces = new THREE.LineSegments(traceGeo, traceMat);
  jetsonGroup.add(traces);

  // Floating Benchmark Badges
  const { sprite: fp32Badge, mat: fp32Mat } = makeTextSprite(
    ['FP32 BASELINE', '48.2 MB · 28.4 ms'],
    { scale: 0.2, color: '#f2f4f7' }
  );
  fp32Badge.position.set(-1.4, 0.9, 0);
  nnGroup.add(fp32Badge);

  const { sprite: int8Badge, mat: int8Mat } = makeTextSprite(
    ['INT8 QUANTIZED', '7.1 MB · 6.2 ms', '−40% LATENCY · 4.2× FPS'],
    { scale: 0.22, color: ACCENT_HEX }
  );
  int8Badge.position.set(1.4, 0.8, 0);
  jetsonGroup.add(int8Badge);

  /* ==========================================================
     CHAPTER 3: DÉPLOYER — 6-Axis Robotic Arm & Actuation
     FANUC-style industrial manipulator with dual-camera stereo head,
     safety workcell floor grid, and interactive cursor tracking.
     Positioned on the center-right to perfectly balance the left card.
     ========================================================== */
  const ARM_BASE_X = -1.8;
  const ARM_BASE_Z = -0.4;
  const ARM_BASE_Y = -1.2;

  const ch3Group = new THREE.Group();
  ch3Group.visible = false;
  scene.add(ch3Group);

  // Industrial Workcell Floor Grid with Safety Boundary
  const robotFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.8, metalness: 0.2 })
  );
  robotFloor.rotation.x = -Math.PI / 2;
  robotFloor.position.set(ARM_BASE_X, ARM_BASE_Y, ARM_BASE_Z);
  ch3Group.add(robotFloor);

  const cellGrid = new THREE.GridHelper(12, 24, ACCENT, 0x181e26);
  cellGrid.position.set(ARM_BASE_X, ARM_BASE_Y + 0.01, ARM_BASE_Z);
  cellGrid.material.transparent = true;
  cellGrid.material.opacity = 0.5;
  ch3Group.add(cellGrid);

  // Yellow Safety Perimeter Line
  const safetyGeo = new THREE.BufferGeometry();
  const sPts = [
    -3.2, 0.02, -3.2,  3.2, 0.02, -3.2,
     3.2, 0.02, -3.2,  3.2, 0.02,  3.2,
     3.2, 0.02,  3.2, -3.2, 0.02,  3.2,
    -3.2, 0.02,  3.2, -3.2, 0.02, -3.2,
  ];
  safetyGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPts, 3));
  const safetyLine = new THREE.LineSegments(
    safetyGeo,
    new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.7 })
  );
  safetyLine.position.set(ARM_BASE_X, ARM_BASE_Y, ARM_BASE_Z);
  ch3Group.add(safetyLine);

  // Robotic Arm Hierarchy
  const armGroup = new THREE.Group();
  armGroup.position.set(ARM_BASE_X, ARM_BASE_Y, ARM_BASE_Z);
  armGroup.scale.setScalar(0.56);
  ch3Group.add(armGroup);

  const armYellowMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    metalness: 0.35,
    roughness: 0.42,
    clearcoat: 0.3,
  });
  const armJointMat = new THREE.MeshPhysicalMaterial({
    color: 0x14161a,
    metalness: 0.7,
    roughness: 0.35,
  });
  const armIrisMat = new THREE.MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: 0, // wakes up on scroll
  });

  // Base Pedestal
  const baseFlange = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.45, 0.16, 36), armJointMat);
  baseFlange.position.y = 0.08;
  armGroup.add(baseFlange);

  // J1 Turret
  const j1Turret = new THREE.Group();
  j1Turret.position.y = 0.2;
  armGroup.add(j1Turret);

  const turretMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.5, 36), armYellowMat);
  turretMesh.position.y = 0.25;
  j1Turret.add(turretMesh);

  // J2 Shoulder
  const j2Shoulder = new THREE.Group();
  j2Shoulder.position.y = 0.55;
  j1Turret.add(j2Shoulder);

  const shoulderBox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.65), armYellowMat);
  j2Shoulder.add(shoulderBox);

  const shoulderCap = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 32), armJointMat);
  shoulderCap.rotation.z = Math.PI / 2;
  shoulderCap.position.set(0.46, 0, 0);
  j2Shoulder.add(shoulderCap);

  // Upper Arm (Bicep)
  const UPPER_LEN = 1.9;
  const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.48, UPPER_LEN, 0.34), armYellowMat);
  upperArm.position.set(0.08, UPPER_LEN / 2, 0);
  j2Shoulder.add(upperArm);

  // J3 Elbow
  const j3Elbow = new THREE.Group();
  j3Elbow.position.y = UPPER_LEN;
  j2Shoulder.add(j3Elbow);

  const elbowMotor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.5), armJointMat);
  elbowMotor.position.set(0, 0, -0.18);
  j3Elbow.add(elbowMotor);

  // Forearm
  const FORE_LEN = 1.6;
  const foreArm = new THREE.Mesh(new THREE.BoxGeometry(0.38, FORE_LEN, 0.28), armYellowMat);
  foreArm.position.y = FORE_LEN / 2;
  j3Elbow.add(foreArm);

  // J4 / J5 Wrist
  const wrist = new THREE.Group();
  wrist.position.y = FORE_LEN;
  j3Elbow.add(wrist);

  const wristJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 24), armJointMat);
  wrist.add(wristJoint);

  // End-Effector: Stereo Machine Vision Camera Head
  const stereoHead = new THREE.Group();
  stereoHead.position.y = 0.22;
  wrist.add(stereoHead);

  const headHousing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.26, 0.38), armJointMat);
  headHousing.position.y = 0.16;
  stereoHead.add(headHousing);

  // Dual camera barrels
  function makeStereoEye(x) {
    const eyeBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.25, 24), armJointMat);
    eyeBarrel.position.set(x, 0.35, 0);
    stereoHead.add(eyeBarrel);

    const eyeIris = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16), armIrisMat);
    eyeIris.position.set(x, 0.48, 0);
    stereoHead.add(eyeIris);
  }
  makeStereoEye(-0.22);
  makeStereoEye(0.22);

  // Laser Crosshair Target Reticle
  const reticleGeo = new THREE.BufferGeometry();
  const rz = 0.4;
  const reticlePts = [
    -rz, 0, 0,  rz, 0, 0,
     0, -rz, 0,  0, rz, 0,
  ];
  reticleGeo.setAttribute('position', new THREE.Float32BufferAttribute(reticlePts, 3));
  const laserCrosshair = new THREE.LineSegments(
    reticleGeo,
    new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  );
  ch3Group.add(laserCrosshair);

  // Cursor Tracking Raycaster & Targets
  const pointer = { x: 0, y: 0 };
  let lastMoveTime = performance.now() - 5000;
  const aimTarget = new THREE.Vector3(0, 1.2, 2.0);
  const aimPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.0);
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function onPointerMove(e) {
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    lastMoveTime = performance.now();
  }
  window.addEventListener('mousemove', onPointerMove, { passive: true });

  const armPose = { yaw: 0, shoulder: 0.3, elbow: -0.65, wrist: 0.85 };

  /* ==========================================================
     CAMERA RIG — 5 Keyframes across Scroll Progress
     Continuous, buttery smooth dolly & pan between chapters.
     ========================================================== */
  const CAMERA_KEYS = [
    { at: 0.00, pos: new THREE.Vector3(0, 0.8, 8.2),       look: new THREE.Vector3(0, 0.15, 0) },
    { at: 0.25, pos: new THREE.Vector3(0, 0.6, 5.6),       look: new THREE.Vector3(0, 0.15, 0) },
    { at: 0.50, pos: new THREE.Vector3(0, 2.1, 7.4),       look: new THREE.Vector3(0, -0.35, 0.1) },
    { at: 0.75, pos: new THREE.Vector3(0, 0.9, 5.2),       look: new THREE.Vector3(0, 0.0, 0) },
    { at: 1.00, pos: new THREE.Vector3(0, 1.1, 7.6),       look: new THREE.Vector3(0, 0.3, -0.3) },
  ];
  const _camLook = new THREE.Vector3();

  function setCamera(p) {
    let i = 0;
    while (i < CAMERA_KEYS.length - 2 && p > CAMERA_KEYS[i + 1].at) i++;
    const kA = CAMERA_KEYS[i];
    const kB = CAMERA_KEYS[i + 1];
    const t = smoothstep(kA.at, kB.at, p);
    camera.position.lerpVectors(kA.pos, kB.pos, t);
    _camLook.lerpVectors(kA.look, kB.look, t);

    // On desktop, looking at x = 0.6 frames the 3D models (anchored at x = -1.8)
    // cleanly in the left half (~23% screen width), leaving the right half open for the text cards.
    const camX = mqMd.matches ? 0.6 : -1.8;
    camera.position.x = camX;
    _camLook.x = camX;

    camera.lookAt(_camLook);
  }

  /* ==========================================================
     CARD REVEAL ENGINE — Frame-Rate Independent Scrub
     ========================================================== */
  const mqSm = window.matchMedia('(min-width:640px)');
  const mqMd = window.matchMedia('(min-width:768px)');
  const cardEls = Array.from(document.querySelectorAll('.story-card'));
  const cards = cardEls.map((el, idx) => {
    el.style.transition = 'none';
    const win = CARD_WINDOWS[idx] || [0.8, 1.0];
    return { el, w0: win[0], w1: win[1], noLead: win[0] === 0, base: '', lastK: -1 };
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
      const lead = c.noLead ? 1 : smoothstep(c.w0, c.w0 + CARD_FADE, p);
      const tail = 1 - smoothstep(c.w1 - CARD_FADE, c.w1, p);
      const k = lead * tail;

      if (k === 0 && c.lastK === 0) continue;
      c.lastK = k;

      c.el.style.opacity = k;
      c.el.style.transform = c.base + 'translateY(' + ((1 - k) * CARD_RISE) + 'px)';
      c.el.classList.toggle('is-live', k > 0.5);
    }
  }

  /* ==========================================================
     SCROLL MEASUREMENT & PROGRESS EASING
     ========================================================== */
  const storySection = document.getElementById('story');
  let storyTop = 0;
  let storyRange = 1;
  function measureStory() {
    if (!storySection) return;
    storyTop = storySection.offsetTop;
    storyRange = Math.max(1, storySection.offsetHeight - window.innerHeight);
  }
  measureStory();

  let pTarget = 0;
  let pCur = 0;
  function readScroll() {
    if (!storySection) return;
    pTarget = clamp((window.scrollY - storyTop) / storyRange, 0, 1);
  }
  readScroll();
  pCur = pTarget;

  /* ==========================================================
     UPDATE LOOP (Symmetric, 100% Reversible Scrub)
     ========================================================== */
  function update(dt) {
    readScroll();
    // Smooth frame-rate-independent ease
    pCur += (pTarget - pCur) * (1 - Math.pow(0.001, dt));
    const p = pCur;
    const t = performance.now() * 0.001;

    setCamera(p);
    updateCards(p);

    // Ambient dust gentle drift
    dustPoints.rotation.y = t * 0.02;
    dustPoints.rotation.x = t * 0.01;

    // --- CHAPTER 0: VOIR (Optics & Rays) ---
    const ch0Fade = 1 - smoothstep(0.20, 0.28, p);
    ch0Group.visible = ch0Fade > 0.001;
    if (ch0Group.visible) {
      lensAssembly.rotation.y = -0.45 + p * 0.4;
      lensAssembly.rotation.z = Math.sin(t * 0.5) * 0.02;
      rayMat.opacity = 0.35 * ch0Fade;
      metalBodyMat.opacity = ch0Fade;
      knurlMat.opacity = ch0Fade;
      glassDomeMat.opacity = 0.96 * ch0Fade;
      textRingMat.opacity = 0.9 * ch0Fade;
      ch0HudMat.opacity = 0.85 * ch0Fade;
    }

    // --- CHAPTER 1: DÉTECTER (Logistics Vision Cell) ---
    const ch1In = smoothstep(0.22, 0.28, p);
    const ch1Out = 1 - smoothstep(0.48, 0.54, p);
    const ch1Alpha = ch1In * ch1Out;
    ch1Group.visible = ch1Alpha > 0.001;

    if (ch1Group.visible) {
      const beltSpeed = 0.9;

      // Animate conveyor rollers spinning
      rollers.forEach((r) => {
        r.rotation.y = t * beltSpeed * 4;
      });

      // Animate parcels along conveyor belt & dynamic vision detection
      const span = BELT_LEN;
      parcels.forEach((pItem) => {
        // Continuous travel along belt
        const curZ = ((pItem.baseZ + t * beltSpeed) % span) - span / 2;
        pItem.mesh.position.z = curZ;

        // Vision inspection station is at z = -0.2
        const distToCam = Math.abs(curZ - (-0.2));
        const lock = smoothstep(1.3, 0.3, distToCam);
        pItem.boxMat.opacity = lock * 0.95 * ch1Alpha;
        pItem.labelMat.opacity = lock * ch1Alpha;

        // Bounding box scale pop when passing under the inspection camera
        const pop = Math.exp(-Math.pow(distToCam / 0.4, 2)) * 0.12;
        pItem.box.scale.setScalar(1 + pop);
      });

      // Machine vision laser scan line pulse
      laserBeamMat.opacity = (0.7 + Math.sin(t * 7) * 0.25) * ch1Alpha;

      // Smooth AGV movement along floor guide track (z: -2.0 to 1.6)
      const agvZ = -0.3 + Math.sin(t * 0.6) * 1.8;
      agvGroup.position.z = agvZ;
      agvGroup.position.x = -1.1;

      // Rotate 4 AGV wheels in sync with floor movement (no-slip)
      const wheelRot = agvZ / wheelR;
      agvWheels.forEach((w) => {
        w.rotation.x = wheelRot;
      });

      // AGV Bounding Box & Lidar HUD
      agvBoxMat.opacity = 0.85 * ch1Alpha;
      agvLabelMat.opacity = ch1Alpha;
      lidarBar.scale.x = 1.0 + Math.sin(t * 5) * 0.06;
    }

    // --- CHAPTER 2: COMPRESSER (Neural Network & Jetson Silicon) ---
    const ch2In = smoothstep(0.48, 0.54, p);
    const ch2Out = 1 - smoothstep(0.72, 0.78, p);
    const ch2Alpha = ch2In * ch2Out;
    ch2Group.visible = ch2Alpha > 0.001;

    if (ch2Group.visible) {
      // Pruning progress: as scroll deepens, connections thin out
      const pruneT = smoothstep(0.54, 0.68, p);

      // Neural Network collapses down while Jetson module blooms
      nnGroup.scale.setScalar(Math.max(0.001, 1 - pruneT * 0.85));
      nnGroup.position.y = pruneT * -0.4;
      synapseMat.opacity = (1 - pruneT * 0.8) * 0.45 * ch2Alpha;

      // Jetson Orin SoC blooms and glows (tilted forward to view laser-etched markings)
      const chipScale = smoothstep(0.58, 0.68, p);
      jetsonGroup.scale.setScalar(chipScale * 1.0);
      jetsonGroup.rotation.x = 0.52;
      jetsonGroup.rotation.y = t * 0.25 + p * 1.2;

      fp32Mat.opacity = (1 - pruneT) * ch2Alpha;
      int8Mat.opacity = chipScale * ch2Alpha;
    }

    // --- CHAPTER 3: DÉPLOYER (6-Axis Robotic Arm & Interactive Tracking) ---
    const ch3Alpha = smoothstep(0.74, 0.82, p);
    ch3Group.visible = ch3Alpha > 0.001;

    if (ch3Group.visible) {
      // Robot arm rises up onto the workcell floor
      armGroup.position.y = ARM_BASE_Y + (1 - ch3Alpha) * -2.0;

      // Stereo camera iris wakes up (emissive glow)
      const wake = smoothstep(0.82, 0.92, p);
      armIrisMat.emissiveIntensity = wake * (1.2 + Math.sin(t * 3.5) * 0.25);

      // Interactive Cursor Tracking: calculate target point in 3D
      const isIdle = performance.now() - lastMoveTime > 1600;
      if (isIdle) {
        aimTarget.set(
          ARM_BASE_X + Math.sin(t * 0.8) * 1.5,
          0.8 + Math.sin(t * 1.4) * 0.5,
          1.8 + Math.cos(t * 0.8) * 0.6
        );
      } else {
        ndc.set(pointer.x, -pointer.y);
        raycaster.setFromCamera(ndc, camera);
        if (!raycaster.ray.intersectPlane(aimPlane, aimTarget)) {
          aimTarget.set(ARM_BASE_X, 1.2, 2.0);
        }
        aimTarget.x = clamp(aimTarget.x, -3.8, 0.6);
        aimTarget.y = clamp(aimTarget.y, -0.6, 2.8);
      }

      laserCrosshair.position.copy(aimTarget);

      // Inverse Kinematics Pitch/Yaw Solve for 6-Axis Arm
      const dx = aimTarget.x - ARM_BASE_X;
      const dz = aimTarget.z - ARM_BASE_Z;
      const targetYaw = Math.atan2(dx, dz);
      const targetH = clamp((aimTarget.y - ARM_BASE_Y) / 3.0, 0, 1);

      const targetShoulder = 0.5 - targetH * 0.4;
      const targetElbow = -0.9 + targetH * 0.5;

      const easeK = 1 - Math.pow(0.001, dt);
      armPose.yaw += (targetYaw - armPose.yaw) * easeK;
      armPose.shoulder += (targetShoulder - armPose.shoulder) * easeK;
      armPose.elbow += (targetElbow - armPose.elbow) * easeK;

      j1Turret.rotation.y = armPose.yaw;
      j2Shoulder.rotation.x = armPose.shoulder;
      j3Elbow.rotation.x = armPose.elbow;

      // Wrist points stereo camera head directly at aimTarget
      const headPitch = clamp(0.9 - (armPose.shoulder + armPose.elbow), -0.4, 1.8);
      armPose.wrist += (headPitch - armPose.wrist) * easeK;
      wrist.rotation.x = armPose.wrist;
    }
  }

  function render() {
    renderer.render(scene, camera);
  }

  /* ---- Animation Loop --------------------------------------- */
  const clock = new THREE.Clock();
  let isTabVisible = true;

  function loop() {
    requestAnimationFrame(loop);
    if (!isTabVisible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt);
    render();
  }

  /* ---- Resize & Breakpoints --------------------------------- */
  function onResize() {
    width = container.clientWidth || window.innerWidth || 1;
    height = container.clientHeight || window.innerHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    measureStory();
    computeCardBases();
  }

  let resizeObserver = null;
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);
  } else {
    window.addEventListener('resize', onResize, { passive: true });
  }

  /* ---- Intersection Observer (Pause off-screen) ------------- */
  const stickyHost = document.querySelector('.story-sticky') || container;
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        isTabVisible = entries[0].isIntersecting;
        if (isTabVisible) clock.getDelta();
      },
      { threshold: 0.0 }
    );
    io.observe(stickyHost);
  }

  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
    if (isTabVisible) clock.getDelta();
  });

  loop();
}

function boot() {
  try {
    init();
  } catch (err) {
    document.body.classList.add('story-static');
    if (window.console && console.warn) {
      console.warn('[story-scene] disabled:', err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
