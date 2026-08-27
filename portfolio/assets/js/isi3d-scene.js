/* ============================================================
   LIQUID OPTICS — ISI Monitor 3D immersive case study (isi3d-scene.js)
   A sticky WebGL stage scrubbed by page scroll: the warehouse
   digital twin rebuilds itself chapter by chapter, mirroring the
   real pipeline — CALIBRER · DÉTECTER · TRIANGULER & SUIVRE ·
   PUBLIER. Everything is procedural (no client footage): floor
   grid, racks, two calibrated cameras, ChArUco board, detection
   boxes, metric zones, a tracked pallet and UDP/MQTT pulses.

   Same architecture as story-scene.js:
   - NO GSAP. Scroll progress comes from window.scrollY, eased per
     frame into pCur; every visual is a pure function of pCur (+ a
     clock for ambient motion), so the scrub is fully reversible.
   - Robust boot: reduced-motion / WebGL-fail → body.story-static
     (site.css stacks the cards, hides the canvas). DPR ≤ 2,
     ResizeObserver, IntersectionObserver + visibilitychange pause.
   ============================================================ */

import * as THREE from 'three';

/* ---------- Tokens ------------------------------------------- */
const ACCENT = 0xa3e635;         // site --accent
const ACCENT_CSS = '#A3E635';
const MIST_CSS = '#F2F4F7';
const FOG_COLOR = 0x050607;

