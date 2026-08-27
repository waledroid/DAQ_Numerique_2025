/* ============================================================
   LIQUID OPTICS — IsiDetector immersive case study (isidet-scene.js)
   A sticky WebGL stage scrubbed by page scroll: a procedural
   recreation of the conveyor sorting line — belt + rollers +
   gantry camera, parcels flowing continuously, instance-mask
   overlays, the FP32→FP16→INT8 compression story, the trigger
   line at 0.71 with LIVE incrementing counters, and UDP pulses
   flying to the sorter PLC. No client footage — everything is
   drawn in code.

   Chapters: hero · SEGMENTER · COMPRESSER · COMPTER · DÉCLENCHER.
   Same architecture as isi3d-scene.js: scrollY → eased pCur,
   every reveal is a pure function of p (+ a clock for the belt),
   reduced-motion / WebGL-fail → body.story-static fallback,
   DPR ≤ 2, pause off-screen.
   ============================================================ */

import * as THREE from 'three';

const ACCENT = 0xa3e635;
const ACCENT_CSS = '#A3E635';
const MIST_CSS = '#F2F4F7';
const FOG_COLOR = 0x050607;

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
  camera.position.set(0, 3.4, 10.5);
  camera.lookAt(0, 0.6, 0);

  scene.add(new THREE.AmbientLight(0x2a323a, 1.8));
  const key = new THREE.DirectionalLight(0xcfe8df, 1.5);
  key.position.set(6, 10, 7);
  scene.add(key);
  const rim = new THREE.PointLight(ACCENT, 0.9, 40);
  rim.position.set(-6, 4, 6);
  scene.add(rim);

  /* ---------- Floor + grid + dust (house style) --------------- */
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

  const DUST_N = 600;
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

  /* ---------- Labels (HUD sprites, never occluded) ------------ */
  const labelMats = [];
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
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    const hh = h || 0.18;
    sprite.scale.set(hh * (cv.width / cv.height), hh, 1);
    labelMats.push(mat);
    return { sprite, mat };
  }

  /* ==========================================================
     CONVEYOR — belt, rollers, side rails, gantry camera.
     Belt runs along X. Parcels flow −x → +x, loop forever.
     ========================================================== */
  const BELT_LEN = 16, BELT_W = 1.7, BELT_Y = 0.62;
  const conveyor = new THREE.Group();

  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(BELT_LEN, 0.06, BELT_W),
    new THREE.MeshStandardMaterial({ color: 0x14171b, roughness: 0.65, metalness: 0.2 })
  );
  belt.position.y = BELT_Y;
  conveyor.add(belt);

  // Rollers under the belt ends + legs.
  const rollerGeo = new THREE.CylinderGeometry(0.09, 0.09, BELT_W + 0.1, 14);
  const rollerMat = new THREE.MeshStandardMaterial({ color: 0x3a424b, roughness: 0.4, metalness: 0.6 });
  const rollers = [];
  for (let x = -BELT_LEN / 2 + 0.4; x <= BELT_LEN / 2 - 0.3; x += 1.5) {
    const r = new THREE.Mesh(rollerGeo, rollerMat);
    r.rotation.x = Math.PI / 2;
    r.position.set(x, BELT_Y - 0.12, 0);
    conveyor.add(r);
    rollers.push(r);
  }
  const legMat = new THREE.MeshStandardMaterial({ color: 0x232930, roughness: 0.8 });
  for (const lx of [-BELT_LEN / 2 + 0.6, -BELT_LEN / 4, 0, BELT_LEN / 4, BELT_LEN / 2 - 0.6]) {
    for (const lz of [-BELT_W / 2 + 0.1, BELT_W / 2 - 0.1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, BELT_Y, 0.09), legMat);
      leg.position.set(lx, BELT_Y / 2 - 0.06, lz);
      conveyor.add(leg);
    }
  }
  // Side rails — muted rust orange, echoing the real line.
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8a3b2a, roughness: 0.6, metalness: 0.2 });
  for (const rz of [-BELT_W / 2 - 0.06, BELT_W / 2 + 0.06]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(BELT_LEN, 0.16, 0.05), railMat);
    rail.position.set(0, BELT_Y + 0.16, rz);
    conveyor.add(rail);
  }
  scene.add(conveyor);

  /* ---------- Gantry + down-looking camera above the line ----- */
  const LINE_X = 3.36; // 0.71 of the visible span — the deployed trigger line
  const gantry = new THREE.Group();
  const postGeo = new THREE.BoxGeometry(0.1, 3.1, 0.1);
  for (const gz of [-BELT_W / 2 - 0.5, BELT_W / 2 + 0.5]) {
    const post = new THREE.Mesh(postGeo, legMat);
    post.position.set(0, 1.55, gz);
    gantry.add(post);
  }
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, BELT_W + 1.1), legMat);
  crossbar.position.set(0, 3.05, 0);
  gantry.add(crossbar);
  const camBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.22, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.45, metalness: 0.25 })
  );
  camBody.position.set(0, 2.86, 0);
  gantry.add(camBody);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.08, 0.14, 14),
    new THREE.MeshStandardMaterial({ color: 0x0c0e10, roughness: 0.3, metalness: 0.6 })
  );
  lens.position.set(0, 2.7, 0);
  gantry.add(lens);
  // View cone down to the belt.
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(1.35, 2.05, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false })
  );
  cone.position.set(0, 1.66, 0);
  gantry.add(cone);
  gantry.position.x = LINE_X - 1.1; // camera slightly upstream of the line
  scene.add(gantry);
  const camLabel = makeLabel('caméra zénithale · 320 px', MIST_CSS, 0.16);
  camLabel.sprite.position.set(LINE_X - 1.1, 3.45, 0);
  scene.add(camLabel.sprite);

  /* ---------- Trigger line at 0.71 + flash ring ---------------- */
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(LINE_X, BELT_Y + 0.05, -BELT_W / 2),
    new THREE.Vector3(LINE_X, BELT_Y + 0.05, BELT_W / 2),
  ]);
  const lineMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Line(lineGeo, lineMat));
  const lineLabel = makeLabel('ligne de comptage · 0.71', ACCENT_CSS, 0.18);
  lineLabel.sprite.position.set(LINE_X, BELT_Y + 0.75, BELT_W / 2 + 0.55);
  scene.add(lineLabel.sprite);

  const flashMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, BELT_W), flashMat);
  flash.rotation.x = -Math.PI / 2;
  flash.rotation.z = Math.PI / 2;
  flash.position.set(LINE_X, BELT_Y + 0.045, 0);
  scene.add(flash);

  /* ---------- LIVE counter (canvas texture, redrawn on event) -- */
  const counter = { carton: 0, polybag: 0 };
  const counterCv = document.createElement('canvas');
  counterCv.width = 1460; counterCv.height = 150;
  const counterCtx = counterCv.getContext('2d');
  const counterTex = new THREE.CanvasTexture(counterCv);
  counterTex.colorSpace = THREE.SRGBColorSpace;
  const counterMat = new THREE.SpriteMaterial({ map: counterTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
  const counterSprite = new THREE.Sprite(counterMat);
  counterSprite.scale.set(0.15 * (counterCv.width / counterCv.height), 0.15, 1);
  counterSprite.position.set(LINE_X - 0.1, BELT_Y + 0.35, 2.05);
  scene.add(counterSprite);
  function drawCounter() {
    counterCtx.clearRect(0, 0, counterCv.width, counterCv.height);
    counterCtx.fillStyle = 'rgba(6,8,9,0.78)';
    counterCtx.fillRect(0, 0, counterCv.width, counterCv.height);
    counterCtx.font = '500 92px "JetBrains Mono", monospace';
    counterCtx.textAlign = 'center';
    counterCtx.textBaseline = 'middle';
    counterCtx.fillStyle = ACCENT_CSS;
    counterCtx.fillText('cartons ' + counter.carton + ' · polybags ' + counter.polybag, counterCv.width / 2, counterCv.height / 2 + 4);
    counterTex.needsUpdate = true;
  }
  drawCounter();

  /* ==========================================================
     PARCELS — cartons + polybags looping down the belt, each
     with an instance-mask overlay, wire box and id label.
     ========================================================== */
  function makeCartonMesh() {
    const m = new THREE.MeshStandardMaterial({ color: 0x9c8455, roughness: 0.9 });
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.56), m);
    box.position.y = 0.21;
    g.add(box);
    return { g, dims: [0.72, 0.42, 0.56] };
  }
  function makePolybagMesh() {
    const m = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.35, metalness: 0.15 });
    const g = new THREE.Group();
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), m);
    bag.scale.set(1.2, 0.42, 0.85);
    bag.position.y = 0.15;
    g.add(bag);
    return { g, dims: [0.86, 0.34, 0.62] };
  }

  function wireBox(w, h, d) {
    const geo = new THREE.BufferGeometry();
    const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2, y0 = 0, y1 = h;
    const P = [
      [x0,y0,z0],[x1,y0,z0],[x1,y0,z0],[x1,y0,z1],[x1,y0,z1],[x0,y0,z1],[x0,y0,z1],[x0,y0,z0],
      [x0,y1,z0],[x1,y1,z0],[x1,y1,z0],[x1,y1,z1],[x1,y1,z1],[x0,y1,z1],[x0,y1,z1],[x0,y1,z0],
      [x0,y0,z0],[x0,y1,z0],[x1,y0,z0],[x1,y1,z0],[x1,y0,z1],[x1,y1,z1],[x0,y0,z1],[x0,y1,z1],
    ];
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P.flat()), 3));
    const mat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 });
    return { line: new THREE.LineSegments(geo, mat), mat };
  }

  const SPEED = 1.15; // belt speed, world units / s
  const LOOP = BELT_LEN + 3; // respawn span
  const parcels = [];
  const PARCEL_DEFS = [
    { cls: 'carton', label: '#14 carton 0.97', off: 0.0 },
    { cls: 'polybag', label: '#11 polybag 0.95', off: 3.4 },
    { cls: 'carton', label: '#19 carton 0.98', off: 6.6 },
    { cls: 'carton', label: '#26 carton 0.93', off: 10.2 },
    { cls: 'polybag', label: '#33 polybag 0.96', off: 13.1 },
    { cls: 'carton', label: '#37 carton 0.95', off: 16.0 },
  ];
  for (const def of PARCEL_DEFS) {
    const made = def.cls === 'carton' ? makeCartonMesh() : makePolybagMesh();
    const group = new THREE.Group();
    group.add(made.g);
    // instance-mask fill: translucent accent shell
    const mask = new THREE.Mesh(
      new THREE.BoxGeometry(made.dims[0] + 0.06, made.dims[1] + 0.05, made.dims[2] + 0.06),
      new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    mask.position.y = made.dims[1] / 2 + 0.01;
    group.add(mask);
    const wb = wireBox(made.dims[0] + 0.1, made.dims[1] + 0.1, made.dims[2] + 0.1);
    group.add(wb.line);
    const lab = makeLabel(def.label, ACCENT_CSS, 0.16);
    lab.sprite.position.set(0, made.dims[1] + 0.34, 0);
    group.add(lab.sprite);
    group.position.set(0, BELT_Y + 0.03, (Math.random() - 0.5) * 0.28);
    scene.add(group);
    parcels.push({
      group, cls: def.cls, off: def.off, half: made.dims[0] / 2,
      maskMat: mask.material, boxMat: wb.mat, labelMat: lab.mat,
      wasPast: false,
    });
  }

  /* ==========================================================
     COMPRESSION TRIO (chapter 2) — FP32 → FP16 → INT8.
     ========================================================== */
  const compGroup = new THREE.Group();
  const compMats = [];
  const compDefs = [
    { s: 0.95, x: -1.5, txt: 'FP32 · 11,0 Mo' },
    { s: 0.72, x: 0.0, txt: 'FP16 · 5,5 Mo' },
    { s: 0.52, x: 1.3, txt: 'INT8 · 2,8 Mo' },
  ];
  const compLabels = [];
  for (const cd of compDefs) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2a323a, roughness: 0.35, metalness: 0.5,
      transparent: true, opacity: 0,
    });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(cd.s, cd.s, cd.s), mat);
    cube.position.set(cd.x, cd.s / 2, 0);
    compGroup.add(cube);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(cd.s, cd.s, cd.s)),
      new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 })
    );
    edge.position.copy(cube.position);
    compGroup.add(edge);
    compMats.push({ body: mat, edge: edge.material });
    const lab = makeLabel(cd.txt, MIST_CSS, 0.15);
    lab.sprite.position.set(cd.x, -0.28, 0);
    compGroup.add(lab.sprite);
    compLabels.push(lab);
  }
  const arrow1 = makeLabel('→', ACCENT_CSS, 0.2);
  arrow1.sprite.position.set(-0.78, 0.4, 0);
  compGroup.add(arrow1.sprite);
  const arrow2 = makeLabel('→', ACCENT_CSS, 0.2);
  arrow2.sprite.position.set(0.68, 0.4, 0);
  compGroup.add(arrow2.sprite);
  const cpuLabel = makeLabel('CPU seul · OpenVINO', ACCENT_CSS, 0.17);
  cpuLabel.sprite.position.set(0, 1.25, 0);
  compGroup.add(cpuLabel.sprite);
  compGroup.position.set(-3.4, 1.9, -2.6);
  scene.add(compGroup);

  /* ==========================================================
     PLC + UDP pulses (chapter 4).
     ========================================================== */
  const plc = new THREE.Group();
  const cabinet = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.6, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x1d2329, roughness: 0.5, metalness: 0.3 })
  );
  cabinet.position.y = 0.8;
  plc.add(cabinet);
  const ledMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), ledMat);
  led.position.set(0.22, 1.28, 0.28);
  plc.add(led);
  plc.position.set(6.6, 0, -3.0);
  scene.add(plc);
  const plcLabel = makeLabel('automate du trieur · IsiCom', MIST_CSS, 0.18);
  plcLabel.sprite.position.set(6.6, 2.0, -3.0);
  scene.add(plcLabel.sprite);
  const winLabel = makeLabel('fenêtre 600–1100 ms · 1 décision / colis', ACCENT_CSS, 0.17);
  winLabel.sprite.position.set(5.1, 1.35, -1.2);
  scene.add(winLabel.sprite);
  const udpLabel = makeLabel('UDP ~70 octets · émission 78 µs', ACCENT_CSS, 0.17);
  udpLabel.sprite.position.set(4.4, 2.15, -0.4);
  scene.add(udpLabel.sprite);

  const pulseCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(LINE_X, BELT_Y + 0.3, 0),
    new THREE.Vector3(5.0, 2.2, -1.4),
    new THREE.Vector3(6.6, 1.3, -2.8)
  );
  const PULSES = 3;
  const pulses = [];
  const pulseGeo = new THREE.SphereGeometry(0.06, 10, 8);
  for (let i = 0; i < PULSES; i++) {
    const m = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
    const s = new THREE.Mesh(pulseGeo, m);
    scene.add(s);
    pulses.push({ mesh: s, mat: m, off: i / PULSES });
  }

  /* ==========================================================
     CAMERA PATH
     ========================================================== */
  const KEYS = [
    { at: 0.00, pos: new THREE.Vector3(0, 3.4, 10.8), look: new THREE.Vector3(0, 0.7, 0) },
    { at: 0.20, pos: new THREE.Vector3(-4.6, 1.7, 5.4), look: new THREE.Vector3(-1.4, 0.8, 0) },
    { at: 0.36, pos: new THREE.Vector3(-1.2, 1.6, 4.8), look: new THREE.Vector3(0.6, 0.7, 0) },
    { at: 0.52, pos: new THREE.Vector3(-2.6, 2.7, 1.9), look: new THREE.Vector3(-3.5, 1.9, -2.6) },
    { at: 0.68, pos: new THREE.Vector3(2.4, 6.4, 4.4), look: new THREE.Vector3(3.1, 0.5, -0.3) },
    { at: 0.86, pos: new THREE.Vector3(4.6, 2.8, 5.6), look: new THREE.Vector3(4.6, 1.0, -1.4) },
    { at: 1.00, pos: new THREE.Vector3(0.6, 4.4, 11.2), look: new THREE.Vector3(1, 0.8, 0) },
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
     CARDS (same machinery; last card keeps its CTAs lit)
     ========================================================== */
  const mqSm = window.matchMedia('(min-width:640px)');
  const cardEls = Array.from(document.querySelectorAll('.story-card'));
  const cards = cardEls.map((el, idx) => {
    el.style.transition = 'none';
    const win = CARD_WINDOWS[idx] || CARD_WINDOWS[CARD_WINDOWS.length - 1];
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

  /* ---------- Scroll → progress -------------------------------- */
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
     MAIN UPDATE
     ========================================================== */
  let flashT = -10;
  const _v = new THREE.Vector3();

  function update(t) {
    const p = pCur;
    scene.fog.density = THREE.MathUtils.lerp(0.042, 0.026, smoothstep(0, 0.2, p));
    dust.rotation.y = t * 0.012;

    // Belt: parcels loop; rollers spin.
    const kDetect = smoothstep(0.17, 0.26, p);           // masks + boxes + labels
    const kLine = smoothstep(0.57, 0.63, p);             // trigger line + counter
    const kPub = smoothstep(0.80, 0.86, p);              // PLC / UDP
    // During the compression chapter the belt HUD dims so the trio owns the frame.
    const kCompFocus = smoothstep(0.37, 0.43, p) * (1 - smoothstep(0.53, 0.58, p));
    const hudDim = 1 - kCompFocus * 0.85;
    for (const pc of parcels) {
      const x = ((t * SPEED + pc.off) % LOOP) - LOOP / 2;
      pc.group.position.x = x;
      const onBelt = Math.abs(x) < BELT_LEN / 2 - 0.35 ? 1 : 0;
      pc.group.visible = onBelt === 1;
      const pulse = 0.75 + 0.2 * Math.sin(t * 2.6 + pc.off);
      pc.maskMat.opacity = kDetect * onBelt * 0.13 * hudDim;
      pc.boxMat.opacity = kDetect * onBelt * pulse * hudDim;
      pc.labelMat.opacity = kDetect * onBelt * hudDim;

      // Leading-edge crossing of the trigger line.
      const past = x + pc.half > 3.36;
      if (past && !pc.wasPast && pc.group.visible) {
        if (kLine > 0.5) {
          counter[pc.cls] += 1;
          drawCounter();
          flashT = t;
        }
      }
      pc.wasPast = past;
    }
    for (const r of rollers) r.rotation.z = -t * SPEED / 0.09;

    camLabel.mat.opacity = smoothstep(0.16, 0.22, p);

    /* Chapter 2 — compression trio */
    const kComp = kCompFocus;
    compMats.forEach((cm, i) => {
      const stagger = smoothstep(0.37 + i * 0.025, 0.43 + i * 0.025, p);
      cm.body.opacity = kComp * stagger * 0.85;
      cm.edge.opacity = kComp * stagger;
    });
    compLabels.forEach((l, i) => { l.mat.opacity = kComp * smoothstep(0.40 + i * 0.02, 0.45 + i * 0.02, p); });
    arrow1.mat.opacity = arrow2.mat.opacity = kComp;
    cpuLabel.mat.opacity = kComp;
    compGroup.rotation.y = 0.25 + Math.sin(t * 0.4) * 0.06;

    /* Chapter 3 — trigger line + counter + flash */
    lineMat.opacity = kLine * (0.7 + 0.3 * Math.sin(t * 3.0));
    lineLabel.mat.opacity = kLine;
    counterMat.opacity = kLine;
    const since = t - flashT;
    flashMat.opacity = kLine * Math.max(0, 1 - since * 2.2) * 0.8;

    /* Chapter 4 — UDP pulses to the PLC */
    ledMat.opacity = kPub * (0.5 + 0.5 * Math.sin(t * 3.6));
    plcLabel.mat.opacity = kPub;
    winLabel.mat.opacity = kPub * smoothstep(0.84, 0.9, p);
    udpLabel.mat.opacity = kPub;
    for (const pu of pulses) {
      const s = (t * 0.4 + pu.off) % 1;
      pulseCurve.getPoint(s, _v);
      pu.mesh.position.copy(_v);
      pu.mat.opacity = kPub * Math.sin(Math.PI * s) * 0.95;
    }

    setCamera(p);
    updateCards(p);
  }

  /* ---------- Loop + lifecycle -------------------------------- */
  const clock = new THREE.Clock();
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
      if (inView && !document.hidden) start(); else stop();
    }, { threshold: 0 }).observe(container);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (inView) start();
  });
}

try { init(); } catch (err) {
  document.body.classList.add('story-static');
  if (window.console && console.warn) console.warn('isidet-scene: fallback statique —', err);
}
