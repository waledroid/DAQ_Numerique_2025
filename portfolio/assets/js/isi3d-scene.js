/* ============================================================
   EDGE VISION — ISI Monitor 3D immersive case study (isi3d-scene.js)
   A continuous, cinematic WebGL stage scrubbed by page scroll
   following the exact split-screen architecture & visual language
   of story-scene.js (3D anchored on the left at x = -1.8, cards on
   the right, reversible video-scrub feel):
     0. HERO        — Dual-Camera Stereo Rig & Metric Digital Twin Core
     1. CALIBRER    — Precision ChArUco & AprilGrid Calibration Stage (Z = 0)
     2. DÉTECTER    — Logistics Conveyor, Pallet, Carton, Polybag & 3×3 Rack
     3. TRIANGULER  — DLT SVD Stereo Rays, Metric Zones & 3D Pallet Trajectory
     4. PUBLIER     — High-Fidelity Industrial AGV Fleet & UDP/MQTT Telemetry
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

  // Helper: Reusable Industrial Camera Head Builder
  function buildCameraUnit(labelStr) {
    const unit = new THREE.Group();
    const housing = new THREE.Mesh(
      new RoundedBoxGeometry(0.42, 0.28, 0.54, 4, 0.03),
      new THREE.MeshPhysicalMaterial({ color: 0x161b22, metalness: 0.8, roughness: 0.3, clearcoat: 0.3 })
    );
    unit.add(housing);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.13, 0.22, 24),
      new THREE.MeshPhysicalMaterial({ color: 0x0b0d11, metalness: 0.9, roughness: 0.25 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.34;
    unit.add(barrel);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.125, 0.012, 8, 24),
      new THREE.MeshBasicMaterial({ color: ACCENT })
    );
    ring.position.z = 0.42;
    unit.add(ring);

    const { sprite, mat } = makeTextSprite([labelStr], { scale: 0.16, color: MIST_HEX });
    sprite.position.set(0, 0.34, 0);
    unit.add(sprite);
    return { unit, labelMat: mat };
  }

  // Helper: Reusable Euro-Pallet + Load Builder
  function buildEuroPallet() {
    const g = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.82 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.85), woodMat);
    base.position.y = 0.06;
    g.add(base);

    const boxMat = new THREE.MeshStandardMaterial({ color: 0xb58957, roughness: 0.8 });
    const cargo = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.48, 0.72, 4, 0.02), boxMat);
    cargo.position.y = 0.36;
    g.add(cargo);

    const strapMat = new THREE.MeshStandardMaterial({ color: 0x1b222c, roughness: 0.5 });
    for (const sx of [-0.28, 0.28]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.50, 0.74), strapMat);
      strap.position.set(sx, 0.36, 0);
      g.add(strap);
    }
    return g;
  }

  /* ==========================================================
     CHAPTER 0: HERO — Dual-Camera Stereo Rig & Digital Twin Core
     Anchored at x = -1.8 to match homepage Chapter 0 framing.
     ========================================================== */
  const STAGE_X = -1.8;
  const ch0Group = new THREE.Group();
  ch0Group.position.set(STAGE_X, 0.1, 0);
  scene.add(ch0Group);

  const twinCore = new THREE.Group();
  twinCore.rotation.set(0.12, 0.35, 0);
  ch0Group.add(twinCore);

  // Holographic Isometric Digital Twin Platform
  const platMesh = new THREE.Mesh(
    new RoundedBoxGeometry(3.6, 0.14, 2.8, 4, 0.04),
    new THREE.MeshPhysicalMaterial({ color: 0x0b0e13, metalness: 0.7, roughness: 0.35, clearcoat: 0.4 })
  );
  platMesh.position.y = -0.95;
  twinCore.add(platMesh);

  const platGrid = new THREE.GridHelper(3.4, 12, ACCENT, 0x1e2631);
  platGrid.position.y = -0.87;
  twinCore.add(platGrid);

  // 3D Metric Origin Triad (X / Y / Z = 0) at center of twin platform
  const originGroup = new THREE.Group();
  originGroup.position.set(0, -0.85, 0);
  twinCore.add(originGroup);

  const axisGeoX = new THREE.CylinderGeometry(0.02, 0.02, 0.9, 12);
  const xAxis = new THREE.Mesh(axisGeoX, new THREE.MeshBasicMaterial({ color: ACCENT }));
  xAxis.rotation.z = -Math.PI / 2;
  xAxis.position.x = 0.45;
  originGroup.add(xAxis);

  const yAxis = new THREE.Mesh(axisGeoX, new THREE.MeshBasicMaterial({ color: CYAN }));
  yAxis.position.y = 0.45;
  originGroup.add(yAxis);

  const zAxis = new THREE.Mesh(axisGeoX, new THREE.MeshBasicMaterial({ color: EMERALD }));
  zAxis.rotation.x = Math.PI / 2;
  zAxis.position.z = 0.45;
  originGroup.add(zAxis);

  const originSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  originGroup.add(originSphere);

  // Miniature Digital-Twin Racks & Pallet on the Holographic Slab
  const miniPallet = buildEuroPallet();
  miniPallet.scale.setScalar(0.65);
  miniPallet.position.set(-0.6, -0.87, 0.3);
  twinCore.add(miniPallet);

  const miniPalletBox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.82, 0.48, 0.65)),
    new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.85 })
  );
  miniPalletBox.position.set(-0.6, -0.63, 0.3);
  twinCore.add(miniPalletBox);

  // Twin Calibrated RTSP Cameras mounted above the Digital Twin Slab
  const ch0CamA = buildCameraUnit('cam_a · RTSP SYNC');
  ch0CamA.unit.position.set(-1.35, 1.05, 0.9);
  ch0CamA.unit.lookAt(0, -0.7, 0);
  twinCore.add(ch0CamA.unit);

  const ch0CamB = buildCameraUnit('cam_b · RTSP SYNC');
  ch0CamB.unit.position.set(1.35, 1.05, 0.9);
  ch0CamB.unit.lookAt(0, -0.7, 0);
  twinCore.add(ch0CamB.unit);

  // Converging Stereo Frustum Rays from both cameras to the platform
  const stereoRayPts = [
    -1.35, 1.05, 0.9,  -0.6, -0.63, 0.3,
    -1.35, 1.05, 0.9,   0.0, -0.85, 0.0,
    -1.35, 1.05, 0.9,  -1.2, -0.85, -0.6,
     1.35, 1.05, 0.9,  -0.6, -0.63, 0.3,
     1.35, 1.05, 0.9,   0.0, -0.85, 0.0,
     1.35, 1.05, 0.9,   1.2, -0.85, -0.6,
  ];
  const stereoRayGeo = new THREE.BufferGeometry();
  stereoRayGeo.setAttribute('position', new THREE.Float32BufferAttribute(stereoRayPts, 3));
  const stereoRayMat = new THREE.LineBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
  });
  twinCore.add(new THREE.LineSegments(stereoRayGeo, stereoRayMat));

  const { sprite: ch0Hud, mat: ch0HudMat } = makeTextSprite(
    ['JUMEAU NUMÉRIQUE 3D · 2 CAMÉRAS', 'REPÈRE MÉTRIQUE Z = 0 · 40.3 ms'],
    { scale: 0.22 }
  );
  ch0Hud.position.set(0.2, -1.35, 0.9);
  twinCore.add(ch0Hud);

  /* ==========================================================
     CHAPTER 1: CALIBRER — ChArUco & AprilGrid Calibration Stage
     Anchored at x = -1.8. High-detail fiducial board, stereo
     cameras, frustum pyramids & sub-pixel residual HUD.
     ========================================================== */
  const ch1Group = new THREE.Group();
  ch1Group.position.set(STAGE_X, -0.1, 0);
  ch1Group.visible = false;
  scene.add(ch1Group);

  function makeCharucoTex() {
    const cv = document.createElement('canvas');
    cv.width = 560;
    cv.height = 400;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#e8e6df';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const cols = 7;
    const rows = 5;
    const s = 80;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dark = (r + c) % 2 === 0;
        ctx.fillStyle = dark ? '#101317' : '#e8e6df';
        ctx.fillRect(c * s, r * s, s, s);
        if (!dark) {
          ctx.fillStyle = '#101317';
          const m = 14;
          ctx.fillRect(c * s + m, r * s + m, s - 2 * m, s - 2 * m);
          ctx.fillStyle = '#e8e6df';
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              if ((i + j + r + c) % 2) {
                ctx.fillRect(c * s + m + 8 + i * 14, r * s + m + 8 + j * 14, 11, 11);
              }
            }
          }
        }
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Calibration Floor Slab (Z = 0)
  const calFloor = new THREE.Mesh(
    new RoundedBoxGeometry(4.4, 0.1, 3.4, 4, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x090c10, roughness: 0.7, metalness: 0.2 })
  );
  calFloor.position.y = -1.05;
  ch1Group.add(calFloor);

  const calGrid = new THREE.GridHelper(4.2, 14, ACCENT, 0x19202a);
  calGrid.position.y = -0.99;
  ch1Group.add(calGrid);

  // ChArUco Board tilted slightly for clear 3/4 visibility
  const boardGroup = new THREE.Group();
  boardGroup.position.set(0, -0.82, 0.1);
  boardGroup.rotation.x = 0.25;
  ch1Group.add(boardGroup);

  const boardPlate = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 0.06, 1.68),
    new THREE.MeshStandardMaterial({ color: 0x1e242d, roughness: 0.5, metalness: 0.5 })
  );
  boardGroup.add(boardPlate);

  const charucoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.56),
    new THREE.MeshStandardMaterial({ map: makeCharucoTex(), roughness: 0.6 })
  );
  charucoMesh.rotation.x = -Math.PI / 2;
  charucoMesh.position.y = 0.035;
  boardGroup.add(charucoMesh);

  // Glowing Detected Saddle Points on the ChArUco Board
  const cornerPts = [];
  for (let r = -1.5; r <= 1.5; r += 1) {
    for (let c = -2.5; c <= 2.5; c += 1) {
      cornerPts.push(c * 0.31, 0.05, r * 0.31);
    }
  }
  const cornerGeo = new THREE.BufferGeometry();
  cornerGeo.setAttribute('position', new THREE.Float32BufferAttribute(cornerPts, 3));
  const cornerPoints = new THREE.Points(
    cornerGeo,
    new THREE.PointsMaterial({
      map: softGlowTexture,
      color: ACCENT,
      size: 0.16,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  boardGroup.add(cornerPoints);

  // Two Calibrated Cameras projecting frustums onto the ChArUco board
  const calCamA = buildCameraUnit('cam_a · K, D, R, t');
  calCamA.unit.position.set(-1.55, 1.25, 0.6);
  calCamA.unit.lookAt(0, -0.82, 0.1);
  ch1Group.add(calCamA.unit);

  const calCamB = buildCameraUnit('cam_b · K, D, R, t');
  calCamB.unit.position.set(1.55, 1.25, 0.6);
  calCamB.unit.lookAt(0, -0.82, 0.1);
  ch1Group.add(calCamB.unit);

  const calFrustumPts = [
    -1.55, 1.25, 0.6,  -1.1, -0.65, -0.6,
    -1.55, 1.25, 0.6,   1.1, -0.65, -0.6,
    -1.55, 1.25, 0.6,   1.1, -0.95,  0.85,
    -1.55, 1.25, 0.6,  -1.1, -0.95,  0.85,
     1.55, 1.25, 0.6,  -1.1, -0.65, -0.6,
     1.55, 1.25, 0.6,   1.1, -0.65, -0.6,
     1.55, 1.25, 0.6,   1.1, -0.95,  0.85,
     1.55, 1.25, 0.6,  -1.1, -0.95,  0.85,
  ];
  const calFrustumGeo = new THREE.BufferGeometry();
  calFrustumGeo.setAttribute('position', new THREE.Float32BufferAttribute(calFrustumPts, 3));
  const calFrustumMat = new THREE.LineBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
  });
  ch1Group.add(new THREE.LineSegments(calFrustumGeo, calFrustumMat));

  const { sprite: resHud, mat: resHudMat } = makeTextSprite(
    ['isiCal · CHARUCO + APRILGRID', 'RÉSIDU 1.176 px · SOL Z = 0'],
    { scale: 0.22 }
  );
  resHud.position.set(0, 0.15, 1.15);
  ch1Group.add(resHud);

  /* ==========================================================
     CHAPTER 2: DÉTECTER — Conveyor, Pallet, Carton, Polybag & 3×3 Rack
     Matches the homepage Chapter 1 layout & scale at x = -1.8.
     ========================================================== */
  const ch2Group = new THREE.Group();
  ch2Group.visible = false;
  scene.add(ch2Group);

  const ch2Floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0x080a0e, roughness: 0.55, metalness: 0.25 })
  );
  ch2Floor.rotation.x = -Math.PI / 2;
  ch2Floor.position.set(STAGE_X, -1.2, 0);
  ch2Group.add(ch2Floor);

  const ch2Grid = new THREE.GridHelper(9, 14, 0x1f2732, 0x10151c);
  ch2Grid.position.set(STAGE_X, -1.19, 0);
  ch2Group.add(ch2Grid);

  // 1. Elevated Conveyor on Left Side of Cell (x = -2.65)
  const BELT_Y = -0.48;
  const BELT_LEN = 6.6;
  const BELT_W = 0.85;
  const convGroup = new THREE.Group();
  convGroup.position.set(STAGE_X - 0.85, 0, 0);
  ch2Group.add(convGroup);

  const beltMesh = new THREE.Mesh(
    new THREE.BoxGeometry(BELT_W, 0.06, BELT_LEN),
    new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.75, metalness: 0.15 })
  );
  beltMesh.position.y = BELT_Y;
  convGroup.add(beltMesh);

  const railMat = new THREE.MeshStandardMaterial({ color: 0x222832, roughness: 0.4, metalness: 0.7 });
  for (const rx of [-BELT_W / 2 - 0.04, BELT_W / 2 + 0.04]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.13, BELT_LEN), railMat);
    rail.position.set(rx, BELT_Y + 0.07, 0);
    convGroup.add(rail);
  }

  const rollerMat = new THREE.MeshStandardMaterial({ color: 0x47515c, roughness: 0.3, metalness: 0.8 });
  const rollerGeo = new THREE.CylinderGeometry(0.05, 0.05, BELT_W + 0.04, 14);
  const ch2Rollers = [];
  for (let z = -BELT_LEN / 2 + 0.4; z <= BELT_LEN / 2 - 0.4; z += 0.8) {
    const r = new THREE.Mesh(rollerGeo, rollerMat);
    r.rotation.z = Math.PI / 2;
    r.position.set(0, BELT_Y - 0.06, z);
    convGroup.add(r);
    ch2Rollers.push(r);
  }

  // Flowing Carton & Polybag on the Conveyor
  const cartonMat = new THREE.MeshStandardMaterial({ color: 0xb58957, roughness: 0.85 });
  const polybagMat = new THREE.MeshStandardMaterial({ color: 0x1e2530, roughness: 0.45, metalness: 0.2 });

  const meshCarton = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.34, 0.60, 4, 0.02), cartonMat);
  const meshPoly = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.20, 0.56, 4, 0.04), polybagMat);

  const ch2Parcels = [
    { mesh: meshCarton, baseZ: 0.0, label: 'carton 0.97 [YOLO26-seg]', dims: [0.58, 0.40, 0.66] },
    { mesh: meshPoly, baseZ: 3.3, label: 'polybag 0.95 [RF-DETR]', dims: [0.54, 0.26, 0.62] },
  ];
  ch2Parcels.forEach((pItem) => {
    pItem.mesh.position.y = BELT_Y + pItem.dims[1] / 2 - 0.01;
    convGroup.add(pItem.mesh);

    const bGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(...pItem.dims));
    const bMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.9 });
    pItem.box = new THREE.LineSegments(bGeo, bMat);
    pItem.boxMat = bMat;
    pItem.mesh.add(pItem.box);

    const { sprite, mat } = makeTextSprite([pItem.label], { scale: 0.16 });
    sprite.position.set(0, pItem.dims[1] / 2 + 0.18, 0);
    pItem.labelMat = mat;
    pItem.mesh.add(sprite);
  });

  // 2. Floor Euro-Pallet with 3D Detection Box (x = -1.05, z = 0.6)
  const ch2PalletGroup = new THREE.Group();
  ch2PalletGroup.position.set(STAGE_X + 0.75, -1.2, 0.6);
  ch2Group.add(ch2PalletGroup);
  ch2PalletGroup.add(buildEuroPallet());

  const palBoxMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.9 });
  const palBox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.2, 0.68, 0.95)),
    palBoxMat
  );
  palBox.position.y = 0.34;
  ch2PalletGroup.add(palBox);

  const { sprite: palHud, mat: palHudMat } = makeTextSprite(['palette 0.98 · mAP 0.977'], { scale: 0.17 });
  palHud.position.set(0, 0.85, 0);
  ch2PalletGroup.add(palHud);

  // 3. 3×3 Smart Rack (Étagère eta_1 · vide / plein with 15-vote live flip)
  const etagere = new THREE.Group();
  etagere.position.set(STAGE_X + 0.75, -1.2, -1.4);
  etagere.rotation.y = -0.25;
  ch2Group.add(etagere);

  const rackPostMat = new THREE.MeshStandardMaterial({ color: 0x262e38, roughness: 0.7 });
  const rackPostGeo = new THREE.BoxGeometry(0.07, 2.0, 0.07);
  for (const ex of [-0.85, 0.85]) {
    for (const ez of [-0.28, 0.28]) {
      const post = new THREE.Mesh(rackPostGeo, rackPostMat);
      post.position.set(ex, 1.0, ez);
      etagere.add(post);
    }
  }
  const CELL_X = [-0.52, 0, 0.52];
  const CELL_Y = [0.42, 0.98, 1.54];
  for (const cy of CELL_Y) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.04, 0.6), rackPostMat);
    shelf.position.set(0, cy - 0.25, 0);
    etagere.add(shelf);
  }
  const CELL_FILLED = [1, 0, 1, 1, 1, 0, 0, 1, 0];
  const etaCells = [];
  const etaBoxGeo = new RoundedBoxGeometry(0.36, 0.32, 0.36, 2, 0.02);
  const etaBinMat = new THREE.MeshStandardMaterial({ color: 0x3b4654, roughness: 0.75 });
  const cellFillGeo = new THREE.PlaneGeometry(0.44, 0.44);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const cx = CELL_X[c];
      const cyy = CELL_Y[r];
      const box = new THREE.Mesh(etaBoxGeo, etaBinMat);
      box.position.set(cx, cyy - 0.06, 0);
      etagere.add(box);

      const fillMat = new THREE.MeshBasicMaterial({
        color: ACCENT,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const fill = new THREE.Mesh(cellFillGeo, fillMat);
      fill.position.set(cx, cyy, 0.31);
      etagere.add(fill);
      etaCells.push({ idx, box, fillMat, filled: CELL_FILLED[idx] === 1 });
    }
  }
  const { sprite: etaHud, mat: etaHudMat } = makeTextSprite(['eta_1 · 3×3 · VIDE / PLEIN'], { scale: 0.16 });
  etaHud.position.set(0, 2.2, 0);
  etagere.add(etaHud);

  /* ==========================================================
     CHAPTER 3: TRIANGULER & SUIVRE — Metric Zones, DLT SVD Rays
     & Tracked Pallet Trajectory anchored at x = -1.8.
     ========================================================== */
  const ch3Group = new THREE.Group();
  ch3Group.position.set(STAGE_X, -0.1, 0);
  ch3Group.visible = false;
  scene.add(ch3Group);

  const ch3Floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.7, metalness: 0.2 })
  );
  ch3Floor.rotation.x = -Math.PI / 2;
  ch3Floor.position.y = -1.1;
  ch3Group.add(ch3Floor);

  const ch3Grid = new THREE.GridHelper(8, 16, ACCENT, 0x161c24);
  ch3Grid.position.y = -1.09;
  ch3Grid.material.transparent = true;
  ch3Grid.material.opacity = 0.45;
  ch3Group.add(ch3Grid);

  function buildMetricZone(x, z, w, d, title) {
    const pts = [
      new THREE.Vector3(x - w / 2, -1.07, z - d / 2),
      new THREE.Vector3(x + w / 2, -1.07, z - d / 2),
      new THREE.Vector3(x + w / 2, -1.07, z + d / 2),
      new THREE.Vector3(x - w / 2, -1.07, z + d / 2),
      new THREE.Vector3(x - w / 2, -1.07, z - d / 2),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: ACCENT,
      dashSize: 0.2,
      gapSize: 0.12,
      transparent: true,
      opacity: 0.85,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    ch3Group.add(line);

    const { sprite, mat: lMat } = makeTextSprite([title], { scale: 0.15, color: MIST_HEX });
    sprite.position.set(x, -0.85, z + d / 2 + 0.15);
    ch3Group.add(sprite);
    return { mat, lMat };
  }
  const zoneA = buildMetricZone(-1.05, 0.35, 1.75, 1.5, 'ZONE 1 · STOCK');
  const zoneB = buildMetricZone(1.05, -0.25, 1.75, 1.5, 'ZONE 2 · TRANSIT');

  // Stereo cameras on top left/right of Chapter 3 stage
  const triCamA = buildCameraUnit('cam_a · DLT SVD');
  triCamA.unit.position.set(-1.7, 1.45, -1.1);
  triCamA.unit.lookAt(0, -0.8, 0);
  ch3Group.add(triCamA.unit);

  const triCamB = buildCameraUnit('cam_b · DLT SVD');
  triCamB.unit.position.set(1.7, 1.45, -1.1);
  triCamB.unit.lookAt(0, -0.8, 0);
  ch3Group.add(triCamB.unit);

  // Metric Trajectory Curve & Moving Tracked Pallet
  const trackCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.25, -1.08, 0.65),
    new THREE.Vector3(-0.35, -1.08, 0.25),
    new THREE.Vector3(0.45, -1.08, -0.10),
    new THREE.Vector3(1.15, -1.08, -0.35),
  ]);
  const curvePts = trackCurve.getPoints(60);
  const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePts);
  const curveLine = new THREE.Line(
    curveGeo,
    new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.75 })
  );
  ch3Group.add(curveLine);

  const trackedPallet = new THREE.Group();
  const palMesh = buildEuroPallet();
  palMesh.scale.setScalar(0.8);
  trackedPallet.add(palMesh);

  const trBox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.96, 0.56, 0.76)),
    new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.95 })
  );
  trBox.position.y = 0.28;
  trackedPallet.add(trBox);

  const { sprite: trHud, mat: trHudMat } = makeTextSprite(
    ['Track3D #7 · ByteTrack', 'X 2.62 m · Y 0.31 m · Z 0.00 m'],
    { scale: 0.2 }
  );
  trHud.position.set(0, 0.92, 0);
  trackedPallet.add(trHud);
  ch3Group.add(trackedPallet);

  // Dynamic DLT Triangulation Rays from triCamA & triCamB to trackedPallet
  const dltRayGeo = new THREE.BufferGeometry();
  dltRayGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
  const dltRayMat = new THREE.LineBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });
  const dltRays = new THREE.LineSegments(dltRayGeo, dltRayMat);
  ch3Group.add(dltRays);

  const triApex = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 16),
    new THREE.MeshBasicMaterial({ color: ACCENT })
  );
  ch3Group.add(triApex);

  /* ==========================================================
     CHAPTER 4: PUBLIER — High-Fidelity Industrial AGV Fleet
     & isiComms UDP/MQTT Gateway Pylon anchored at x = -1.8.
     ========================================================== */
  const ch4Group = new THREE.Group();
  ch4Group.position.set(STAGE_X, -0.1, 0);
  ch4Group.visible = false;
  scene.add(ch4Group);

  const ch4Floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.6, metalness: 0.25 })
  );
  ch4Floor.rotation.x = -Math.PI / 2;
  ch4Floor.position.y = -1.1;
  ch4Group.add(ch4Floor);

  const ch4Grid = new THREE.GridHelper(8, 16, 0x1f2732, 0x10151c);
  ch4Grid.position.y = -1.09;
  ch4Group.add(ch4Grid);

  // Dashed AGV Guide Track
  const agvLaneGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.4, -1.07, -3.2),
    new THREE.Vector3(-0.4, -1.07, 2.8),
  ]);
  const agvLane = new THREE.Line(
    agvLaneGeo,
    new THREE.LineDashedMaterial({ color: ACCENT, dashSize: 0.25, gapSize: 0.15, transparent: true, opacity: 0.75 })
  );
  agvLane.computeLineDistances();
  ch4Group.add(agvLane);

  // High-Fidelity Industrial AGV
  const agvGroup = new THREE.Group();
  agvGroup.position.set(-0.4, -1.1, 0);
  ch4Group.add(agvGroup);

  const AGV_L = 1.95;
  const AGV_W = 1.08;
  const AGV_H = 0.42;

  const agvBodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    metalness: 0.4,
    roughness: 0.36,
    clearcoat: 0.35,
  });
  const agvChassis = new THREE.Mesh(new RoundedBoxGeometry(AGV_W, AGV_H, AGV_L, 4, 0.06), agvBodyMat);
  agvChassis.position.y = AGV_H / 2 + 0.1;
  agvGroup.add(agvChassis);

  const agvBumperMat = new THREE.MeshStandardMaterial({ color: 0x12151a, roughness: 0.7 });
  for (const bz of [-AGV_L / 2 + 0.06, AGV_L / 2 - 0.06]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(AGV_W + 0.04, 0.16, 0.12), agvBumperMat);
    bumper.position.set(0, 0.20, bz);
    agvGroup.add(bumper);
  }

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.85 });
  const wheelHubMat = new THREE.MeshStandardMaterial({ color: 0x3d4652, roughness: 0.4, metalness: 0.7 });
  const wheelR = 0.16;
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.12, 20);
  const hubGeo = new THREE.CylinderGeometry(wheelR * 0.4, wheelR * 0.4, 0.13, 16);
  const agvWheels = [];
  for (const wx of [-AGV_W / 2 + 0.02, AGV_W / 2 - 0.02]) {
    for (const wz of [-AGV_L / 2 + 0.38, AGV_L / 2 - 0.38]) {
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

  const agvLidar = new THREE.Mesh(
    new THREE.BoxGeometry(AGV_W * 0.75, 0.04, 0.06),
    new THREE.MeshBasicMaterial({ color: ACCENT })
  );
  agvLidar.position.set(0, 0.36, AGV_L / 2 + 0.02);
  agvGroup.add(agvLidar);

  const agvCargo = new THREE.Group();
  agvCargo.position.set(0, AGV_H + 0.12, 0);
  agvGroup.add(agvCargo);

  const agvPallet = new THREE.Mesh(
    new THREE.BoxGeometry(AGV_W * 0.85, 0.08, AGV_L * 0.75),
    new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.8 })
  );
  agvPallet.position.y = 0.04;
  agvCargo.add(agvPallet);

  const agvContainer = new THREE.Mesh(
    new RoundedBoxGeometry(AGV_W * 0.75, 0.46, AGV_L * 0.65, 4, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x22303c, roughness: 0.5, metalness: 0.4 })
  );
  agvContainer.position.y = 0.31;
  agvCargo.add(agvContainer);

  const agvBeacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12),
    new THREE.MeshBasicMaterial({ color: 0xffaa00 })
  );
  agvBeacon.position.set(0, 0.58, 0);
  agvCargo.add(agvBeacon);

  const agvBBox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(AGV_W + 0.14, AGV_H + 0.74, AGV_L + 0.14)),
    new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.85 })
  );
  agvBBox.position.y = (AGV_H + 0.74) / 2;
  agvGroup.add(agvBBox);

  const { sprite: agvHud, mat: agvHudMat } = makeTextSprite(
    ['AGV FLEET #4 · UDP / MQTT', 'MÉDIANE 40.3 ms · QoS 1'],
    { scale: 0.2 }
  );
  agvHud.position.set(0, AGV_H + 0.95, 0);
  agvGroup.add(agvHud);

  // isiComms Gateway Pylon & Streaming UDP/MQTT Pulses
  const gateway = new THREE.Group();
  gateway.position.set(1.25, -1.1, -0.9);
  ch4Group.add(gateway);

  const gwPylon = new THREE.Mesh(
    new RoundedBoxGeometry(0.28, 2.1, 0.28, 4, 0.03),
    new THREE.MeshPhysicalMaterial({ color: 0x1c222b, metalness: 0.7, roughness: 0.35 })
  );
  gwPylon.position.y = 1.05;
  gateway.add(gwPylon);

  const gwBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 16),
    new THREE.MeshBasicMaterial({ color: ACCENT })
  );
  gwBeacon.position.y = 2.2;
  gateway.add(gwBeacon);

  const { sprite: gwHud, mat: gwHudMat } = makeTextSprite(
    ['isiComms · BROKER MQTT / UDP'],
    { scale: 0.17, color: MIST_HEX }
  );
  gwHud.position.set(0, 2.55, 0);
  gateway.add(gwHud);

  const pulseArc = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(1.25, 1.1, -0.9),
    new THREE.Vector3(0.4, 1.65, -0.3),
    new THREE.Vector3(-0.4, 0.1, 0.0)
  );
  const pulses = [];
  const pulseGeo = new THREE.SphereGeometry(0.065, 12, 12);
  for (let i = 0; i < 4; i++) {
    const pMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.9 });
    const pMesh = new THREE.Mesh(pulseGeo, pMat);
    ch4Group.add(pMesh);
    pulses.push({ mesh: pMesh, off: i / 4 });
  }

  /* ==========================================================
     CAMERA RIG — Anchored on the Left (matches story-scene.js)
     ========================================================== */
  const CAMERA_KEYS = [
    { at: 0.00, pos: new THREE.Vector3(0, 0.85, 7.6), look: new THREE.Vector3(0, -0.05, 0) },
    { at: 0.25, pos: new THREE.Vector3(0, 0.95, 6.8), look: new THREE.Vector3(0, -0.15, 0) },
    { at: 0.45, pos: new THREE.Vector3(0, 1.65, 7.4), look: new THREE.Vector3(0, -0.35, 0) },
    { at: 0.66, pos: new THREE.Vector3(0, 1.85, 6.9), look: new THREE.Vector3(0, -0.35, 0) },
    { at: 0.92, pos: new THREE.Vector3(0, 1.25, 7.2), look: new THREE.Vector3(0, -0.15, 0) },
    { at: 1.00, pos: new THREE.Vector3(0, 1.35, 7.5), look: new THREE.Vector3(0, -0.15, 0) },
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

    // --- CHAPTER 0: HERO (Dual-Camera Digital Twin Core) ---
    const ch0Alpha = 1 - smoothstep(0.13, 0.19, p);
    ch0Group.visible = ch0Alpha > 0.001;
    if (ch0Group.visible) {
      twinCore.rotation.y = 0.32 + Math.sin(t * 0.45) * 0.08 + p * 0.4;
      ch0CamA.labelMat.opacity = ch0Alpha;
      ch0CamB.labelMat.opacity = ch0Alpha;
      ch0HudMat.opacity = ch0Alpha;
      stereoRayMat.opacity = (0.45 + 0.15 * Math.sin(t * 3.0)) * ch0Alpha;
    }

    // --- CHAPTER 1: CALIBRER (ChArUco & AprilGrid Stage) ---
    const ch1Alpha = smoothstep(0.14, 0.20, p) * (1 - smoothstep(0.33, 0.39, p));
    ch1Group.visible = ch1Alpha > 0.001;
    if (ch1Group.visible) {
      boardGroup.rotation.y = Math.sin(t * 0.5) * 0.08;
      calCamA.labelMat.opacity = ch1Alpha;
      calCamB.labelMat.opacity = ch1Alpha;
      resHudMat.opacity = ch1Alpha;
      calFrustumMat.opacity = (0.4 + 0.15 * Math.sin(t * 2.6)) * ch1Alpha;
    }

    // --- CHAPTER 2: DÉTECTER (Conveyor, Pallet & 3×3 Rack) ---
    const ch2Alpha = smoothstep(0.34, 0.40, p) * (1 - smoothstep(0.53, 0.59, p));
    ch2Group.visible = ch2Alpha > 0.001;
    if (ch2Group.visible) {
      const beltSpeed = 0.85;
      ch2Rollers.forEach((r) => {
        r.rotation.y = t * beltSpeed * 4;
      });
      ch2Parcels.forEach((pItem) => {
        const curZ = ((pItem.baseZ + t * beltSpeed) % BELT_LEN) - BELT_LEN / 2;
        pItem.mesh.position.z = curZ;
        const lock = smoothstep(2.2, 0.5, Math.abs(curZ));
        pItem.boxMat.opacity = lock * 0.95 * ch2Alpha;
        pItem.labelMat.opacity = lock * ch2Alpha;
      });
      palHudMat.opacity = ch2Alpha;
      etaHudMat.opacity = ch2Alpha;

      // 3×3 Rack center cell live flip (15-vote stabilizer)
      const flipPeriod = 4.5;
      const centreFilled = Math.floor(t / flipPeriod) % 2 === 0;
      for (const cell of etaCells) {
        const isFull = cell.idx === 4 ? centreFilled : cell.filled;
        cell.box.visible = isFull;
        cell.fillMat.opacity = (isFull ? 0.32 : 0.06) * ch2Alpha;
      }
    }

    // --- CHAPTER 3: TRIANGULER & SUIVRE (DLT Rays & Metric Track) ---
    const ch3Alpha = smoothstep(0.54, 0.60, p) * (1 - smoothstep(0.75, 0.81, p));
    ch3Group.visible = ch3Alpha > 0.001;
    if (ch3Group.visible) {
      const trackU = clamp(
        smoothstep(0.56, 0.76, p) * 0.75 + (0.5 + 0.5 * Math.sin(t * 0.8)) * 0.25,
        0,
        1
      );
      trackCurve.getPointAt(trackU, _pt);
      trackedPallet.position.copy(_pt);

      // Update DLT Triangulation Rays from both cameras to pallet top center
      const posAttr = dltRayGeo.getAttribute('position');
      const tx = _pt.x;
      const ty = _pt.y + 0.45;
      const tz = _pt.z;
      posAttr.setXYZ(0, -1.7, 1.45, -1.1);
      posAttr.setXYZ(1, tx, ty, tz);
      posAttr.setXYZ(2, 1.7, 1.45, -1.1);
      posAttr.setXYZ(3, tx, ty, tz);
      posAttr.needsUpdate = true;

      triApex.position.set(tx, ty, tz);
      triCamA.labelMat.opacity = ch3Alpha;
      triCamB.labelMat.opacity = ch3Alpha;
      trHudMat.opacity = ch3Alpha;
      zoneA.lMat.opacity = ch3Alpha;
      zoneB.lMat.opacity = ch3Alpha;
    }

    // --- CHAPTER 4: PUBLIER (Industrial AGV & UDP/MQTT Telemetry) ---
    const ch4Alpha = smoothstep(0.76, 0.83, p);
    ch4Group.visible = ch4Alpha > 0.001;
    if (ch4Group.visible) {
      const agvZ = -0.2 + Math.sin(t * 0.65) * 1.45;
      agvGroup.position.z = agvZ;
      const wheelRot = agvZ / wheelR;
      agvWheels.forEach((w) => {
        w.rotation.x = wheelRot;
      });
      agvLidar.scale.x = 1.0 + Math.sin(t * 6) * 0.07;
      agvHudMat.opacity = ch4Alpha;
      gwHudMat.opacity = ch4Alpha;

      // Update pulse arc endpoint to follow AGV antenna
      pulseArc.v2.set(-0.4, 0.1, agvZ);
      for (const pu of pulses) {
        const u = (t * 0.45 + pu.off) % 1;
        pulseArc.getPoint(u, _pt);
        pu.mesh.position.copy(_pt);
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
  if (window.console && console.warn) console.warn('[isi3d-scene] fallback:', err);
}