/* Card reveal windows over scroll progress (disjoint). */
const CARD_WINDOWS = [
  [0.00, 0.14],
  [0.18, 0.34],
  [0.38, 0.54],
  [0.58, 0.76],
  [0.82, 1.00],
];
const CARD_FADE = 0.04;
const CARD_RISE = 24;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
function smoothstep(e0, e1, x) {
  if (e0 === e1) return x < e0 ? 0 : 1;
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function init() {
  const container = document.getElementById('story-canvas');
  if (!container) return;
  const body = document.body;

  const reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) { body.classList.add('story-static'); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) { body.classList.add('story-static'); return; }
  if (!renderer || !renderer.getContext()) { body.classList.add('story-static'); return; }

  let width = container.clientWidth || window.innerWidth || 1;
  let height = container.clientHeight || window.innerHeight || 1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.042);

  const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 120);
  camera.position.set(0, 3.4, 12);
  camera.lookAt(0, 0.6, 0);

  scene.add(new THREE.AmbientLight(0x2a323a, 1.8));
  const key = new THREE.DirectionalLight(0xcfe8df, 1.5);
  key.position.set(6, 10, 7);
  scene.add(key);
  const rim = new THREE.PointLight(ACCENT, 0.9, 40);
  rim.position.set(-6, 4, 6);
  scene.add(rim);

  /* ==========================================================
     FLOOR — dark slab + metric grid (the digital-twin look).
     ========================================================== */
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(34, 48),
    new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 0.95, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new THREE.GridHelper(44, 30, 0x2b3238, 0x1b2025);
  grid.position.y = 0.012;
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  scene.add(grid);

  // Sparse dust points for depth.
  const DUST_N = 700;
  const dustArr = new Float32Array(DUST_N * 3);
  for (let i = 0; i < DUST_N; i++) {
    dustArr[i * 3] = (Math.random() - 0.5) * 34;
    dustArr[i * 3 + 1] = Math.random() * 7;
    dustArr[i * 3 + 2] = (Math.random() - 0.5) * 26;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustArr, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: ACCENT, size: 0.035, transparent: true, opacity: 0.35,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  scene.add(dust);

  /* ==========================================================
     RACKS — background context (dark, generic).
     ========================================================== */
  const rackGroup = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0x232930, roughness: 0.8 });
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x2d343c, roughness: 0.8 });
  const binMat = new THREE.MeshStandardMaterial({ color: 0x3b434c, roughness: 0.9 });
  const postGeo = new THREE.BoxGeometry(0.1, 3.4, 0.1);
  const beamGeo = new THREE.BoxGeometry(3.4, 0.08, 0.9);
  const binGeo = new THREE.BoxGeometry(0.7, 0.5, 0.7);
  for (let b = -1; b <= 1; b++) {
    const bay = new THREE.Group();
    for (const sx of [-1.7, 1.7]) for (const sz of [-0.45, 0.45]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(sx, 1.7, sz);
      bay.add(post);
    }
    for (const y of [1.1, 2.2]) {
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, y, 0);
      bay.add(beam);
      for (let i = -1; i <= 1; i++) {
        if (Math.abs(b + i) === 2) continue; // leave a few cells empty
        const bin = new THREE.Mesh(binGeo, binMat);
        bin.position.set(i * 1.05, y + 0.3, 0);
        bay.add(bin);
      }
    }
    bay.position.set(b * 4.2, 0, -7.5);
    rackGroup.add(bay);
  }
  scene.add(rackGroup);

  /* ==========================================================
     LABEL SPRITES — crisp mono canvas labels (one texture each).
     ========================================================== */
  const labelMats = []; // all label materials, so chapters can gate opacity
  function makeLabel(text, color, h) {
    const SS = 2;
    const font = '500 ' + 46 * SS + 'px "JetBrains Mono", monospace';
    const cv = document.createElement('canvas');
    let ctx = cv.getContext('2d');
    ctx.font = font;
    const tw = Math.ceil(ctx.measureText(text).width);
    cv.width = tw + 26 * SS;
    cv.height = Math.ceil(70 * SS);
    ctx = cv.getContext('2d');
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(6,8,9,0.72)';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = color || ACCENT_CSS;
    ctx.fillText(text, cv.width / 2, cv.height / 2);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    // depthTest off: labels are HUD annotations — never occluded by geometry.
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    const hh = h || 0.18;
    sprite.scale.set(hh * (cv.width / cv.height), hh, 1);
    labelMats.push(mat);
    return { sprite, mat };
  }

  /* ==========================================================
     CAMERAS — two calibrated RGB cameras on poles + frustums.
     ========================================================== */
  const camsGroup = new THREE.Group();
  const frustumMats = [];
  const coneMats = []; // soft "coverage light" cones, one per camera
  const rayMats = [];
  const camHeads = []; // world-positioned heads, ray origins

  function makeCam(x, name) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 4.4, 10),
      new THREE.MeshStandardMaterial({ color: 0x272d34, roughness: 0.7 })
    );
    pole.position.set(0, 2.2, 0);
    g.add(pole);

    const head = new THREE.Group();
    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.24, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.45, metalness: 0.25 })
    );
    head.add(bodyMesh);
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: 0x0c0e10, roughness: 0.3, metalness: 0.6 })
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0, 0.2);
    head.add(lens);
    head.position.set(0, 4.35, 0);
    g.add(head);

    // Frustum wireframe: apex at the lens, opening toward the floor centre.
    const D = 4.6, HW = 1.35, HH = 1.0;
    const apex = [0, 0, 0.28];
    const c1 = [-HW, -HH, D], c2 = [HW, -HH, D], c3 = [HW, HH, D], c4 = [-HW, HH, D];
    const fr = [];
    for (const c of [c1, c2, c3, c4]) fr.push(...apex, ...c);
    fr.push(...c1, ...c2, ...c2, ...c3, ...c3, ...c4, ...c4, ...c1);
    const frGeo = new THREE.BufferGeometry();
    frGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(fr), 3));
    const frMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 });
    frustumMats.push(frMat);
    head.add(new THREE.LineSegments(frGeo, frMat));

    // Coverage light: a soft volumetric cone from the lens to the floor.
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 5.0, 26, 1, true),
      new THREE.MeshBasicMaterial({
        color: ACCENT, transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    cone.rotation.x = -Math.PI / 2; // apex toward the lens, opening along +z (view dir)
    cone.position.z = 0.3 + 2.5;
    head.add(cone);
    coneMats.push(cone.material);

    const lab = makeLabel(name, MIST_CSS, 0.16);
    lab.sprite.position.set(0, 0.42, 0);
    head.add(lab.sprite);

    g.position.set(x, 0, 4.6);
    head.lookAt(new THREE.Vector3(-x * 0.25, 0, 0.4));
    camsGroup.add(g);
    camHeads.push(head);
    return { g, head, label: lab };
  }
  const camA = makeCam(-5.4, 'cam_a');
  const camB = makeCam(5.4, 'cam_b');
  scene.add(camsGroup);

  /* ==========================================================
     CHARUCO BOARD (chapter 1) — canvas checker + marker texture.
     ========================================================== */
  function charucoTexture() {
    const cv = document.createElement('canvas');
    cv.width = 560; cv.height = 400;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#e8e6df';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const cols = 7, rows = 5, s = 80;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const dark = (r + c) % 2 === 0;
      ctx.fillStyle = dark ? '#101214' : '#e8e6df';
      ctx.fillRect(c * s, r * s, s, s);
      if (!dark) { // pseudo ArUco marker in the light cells
        ctx.fillStyle = '#101214';
        const m = 14;
        ctx.fillRect(c * s + m, r * s + m, s - 2 * m, s - 2 * m);
        ctx.fillStyle = '#e8e6df';
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          if ((i + j + r + c) % 2) ctx.fillRect(c * s + m + 8 + i * 14, r * s + m + 8 + j * 14, 11, 11);
        }
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const boardMat = new THREE.MeshStandardMaterial({
    map: charucoTexture(), roughness: 0.85, transparent: true, opacity: 0,
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.5), boardMat);
  board.rotation.x = -Math.PI / 2;
  board.rotation.z = 0.22;
  board.position.set(0, 0.03, 1.4);
  scene.add(board);

  const resLabel = makeLabel('résidu 1.176 px', ACCENT_CSS, 0.2);
  resLabel.sprite.position.set(0, 0.85, 1.4);
  scene.add(resLabel.sprite);
  const originLabel = makeLabel('origine · Z = 0', MIST_CSS, 0.16);
  originLabel.sprite.position.set(-1.9, 0.35, 1.0);
  scene.add(originLabel.sprite);

  /* ==========================================================
     DETECTION OBJECTS (chapter 2) — palette / carton / polybag,
     each with a wireframe 3D box + class-confidence label.
     ========================================================== */
  function makePallet() {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x55483a, roughness: 0.9 });
    for (let i = -1; i <= 1; i++) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.8), wood);
      block.position.set(i * 0.48, 0.06, 0);
      g.add(block);
    }
    for (let i = -2; i <= 2; i++) {
      const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.13), wood);
      boardMesh.position.set(0, 0.14, i * 0.165);
      g.add(boardMesh);
    }
    const load = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.5, 0.66),
      new THREE.MeshStandardMaterial({ color: 0x8a7a5d, roughness: 0.85 })
    );
    load.position.set(0, 0.42, 0);
    g.add(load);
    return g;
  }
  function makeCarton() {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: 0x9c8455, roughness: 0.9 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.44, 0.46), m);
    box.position.y = 0.22;
    g.add(box);
    return g;
  }
  function makePolybag() {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.35, metalness: 0.15 });
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14), m);
    bag.scale.set(1.25, 0.55, 0.95);
    bag.position.y = 0.18;
    g.add(bag);
    return g;
  }

  function wireBox(w, h, d, y) {
    const geo = new THREE.BufferGeometry();
    const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2, y0 = y, y1 = y + h;
    const P = [
      [x0,y0,z0],[x1,y0,z0],[x1,y0,z0],[x1,y0,z1],[x1,y0,z1],[x0,y0,z1],[x0,y0,z1],[x0,y0,z0],
      [x0,y1,z0],[x1,y1,z0],[x1,y1,z0],[x1,y1,z1],[x1,y1,z1],[x0,y1,z1],[x0,y1,z1],[x0,y1,z0],
      [x0,y0,z0],[x0,y1,z0],[x1,y0,z0],[x1,y1,z0],[x1,y0,z1],[x1,y1,z1],[x0,y0,z1],[x0,y1,z1],
    ];
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P.flat()), 3));
    const mat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 });
    return { line: new THREE.LineSegments(geo, mat), mat };
  }

  const detected = []; // { group, boxMat, labelMat, lock }
  function addDetected(maker, pos, boxDims, labelText, lock) {
    const group = new THREE.Group();
    group.add(maker());
    const wb = wireBox(boxDims[0], boxDims[1], boxDims[2], 0);
    group.add(wb.line);
    const lab = makeLabel(labelText, ACCENT_CSS, 0.2);
    lab.sprite.position.set(0, boxDims[1] + 0.28, 0);
    group.add(lab.sprite);
    group.position.set(pos[0], pos[1], pos[2]);
    scene.add(group);
    detected.push({ group, boxMat: wb.mat, labelMat: lab.mat, lock });
    return group;
  }

  // The tracked pallet (moves in chapter 3) + two static objects.
  const trackedPallet = addDetected(makePallet, [-4.2, 0, 2.4], [1.3, 0.85, 0.95], 'palette 0.98', 0.42);
  addDetected(makeCarton, [-2.4, 0, 3.1], [0.75, 0.55, 0.6], 'carton 0.97', 0.45);
  addDetected(makePolybag, [0.9, 0, 3.3], [0.85, 0.45, 0.75], 'polybag 0.95', 0.48);

  /* ==========================================================
     POSE SKELETON — a person walking through the scene, drawn
     as live keypoints + bones (YOLO11-pose on the real rig; the
     dashboard renders these skeletons with zero extra inference).
     Soft cyan like the production UI.
     ========================================================== */
  const POSE_COLOR = 0x7cc4e8;
  const person = new THREE.Group();
  scene.add(person);
  const J = 15; // head, neck, shL, shR, elL, elR, wrL, wrR, pelvis, hipL, hipR, kneeL, kneeR, ankL, ankR
  const jointMat = new THREE.MeshBasicMaterial({ color: POSE_COLOR, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const jointGeo = new THREE.SphereGeometry(0.038, 8, 8);
  const joints = [];
  for (let i = 0; i < J; i++) {
    const s = new THREE.Mesh(jointGeo, jointMat);
    person.add(s);
    joints.push(s);
  }
  const BONES = [
    [0, 1], [1, 2], [1, 3], [2, 4], [4, 6], [3, 5], [5, 7],
    [1, 8], [8, 9], [8, 10], [9, 11], [11, 13], [10, 12], [12, 14],
  ];
  const boneArr = new Float32Array(BONES.length * 6);
  const boneGeo = new THREE.BufferGeometry();
  const boneAttr = new THREE.BufferAttribute(boneArr, 3);
  boneGeo.setAttribute('position', boneAttr);
  const boneMat = new THREE.LineBasicMaterial({ color: POSE_COLOR, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
  person.add(new THREE.LineSegments(boneGeo, boneMat));
  const poseLabel = makeLabel('#3 person · pose 0.93', '#7CC4E8', 0.18);
  poseLabel.sprite.position.set(0, 1.92, 0);
  person.add(poseLabel.sprite);

  const _jp = []; // reusable local joint positions
  for (let i = 0; i < J; i++) _jp.push(new THREE.Vector3());

  function updatePerson(t) {
    // Ping-pong walk along x at z = -1.2, facing the walk direction.
    const SPAN = 10, V = 0.6;
    const u = (t * V) % (SPAN * 2);
    const dir = u < SPAN ? 1 : -1;
    const x = u < SPAN ? -5 + u : 5 - (u - SPAN);
    person.position.set(x, 0, -1.2);
    person.rotation.y = dir > 0 ? 0 : Math.PI;

    const ph = t * 4.4;                       // step phase
    const bob = 0.03 * Math.sin(ph * 2);
    _jp[8].set(0, 0.98 + bob, 0);             // pelvis
    _jp[1].set(0, 1.44 + bob, 0);             // neck
    _jp[0].set(0.03, 1.62 + bob, 0);          // head
    _jp[2].set(0, 1.4 + bob, 0.19);           // shoulders
    _jp[3].set(0, 1.4 + bob, -0.19);
    _jp[9].set(0, 0.95 + bob, 0.11);          // hips
    _jp[10].set(0, 0.95 + bob, -0.11);
    for (const side of [0, 1]) {              // 0 = left, 1 = right
      const sp = side === 0 ? 0 : Math.PI;
      // Legs
      const a = 0.55 * Math.sin(ph + sp);
      const hip = _jp[9 + side];
      const knee = _jp[11 + side];
      const ank = _jp[13 + side];
      knee.set(hip.x + 0.44 * Math.sin(a), hip.y - 0.44 * Math.cos(a), hip.z);
      const bend = 0.55 * Math.max(0, Math.sin(ph + sp + 0.9));
      const a2 = a - bend;
      ank.set(knee.x + 0.46 * Math.sin(a2), knee.y - 0.46 * Math.cos(a2), knee.z);
      // Arms swing opposite the legs
      const aa = 0.45 * Math.sin(ph + sp + Math.PI);
      const sh = _jp[2 + side];
      const el = _jp[4 + side];
      const wr = _jp[6 + side];
      el.set(sh.x + 0.3 * Math.sin(aa), sh.y - 0.3 * Math.cos(aa), sh.z);
      wr.set(el.x + 0.28 * Math.sin(aa + 0.4), el.y - 0.28 * Math.cos(aa + 0.4), el.z);
    }
    for (let i = 0; i < J; i++) joints[i].position.copy(_jp[i]);
    for (let b = 0; b < BONES.length; b++) {
      const p0 = _jp[BONES[b][0]], p1 = _jp[BONES[b][1]];
      boneArr[b * 6] = p0.x; boneArr[b * 6 + 1] = p0.y; boneArr[b * 6 + 2] = p0.z;
      boneArr[b * 6 + 3] = p1.x; boneArr[b * 6 + 4] = p1.y; boneArr[b * 6 + 5] = p1.z;
    }
    boneAttr.needsUpdate = true;
  }

  /* ==========================================================
     ÉTAGÈRE — a rack with the operator's 3×3 grid: each cell
     classified vide / plein, one cell flipping state live (the
     15-vote stabilizer in action).
     ========================================================== */
  const etagere = new THREE.Group();
  const etaPostGeo = new THREE.BoxGeometry(0.09, 2.3, 0.09);
  for (const ex of [-1.0, 1.0]) for (const ez of [-0.35, 0.35]) {
    const post = new THREE.Mesh(etaPostGeo, postMat);
    post.position.set(ex, 1.15, ez);
    etagere.add(post);
  }
  const CELL = 0.62, CELL_X = [-CELL, 0, CELL], CELL_Y = [0.5, 1.15, 1.8];
  for (const cy of CELL_Y) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 0.72), beamMat);
    shelf.position.set(0, cy - 0.31, 0);
    etagere.add(shelf);
  }
  // filled pattern (row-major, bottom→top); index 4 (centre) flips live.
  const CELL_FILLED = [1, 0, 1, 1, 1, 0, 0, 1, 0];
  const etaCells = [];
  const etaBoxGeo = new THREE.BoxGeometry(0.44, 0.4, 0.44);
  const cellFillGeo = new THREE.PlaneGeometry(0.54, 0.54);
  const cellWireGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.28, -0.28, 0), new THREE.Vector3(0.28, -0.28, 0),
    new THREE.Vector3(0.28, 0.28, 0), new THREE.Vector3(-0.28, 0.28, 0),
    new THREE.Vector3(-0.28, -0.28, 0),
  ]);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const idx = r * 3 + c;
    const cx = CELL_X[c], cyy = CELL_Y[r];
    const box = new THREE.Mesh(etaBoxGeo, binMat);
    box.position.set(cx, cyy - 0.08, 0);
    etagere.add(box);
    const fillMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const fill = new THREE.Mesh(cellFillGeo, fillMat);
    fill.position.set(cx, cyy, 0.4);
    etagere.add(fill);
    const wireMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 });
    const wire = new THREE.Line(cellWireGeo, wireMat);
    wire.position.set(cx, cyy, 0.4);
    etagere.add(wire);
    etaCells.push({ idx, box, fillMat, wireMat, filled: CELL_FILLED[idx] === 1 });
  }
  etagere.position.set(-7.4, 0, -0.8);
  etagere.rotation.y = 0.95;
  scene.add(etagere);
  const etaLabel = makeLabel('eta_1 · 3×3 · vide / plein', ACCENT_CSS, 0.17);
  etaLabel.sprite.position.set(-7.4, 2.75, -0.8);
  scene.add(etaLabel.sprite);

  /* ==========================================================
     ZONES + TRACKING (chapter 3) — dashed metric zones, the
     pallet path, its trail and the two triangulation rays.
     ========================================================== */
  function makeZone(x, z, w, d, name) {
    const pts = [
      new THREE.Vector3(x - w / 2, 0.02, z - d / 2),
      new THREE.Vector3(x + w / 2, 0.02, z - d / 2),
      new THREE.Vector3(x + w / 2, 0.02, z + d / 2),
      new THREE.Vector3(x - w / 2, 0.02, z + d / 2),
      new THREE.Vector3(x - w / 2, 0.02, z - d / 2),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: ACCENT, dashSize: 0.22, gapSize: 0.14, transparent: true, opacity: 0,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    scene.add(line);
    const lab = makeLabel(name, ACCENT_CSS, 0.24);
    lab.sprite.position.set(x, 0.32, z + d / 2 + 0.3);
    scene.add(lab.sprite);
    return { mat, labelMat: lab.mat };
  }
  const zone1 = makeZone(-1.6, 1.6, 3.0, 2.4, 'Zone 1');
  const zone2 = makeZone(2.6, 0.2, 3.2, 2.6, 'Zone 2');

  const trackPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.2, 0, 2.4),
    new THREE.Vector3(-1.8, 0, 1.7),
    new THREE.Vector3(0.6, 0, 1.0),
    new THREE.Vector3(2.6, 0, 0.3),
  ]);
  const TRAIL_N = 90;
  const trailArr = new Float32Array(TRAIL_N * 3);
  const trailPts = trackPath.getPoints(TRAIL_N - 1);
  for (let i = 0; i < TRAIL_N; i++) {
    trailArr[i * 3] = trailPts[i].x;
    trailArr[i * 3 + 1] = 0.06;
    trailArr[i * 3 + 2] = trailPts[i].z;
  }
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailArr, 3));
  trailGeo.setDrawRange(0, 0);
  const trailMat = new THREE.LineBasicMaterial({
    color: ACCENT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Line(trailGeo, trailMat));

  // Triangulation rays from each camera head to the tracked pallet.
  const rayGeoA = new THREE.BufferGeometry();
  rayGeoA.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const rayGeoB = new THREE.BufferGeometry();
  rayGeoB.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const rayMatA = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
  const rayMatB = rayMatA.clone();
  rayMats.push(rayMatA, rayMatB);
  scene.add(new THREE.Line(rayGeoA, rayMatA));
  scene.add(new THREE.Line(rayGeoB, rayMatB));

  const triMarkerMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
  const triMarker = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), triMarkerMat);
  scene.add(triMarker);

  const trackLabel = makeLabel('Track3D #7 · X 2.6 m · Y 0.3 m', ACCENT_CSS, 0.18);
  trackedPallet.add(trackLabel.sprite);
  trackLabel.sprite.position.set(0, 1.55, 0);

  /* ==========================================================
     PUBLISH (chapter 4) — gateway pylon, UDP/MQTT pulses, AGV.
     ========================================================== */
  const gateway = new THREE.Group();
  const pylon = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 2.3, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x272d34, roughness: 0.6 })
  );
  pylon.position.y = 1.15;
  gateway.add(pylon);
  const beaconMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), beaconMat);
  beacon.position.y = 2.42;
  gateway.add(beacon);
  gateway.position.set(8.2, 0, -1.6);
  scene.add(gateway);
  const gwLabel = makeLabel('isiComms · UDP / MQTT', MIST_CSS, 0.2);
  gwLabel.sprite.position.set(8.2, 3.0, -1.6);
  scene.add(gwLabel.sprite);
  const latLabel = makeLabel('capture→publish 40.3 ms', ACCENT_CSS, 0.2);
  latLabel.sprite.position.set(5.4, 1.9, -0.6);
  scene.add(latLabel.sprite);

  const pulseCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(2.6, 0.6, 0.3),
    new THREE.Vector3(5.4, 2.6, -0.8),
    new THREE.Vector3(8.2, 2.42, -1.6)
  );
  const PULSES = 4;
  const pulses = [];
  const pulseGeo = new THREE.SphereGeometry(0.07, 10, 8);
  for (let i = 0; i < PULSES; i++) {
    const m = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
    const s = new THREE.Mesh(pulseGeo, m);
    scene.add(s);
    pulses.push({ mesh: s, mat: m, off: i / PULSES });
  }

  // AGV consumer: a small dark vehicle that pulls away once fed.
  const agv = new THREE.Group();
  const agvBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.3, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x1d2329, roughness: 0.5, metalness: 0.3 })
  );
  agvBody.position.y = 0.22;
  agv.add(agvBody);
  const agvStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.02, 0.42),
    new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.85 })
  );
  agvStripe.position.y = 0.39;
  agv.add(agvStripe);
  const agvLabel = makeLabel('AGV', MIST_CSS, 0.16);
  agvLabel.sprite.position.set(0, 0.85, 0);
  agv.add(agvLabel.sprite);
  agv.position.set(8.4, 0, 2.6);
  scene.add(agv);

  /* ==========================================================
     CAMERA PATH — keyframes over p.
     ========================================================== */
  const KEYS = [
    { at: 0.00, pos: new THREE.Vector3(0, 3.6, 13.0), look: new THREE.Vector3(0, 0.8, 0) },
    { at: 0.20, pos: new THREE.Vector3(-5.0, 2.6, 8.2), look: new THREE.Vector3(-0.6, 0.6, 1.2) },
    { at: 0.36, pos: new THREE.Vector3(-0.8, 2.2, 8.6), look: new THREE.Vector3(-1.6, 0.3, 1.6) },
    { at: 0.52, pos: new THREE.Vector3(-2.4, 3.4, 7.6), look: new THREE.Vector3(-1.4, 0.2, 1.4) },
    { at: 0.68, pos: new THREE.Vector3(0.4, 7.4, 8.0), look: new THREE.Vector3(0, 0, 0) },
    { at: 0.86, pos: new THREE.Vector3(2.0, 4.2, 10.8), look: new THREE.Vector3(5.4, 1.2, -1.2) },
    { at: 1.00, pos: new THREE.Vector3(0, 4.6, 13.6), look: new THREE.Vector3(0.6, 0.8, 0) },
  ];
  const _look = new THREE.Vector3();
  function setCamera(p) {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = smoothstep(a.at, b.at, p);
    camera.position.lerpVectors(a.pos, b.pos, t);
    _look.lerpVectors(a.look, b.look, t);
    camera.lookAt(_look);
  }

  /* ==========================================================
     CARDS — same per-frame reveal machinery as the home story.
     ========================================================== */
  const mqSm = window.matchMedia('(min-width:640px)');
  const cardEls = Array.from(document.querySelectorAll('.story-card'));
  const cards = cardEls.map((el, idx) => {
    el.style.transition = 'none';
    const win = CARD_WINDOWS[idx] || CARD_WINDOWS[CARD_WINDOWS.length - 1];
    // The closing card (window ending at 1) keeps its CTAs visible while the
    // sticky stage hands off to the next section — no trailing fade.
    return {
      el, w0: win[0], w1: win[1],
      noLeadIn: win[0] === 0, noTrailOut: win[1] === 1,
      base: '', lastK: -1, live: false,
    };
  });
  function computeCardBases() {
    const wide = mqSm.matches;
    for (const c of cards) {
      const cl = c.el.classList;
      let t = '';
      if (cl.contains('-translate-x-1/2') || (wide && cl.contains('sm:-translate-x-1/2'))) t += 'translateX(-50%) ';
      if (cl.contains('-translate-y-1/2') || (wide && cl.contains('sm:-translate-y-1/2'))) t += 'translateY(-50%) ';
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
      if (live !== c.live) { c.el.classList.toggle('is-live', live); c.live = live; }
    }
  }

  /* ==========================================================
     SCROLL → PROGRESS
     ========================================================== */
  const story = document.getElementById('story');
  let storyTop = 0, storyRange = 1;
  function measureStory() {
    if (!story) return;
    storyTop = story.offsetTop;
    storyRange = Math.max(1, story.offsetHeight - window.innerHeight);
  }
  measureStory();
  let pTarget = 0, pCur = 0;
  function readScroll() {
    if (!story) return;
    pTarget = clamp((window.scrollY - storyTop) / storyRange, 0, 1);
  }
  readScroll();
  pCur = pTarget;

  /* ==========================================================
     MAIN UPDATE — every visual is a function of p (+ clock t).
     ========================================================== */
  const _v = new THREE.Vector3();
  const _rayA = rayGeoA.getAttribute('position');
  const _rayB = rayGeoB.getAttribute('position');
  const _headPos = new THREE.Vector3();

  function update(t) {
    const p = pCur;
    scene.fog.density = THREE.MathUtils.lerp(0.042, 0.026, smoothstep(0, 0.2, p));
    dust.rotation.y = t * 0.014;

    /* --- Chapter 1 : CALIBRER ------------------------------- */
    const kBoard = smoothstep(0.15, 0.21, p) * (1 - smoothstep(0.33, 0.39, p));
    boardMat.opacity = kBoard;
    resLabel.mat.opacity = kBoard * smoothstep(0.22, 0.27, p);
    originLabel.mat.opacity = kBoard * smoothstep(0.20, 0.25, p);
    const kFrustum = smoothstep(0.17, 0.27, p); // frustums stay on afterwards, dimmed
    const frustumIdle = 0.12 + 0.04 * Math.sin(t * 2.1);
    frustumMats.forEach((m) => {
      m.opacity = kFrustum * (kBoard > 0 ? 0.45 : frustumIdle);
    });
    camA.label.mat.opacity = camB.label.mat.opacity = smoothstep(0.16, 0.22, p);

    // Coverage light: faint from the start, blooming with the calibration
    // chapter, breathing slightly ever after.
    const kCone = 0.35 + 0.65 * smoothstep(0.05, 0.2, p);
    coneMats.forEach((m, i) => {
      m.opacity = kCone * (0.036 + 0.01 * Math.sin(t * 1.7 + i * 2.1));
    });

    /* --- Pose skeleton (visible from the detection chapter on) --- */
    const kPose = smoothstep(0.36, 0.42, p);
    updatePerson(t);
    jointMat.opacity = kPose * 0.95;
    boneMat.opacity = kPose * 0.85;
    poseLabel.mat.opacity = kPose;

    /* --- Étagère 3×3 (with the detections; centre cell flips live) --- */
    const kEta = smoothstep(0.4, 0.46, p);
    const flipPeriod = 6;
    const flipT = (t % flipPeriod) / flipPeriod;
    const centreFilled = Math.floor(t / flipPeriod) % 2 === 0;
    const centreK = smoothstep(0, 0.08, flipT); // quick settle after each flip
    for (const cell of etaCells) {
      let filled = cell.filled ? 1 : 0;
      if (cell.idx === 4) filled = centreFilled ? centreK : 1 - centreK;
      cell.box.scale.setScalar(Math.max(0.001, filled));
      cell.fillMat.opacity = kEta * filled * 0.14;
      cell.wireMat.opacity = kEta * (0.25 + filled * 0.6);
    }
    etaLabel.mat.opacity = kEta;

    /* --- Chapter 2 : DÉTECTER ------------------------------- */
    for (const d of detected) {
      const kv = smoothstep(d.lock - 0.05, d.lock, p);
      const pop = 1 + 0.12 * Math.sin(Math.PI * clamp((p - d.lock + 0.02) / 0.05, 0, 1));
      d.boxMat.opacity = kv * (0.75 + 0.2 * Math.sin(t * 2.6));
      d.labelMat.opacity = kv;
      d.group.children[1].scale.setScalar(pop); // the wire box
    }

    /* --- Chapter 3 : TRIANGULER & SUIVRE --------------------- */
    const kZone = smoothstep(0.56, 0.62, p);
    zone1.mat.opacity = kZone * 0.85;
    zone2.mat.opacity = kZone * 0.85;
    zone1.labelMat.opacity = kZone;
    zone2.labelMat.opacity = kZone;

    const tp = smoothstep(0.60, 0.76, p); // pallet progress along the path
    trackPath.getPoint(tp, _v);
    trackedPallet.position.set(_v.x, 0, _v.z);
    trailGeo.setDrawRange(0, Math.max(2, Math.floor(tp * TRAIL_N)));
    const kTrack = smoothstep(0.58, 0.63, p) * (1 - smoothstep(0.94, 1.0, p));
    trailMat.opacity = kTrack * 0.8;
    trackLabel.mat.opacity = kTrack;

    // Rays camera-head → pallet centre; marker at the intersection.
    camHeads[0].getWorldPosition(_headPos);
    _rayA.setXYZ(0, _headPos.x, _headPos.y, _headPos.z);
    _rayA.setXYZ(1, _v.x, 0.45, _v.z);
    _rayA.needsUpdate = true;
    camHeads[1].getWorldPosition(_headPos);
    _rayB.setXYZ(0, _headPos.x, _headPos.y, _headPos.z);
    _rayB.setXYZ(1, _v.x, 0.45, _v.z);
    _rayB.needsUpdate = true;
    rayMatA.opacity = rayMatB.opacity = kTrack * (0.4 + 0.15 * Math.sin(t * 3.2));
    triMarker.position.set(_v.x, 0.45, _v.z);
    triMarkerMat.opacity = kTrack * (0.7 + 0.3 * Math.sin(t * 3.2));

    /* --- Chapter 4 : PUBLIER --------------------------------- */
    const kPub = smoothstep(0.80, 0.86, p);
    beaconMat.opacity = kPub * (0.55 + 0.45 * Math.sin(t * 3.4));
    gwLabel.mat.opacity = kPub;
    latLabel.mat.opacity = kPub * smoothstep(0.84, 0.9, p);
    for (const pu of pulses) {
      const s = (t * 0.35 + pu.off) % 1;
      pulseCurve.getPoint(s, _v);
      pu.mesh.position.copy(_v);
      pu.mat.opacity = kPub * Math.sin(Math.PI * s) * 0.95;
    }
    const agvT = smoothstep(0.88, 0.99, p);
    agv.position.x = 8.4 - agvT * 4.6;
    agvLabel.mat.opacity = kPub;

    setCamera(p);
    updateCards(p);
  }

  /* ==========================================================
     LOOP + LIFECYCLE
     ========================================================== */
  const clock = new THREE.Clock();
  let running = true;
  let inView = true;
  let rafId = 0;

  function frame() {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    pCur += (pTarget - pCur) * (1 - Math.pow(0.001, dt));
    if (Math.abs(pTarget - pCur) < 0.0004) pCur = pTarget;
    update(clock.elapsedTime);
    renderer.render(scene, camera);
  }
  function start() { if (!rafId) { clock.getDelta(); rafId = requestAnimationFrame(frame); } }
  function stop() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }
  start();

  window.addEventListener('scroll', readScroll, { passive: true });
  function onResize() {
    width = container.clientWidth || window.innerWidth || 1;
    height = container.clientHeight || window.innerHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    measureStory();
    readScroll();
    computeCardBases();
  }
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(container);
  else window.addEventListener('resize', onResize);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView && running && !document.hidden) start(); else stop();
    }, { threshold: 0 }).observe(container);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (inView) start();
  });
}

try { init(); } catch (err) {
  document.body.classList.add('story-static');
  if (window.console && console.warn) console.warn('isi3d-scene: fallback statique —', err);
}
