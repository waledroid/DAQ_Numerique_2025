/* ============================================================
   LIQUID OPTICS — Home scroll-story 3D scene (story-scene.js)
   A single sticky WebGL stage scrubbed by page scroll across four
   chapters — VOIR · DÉTECTER · COMPRESSER · DÉPLOYER. This module
   owns the whole rig (scene, camera path, particle field) and the
   full CHAPTER 1 (VOIR) content. Chapters 2–4 bolt on later via the
   per-chapter update stubs dispatched from update(dt).

   ES module — loaded via <script type="module"> with an importmap
   exposing "three" and "three/addons/". No external assets.

   Architecture (see task-5-brief):
   - NO GSAP. Scroll progress is computed from window.scrollY (Lenis
     scrolls natively, so scrollY is authoritative) and eased per
     frame for a buttery, fully reversible scrub. EVERYTHING visual
     derives from the eased progress `pCur` — reverse scroll is
     therefore symmetric by construction (no one-way scrub state).
   - Camera follows a 5-keyframe path (setCamera), smoothstepped.
   - Particle field morphs cloud→lattice→chip; for chapter 1 the
     morph weights are 0, but the blend machinery is in place.
   - Robust like the house pattern (three-scene.js): try/catch boot,
     WebGL-fail / reduced-motion → static stacked fallback, DPR ≤ 2,
     ResizeObserver, IntersectionObserver + visibilitychange pause,
     aria-hidden canvas, passive listeners.
   ============================================================ */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ---------- Constants / tokens ------------------------------- */
const ACCENT = 0xa3e635; // bright volt-lime — the ONE accent
const FOG_COLOR = 0x050607; // near-black lab void
const FOG_START = 0.09; // chapter-1 fog eases 0.09 → 0.045
const FOG_FOCUS = 0.045;

// Card reveal windows (progress). Disjoint → cards are never co-visible.
const CARD_WINDOWS = [
  [0.0, 0.22],
  [0.25, 0.47],
  [0.5, 0.72],
  [0.78, 1.0],
];
const CARD_FADE = 0.04; // ease-in/out zone at each end of a window
const CARD_RISE = 24; // px translateY the card rises through on reveal

// Particle counts — lighter field on phones.
const N = (window.matchMedia && window.matchMedia('(max-width:768px)').matches) ? 2500 : 8000;

// Lens (chapter 1) visibility fades over this progress span.
const LENS_FADE_IN = 0.22;
const LENS_FADE_OUT = 0.3;

/* ---------- Small math helpers ------------------------------- */
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
function smoothstep(edge0, edge1, x) {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function init() {
  const container = document.getElementById('story-canvas');
  if (!container) return; // page has no story stage — no-op

  const body = document.body;

  // ---- Capability + preference checks -----------------------------------
  // Reduced motion OR no WebGL → the CSS static fallback (stacked cards,
  // hidden canvas). Add the class and bail; nothing else runs.
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    body.classList.add('story-static');
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // transparent → page bg shows through the sticky stage
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

  // ---- Renderer sizing --------------------------------------------------
  let width = container.clientWidth || window.innerWidth || 1;
  let height = container.clientHeight || window.innerHeight || 1;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  // ---- Scene + fog + environment ----------------------------------------
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_START);

  // PMREM RoomEnvironment lights the physical glass/metal materials.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose(); // env texture stays alive; the generator is no longer needed

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0, 2.5, 12);
  camera.lookAt(0, 0, 0);

  // ---- Lighting ---------------------------------------------------------
  scene.add(new THREE.AmbientLight(0x1a2024, 1.0));
  const key = new THREE.DirectionalLight(0xcfe8df, 1.6);
  key.position.set(5, 8, 6);
  scene.add(key);
  const accentLight = new THREE.PointLight(ACCENT, 1.2, 30);
  accentLight.position.set(-4, 2.5, 4);
  scene.add(accentLight);

  /* ==========================================================
     PARTICLES — the morphing field (cloud → lattice → chip)
     Three static target buffers + one live position attribute.
     Chapter 1 keeps m1=m2=0 (field stays as `cloud`); chapter 3
     (Task 5b) drives the blend. Buffers built once, no per-frame
     allocation.
     ========================================================== */
  const cloud = new Float32Array(N * 3); // random flattened shell, r 5–8
  const lattice = new Float32Array(N * 3); // points on a 1.9³ cube grid
  const chip = new Float32Array(N * 3); // random inside a flat 1.5×0.1×1.5 slab

  const gridCount = Math.max(2, Math.ceil(Math.cbrt(N))); // per-axis grid resolution
  const gridSpan = 1.9;
  for (let i = 0; i < N; i++) {
    const o = i * 3;

    // cloud: spherical shell radius 5–8, y flattened ×0.6
    const r = 5 + Math.random() * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    cloud[o] = r * Math.sin(phi) * Math.cos(theta);
    cloud[o + 1] = r * Math.cos(phi) * 0.6;
    cloud[o + 2] = r * Math.sin(phi) * Math.sin(theta);

    // lattice: map index onto a gridCount³ cube centred on origin
    const gx = i % gridCount;
    const gy = Math.floor(i / gridCount) % gridCount;
    const gz = Math.floor(i / (gridCount * gridCount)) % gridCount;
    const half = (gridCount - 1) / 2 || 1;
    lattice[o] = ((gx - half) / half) * gridSpan;
    lattice[o + 1] = ((gy - half) / half) * gridSpan;
    lattice[o + 2] = ((gz - half) / half) * gridSpan;

    // chip: random inside 1.5 × 0.1 × 1.5 box at y=0.6
    chip[o] = (Math.random() - 0.5) * 1.5;
    chip[o + 1] = 0.6 + (Math.random() - 0.5) * 0.1;
    chip[o + 2] = (Math.random() - 0.5) * 1.5;
  }

  const posArr = new Float32Array(cloud); // live positions start = cloud
  const particleGeo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(posArr, 3);
  particleGeo.setAttribute('position', posAttr);
  const particleMat = new THREE.PointsMaterial({
    color: ACCENT,
    size: 0.04,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Exposed morph weights (Task 5b writes these). Chapter 1 → both 0.
  let m1 = 0; // cloud → lattice
  let m2 = 0; // lattice → chip
  let cloudSynced = true; // posArr currently equals `cloud` verbatim

  function updateParticles() {
    if (m1 === 0 && m2 === 0) {
      // Field is pure cloud — resync once if a previous frame disturbed it,
      // then skip the loop entirely (no wasted work through chapter 1).
      if (!cloudSynced) {
        posArr.set(cloud);
        posAttr.needsUpdate = true;
        cloudSynced = true;
      }
      return;
    }
    cloudSynced = false;
    for (let k = 0; k < posArr.length; k++) {
      const a = cloud[k] + (lattice[k] - cloud[k]) * m1; // cloud→lattice
      posArr[k] = a + (chip[k] - a) * m2; // →chip
    }
    posAttr.needsUpdate = true;
  }

  /* ==========================================================
     LENS (chapter 1) — a stylised zoom-lens (Canon EF-S look) aimed
     straight at the ch1 camera: a semi-matte BLACK BARREL whose axis
     points at the viewer, a KNURLED grip ring near its back, three
     uniform-diameter OPAQUE BEZEL rings stacked in depth, a white
     ENGRAVED TEXT RING on the front lip, a big mirror-black DOMED GLASS
     element (with a thin grey retaining ring) carrying large coloured
     coating reflections + a central highlight. The whole body lives in
     one `lensStack` group that telescopes + rotates together on scroll
     (the `lensKnurl` grip adds an extra spin). Every base opacity below
     is the material's resting alpha; the chapter-1 fade (updateChapter1)
     multiplies into them via `lensMats` so ALL of it reaches fully
     transparent at LENS_FADE_OUT.
     Axis convention: front rim at z≈0, barrel recedes to z≈−1.1.
     ========================================================== */
  const lens = new THREE.Group();

  // Base (resting) opacities — the fade multiplies these each frame.
  const BARREL_BASE = 1.0;
  const KNURL_BASE = 1.0;
  const TEXTRING_BASE = 0.92;
  const BEZEL_BASE = 1.0; // wide front bezels read solid at rest
  const DOME_RING_BASE = 1.0; // thin grey retaining ring on the glass rim
  const GLASS_BASE = 0.98; // domed centre glass, essentially opaque
  const GLINT_G_BASE = 0.45;
  const GLINT_V_BASE = 0.45;
  const HIGHLIGHT_BASE = 0.4; // small central glint, not a blob

  // The whole lens body is ONE stack: barrel + knurl + bezels + text + dome
  // + innards all live in `lensStack`, so the scroll telescope/rotation moves
  // every part together as a single unit (the knurl adds its own extra spin).
  const lensStack = new THREE.Group();
  // Composition: float the lens to the RIGHT of the centred hero card, shrunk
  // so it clears the card. Base transforms; the zoomT telescope writes only
  // position.z each frame (adds to this base z=0), and the stack rotation is
  // applied on .z too — both compose with this base yaw/scale/offset.
  lensStack.position.set(1.7, 0.5, 0); // upper-right gap between card and frame
  lensStack.scale.setScalar(0.45); // world barrel radius ≈0.68
  lensStack.rotation.y = -0.39; // yaw the face toward the ch1 camera (sits left of the lens)
  lens.add(lensStack);

  // --- Black cylindrical barrel (axis → viewer, open-ended tube) ---------
  const barrelMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0c, metalness: 0.4, roughness: 0.55, clearcoat: 0.6,
    transparent: true, opacity: BARREL_BASE,
  });
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 1.1, 64, 1, true),
    barrelMat
  );
  barrel.rotation.x = Math.PI / 2; // y-axis cylinder → z-axis (points at viewer)
  barrel.position.z = -0.55; // front rim z≈0, back rim z≈−1.1
  lensStack.add(barrel);

  // --- Knurled grip ring (~48 axial ribs) near the back of the barrel ----
  const lensKnurl = new THREE.Group();
  lensKnurl.position.z = -0.85;
  const knurlMat = new THREE.MeshPhysicalMaterial({
    color: 0x151517, metalness: 0.5, roughness: 0.6,
    transparent: true, opacity: KNURL_BASE,
  });
  const ribGeo = new THREE.BoxGeometry(0.05, 0.09, 0.34); // shared by every rib
  const RIB_COUNT = 48;
  const RIB_R = 1.51; // sits just proud of the barrel wall
  for (let i = 0; i < RIB_COUNT; i++) {
    const a = (i / RIB_COUNT) * Math.PI * 2;
    const rib = new THREE.Mesh(ribGeo, knurlMat);
    rib.position.set(Math.cos(a) * RIB_R, Math.sin(a) * RIB_R, 0);
    rib.rotation.z = a; // local +y → radial, length (+z) along the barrel axis
    lensKnurl.add(rib);
  }
  lensStack.add(lensKnurl);

  // --- Front section — all added to the shared lensStack (moves as one) ---
  // Engraved white text ring — text drawn along a circular arc on a
  // transparent canvas, mapped onto a front-facing flat annulus.
  function makeLensTextRing() {
    const S = 1024;
    const cv = document.createElement('canvas');
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, S, S);
    ctx.translate(S / 2, S / 2);
    ctx.fillStyle = 'rgba(236,240,238,0.92)';
    ctx.font = '400 38px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const radius = 488; // pixel radius → physical ≈1.43 (on the front bezel lip)
    const text = 'ATANDA VISION LENS  EF-CV 10× 1:4-5.6 IS  ø58mm  ·  ';
    const TWO_PI = Math.PI * 2;
    let angle = -Math.PI / 2; // start at the top of the ring
    const end = angle + TWO_PI;
    let guard = 0;
    while (angle < end && guard < 4000) {
      const ch = text[guard % text.length];
      const step = (ctx.measureText(ch).width || 20) / radius;
      angle += step / 2;
      ctx.save();
      ctx.rotate(angle);
      ctx.translate(0, -radius);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      angle += step / 2;
      guard++;
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  // Wide OPAQUE bezels — stepped concentric matte-to-satin black annuli
  // filling the front face from the outer rim (r≈1.5) down to r≈0.82. A
  // shared physical material; slight radius + depth steps give the stacked-
  // ring read of the photo. Opaque at rest (base 1.0) → the frame is solid.
  const bezelMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0c, metalness: 0.3, roughness: 0.55, clearcoat: 0.3,
    transparent: true, opacity: BEZEL_BASE,
  });
  // SAME exact outer radius (1.5) for every ring — only a thin inner lip —
  // stacked purely in DEPTH so head-on they read as one uniform-diameter
  // barrel of rings layered front-to-back around the big glass element.
  const bezelOuter = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.5, 96), bezelMat);
  bezelOuter.position.z = 0.1; // frontmost ring
  const bezelMid = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.5, 96), bezelMat);
  bezelMid.position.z = 0.03; // ~0.07 deeper
  const bezelInner = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.5, 96), bezelMat);
  bezelInner.position.z = -0.04; // deepest ring, over the glass rim
  lensStack.add(bezelOuter, bezelMid, bezelInner);

  // Engraved text ring — rides ON the front bezel lip (~1.36–1.5).
  const textRingMat = new THREE.MeshBasicMaterial({
    map: makeLensTextRing(), transparent: true, opacity: TEXTRING_BASE, depthWrite: false,
  });
  const textRing = new THREE.Mesh(new THREE.RingGeometry(1.36, 1.5, 96), textRingMat);
  textRing.position.z = 0.13; // just proud of the frontmost bezel ring
  lensStack.add(textRing);

  // Domed centre glass — a SHALLOW, glossy near-black cap (base r≈1.38, just
  // inside the bezel lip; apex protrudes only ≈0.12 forward of its rim) that
  // tucks INSIDE the rings as one assembly. Large sphere R + small θ:
  // base = R·sinθ ≈1.38, sagitta = R·(1−cosθ) ≈0.12. Geometry translated so
  // the apex sits at local origin → clean z-seating.
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x030405, metalness: 1, roughness: 0.04, clearcoat: 1,
    transparent: true, opacity: GLASS_BASE,
  });
  const domeGeo = new THREE.SphereGeometry(8.0, 64, 40, 0, Math.PI * 2, 0, 0.1736);
  domeGeo.translate(0, -8.0, 0); // apex → origin (rim then at y≈−0.12)
  const glass = new THREE.Mesh(domeGeo, glassMat);
  glass.rotation.x = Math.PI / 2; // apex → +z (toward viewer), rim recedes 0.12
  glass.position.z = 0.1; // apex at z≈0.10, rim seated at z≈−0.02 behind the lips
  lensStack.add(glass);

  // Thin grey retaining ring at the visible glass/bezel seam (in front of the
  // bezel lips so it reads as the lens' retaining lip around the glass).
  const domeRingMat = new THREE.MeshPhysicalMaterial({
    color: 0x6a6f76, metalness: 0.6, roughness: 0.4,
    transparent: true, opacity: DOME_RING_BASE,
  });
  const domeRing = new THREE.Mesh(new THREE.TorusGeometry(1.33, 0.016, 12, 120), domeRingMat);
  domeRing.position.z = 0.12; // proud of the front bezel lip, ringing the glass edge
  lensStack.add(domeRing);

  // Coating reflections — soft radial-gradient discs, additive. One large
  // teal-green left + one large violet-magenta right, plus a small near-white
  // central highlight (the photo's bright centre). Shared soft texture.
  function makeSoftDisc() {
    const s = 256;
    const cv = document.createElement('canvas');
    cv.width = s;
    cv.height = s;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const softDisc = makeSoftDisc();
  const glintGeo = new THREE.PlaneGeometry(1, 1);
  const glintGreenMat = new THREE.MeshBasicMaterial({
    color: 0x2ea56b, map: softDisc, transparent: true, opacity: GLINT_G_BASE,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glintVioletMat = new THREE.MeshBasicMaterial({
    color: 0x7b3fd1, map: softDisc, transparent: true, opacity: GLINT_V_BASE,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const highlightMat = new THREE.MeshBasicMaterial({
    color: 0xf2f5f0, map: softDisc, transparent: true, opacity: HIGHLIGHT_BASE,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  // Reflections sit just in front of the shallow dome apex (z≈0.10) so the
  // opaque glass never occludes them; contained within the smaller dome (~0.8×).
  const glintGreen = new THREE.Mesh(glintGeo, glintGreenMat);
  glintGreen.position.set(-0.38, 0.07, 0.14);
  glintGreen.scale.setScalar(1.06);
  const glintViolet = new THREE.Mesh(glintGeo, glintVioletMat);
  glintViolet.position.set(0.45, -0.06, 0.14);
  glintViolet.scale.setScalar(1.12);
  const highlight = new THREE.Mesh(glintGeo, highlightMat);
  highlight.position.set(0.03, 0.0, 0.14);
  highlight.scale.setScalar(0.18); // small central glint (radius ≤0.10)
  lensStack.add(glintGreen, glintViolet, highlight);

  // Every fade-driven material with its resting opacity (built once → no alloc).
  const lensMats = [
    { m: barrelMat, b: BARREL_BASE },
    { m: knurlMat, b: KNURL_BASE },
    { m: bezelMat, b: BEZEL_BASE },
    { m: domeRingMat, b: DOME_RING_BASE },
    { m: textRingMat, b: TEXTRING_BASE },
    { m: glassMat, b: GLASS_BASE },
    { m: glintGreenMat, b: GLINT_G_BASE },
    { m: glintVioletMat, b: GLINT_V_BASE },
    { m: highlightMat, b: HIGHLIGHT_BASE },
  ];
  scene.add(lens);

  /* ==========================================================
     DÉTECTER (chapter 2) — three drifting celestial "objects"
     (ringed planet, moon, star) orbiting near origin, each wrapped
     in an accent detection bounding box (LineSegments/EdgesGeometry,
     additive) with a class-name + confidence label sprite above its
     top edge. Boxes lock in with a staggered opacity ramp + scale-pop
     as p crosses each threshold (0.30 / 0.35 / 0.40); the labels
     appear and fade with their boxes. All geometry/materials/label
     textures built once here; every visual is a pure function of p in
     updateChapter2 → reverse scroll replays it backwards.
     ========================================================== */
  const detectGroup = new THREE.Group();
  detectGroup.visible = false;

  // Class-label sprite factory — one static CanvasTexture per label,
  // rendered at 2× and scaled down so the mono text stays crisp. No
  // per-frame redraws; only the sprite material opacity is animated.
  function makeDetectLabel(text) {
    const SS = 2; // supersample factor for crisp text
    const font = '500 ' + 48 * SS + 'px "JetBrains Mono", monospace';
    const cv = document.createElement('canvas');
    let ctx = cv.getContext('2d');
    ctx.font = font;
    const tw = Math.ceil(ctx.measureText(text).width);
    cv.width = tw + 24 * SS; // horizontal padding
    cv.height = Math.ceil(72 * SS); // room for ascenders/accents
    ctx = cv.getContext('2d'); // resizing the canvas cleared its state
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#A3E635'; // ACCENT text on transparent background
    ctx.fillText(text, cv.width / 2, cv.height / 2);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    const h = 0.17; // world height of the label
    sprite.scale.set(h * (cv.width / cv.height), h, 1);
    return { sprite, mat };
  }

  const _detBox = [ // bounding-box dims ≈ 1.2× each celestial object
    [0.78, 0.78, 0.78], // ringed planet
    [0.64, 0.64, 0.64], // moon
    [0.5, 0.5, 0.5], //   star
  ];
  const _detBase = [ // fixed orbit centres, in front of the ch2 view
    [-1.2, 0.15, 0.25],
    [1.15, 0.7, -0.3],
    [0.2, -0.55, 0.5],
  ];
  const _detLock = [0.30, 0.35, 0.40]; // per-box lock thresholds (stagger)
  const _detLabelText = ['planète 0.94', 'lune 0.89', 'étoile 0.91'];

  // Object meshes — each returns { obj, mats, ring? }. `obj` is a Group so
  // the planet's ring drifts/rotates with it; moon/star are lone spheres in
  // a group for a uniform interface. Materials fade with objFade (below).
  function makeCelestial(i) {
    const obj = new THREE.Group();
    const mats = [];
    let ring = null;
    if (i === 0) {
      // Ringed planet — rusty-orange body + pale sand ring tilted ~25°.
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xC97B4A, roughness: 0.8, transparent: true, opacity: 0 });
      obj.add(new THREE.Mesh(new THREE.SphereGeometry(0.30, 32, 24), bodyMat));
      ring = new THREE.MeshStandardMaterial({ color: 0xD9C9A8, roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0 });
      const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.37, 0.52, 64), ring);
      ringMesh.rotation.x = Math.PI / 2 + 0.44; // horizontal, tilted ~25°
      obj.add(ringMesh);
      mats.push(bodyMat);
    } else if (i === 1) {
      // Moon — pale gray-blue, matte.
      const moonMat = new THREE.MeshStandardMaterial({ color: 0x9FB2C4, roughness: 0.95, transparent: true, opacity: 0 });
      obj.add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 24), moonMat));
      mats.push(moonMat);
    } else {
      // Star — small warm white-gold glowing sphere.
      const starMat = new THREE.MeshStandardMaterial({
        color: 0xFFE9B8, emissive: 0xFFD27A, emissiveIntensity: 1.2, roughness: 0.5, transparent: true, opacity: 0,
      });
      obj.add(new THREE.Mesh(new THREE.SphereGeometry(0.20, 32, 24), starMat));
      mats.push(starMat);
    }
    return { obj, mats, ring };
  }

  const detects = [];
  for (let i = 0; i < 3; i++) {
    const { obj, mats, ring } = makeCelestial(i);
    detectGroup.add(obj);
    const bd = _detBox[i];
    const boxMat = new THREE.LineBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const box = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(bd[0], bd[1], bd[2])),
      boxMat
    );
    detectGroup.add(box);
    const { sprite: label, mat: labelMat } = makeDetectLabel(_detLabelText[i]);
    detectGroup.add(label);
    detects.push({
      mesh: obj, // Group: .position / .rotation drive it like the old mesh
      mats, // object surface materials — fade together with objFade
      ringMat: ring, // planet ring only (slightly transparent), else null
      box,
      boxMat,
      label,
      labelMat,
      boxTop: bd[1] / 2, // half-height → label sits just above the top edge
      bx: _detBase[i][0],
      by: _detBase[i][1],
      bz: _detBase[i][2],
      lock: _detLock[i],
      phase: i * 2.1, // desync the idle orbits
    });
  }
  scene.add(detectGroup);

  /* ==========================================================
     COMPRESSER (chapter 3) — the chip the compressed field docks
     into: a dark physical slab with an emissive accent top plane
     and accent edge-glow lines. Hidden (scale 0) until m2 crosses
     0.5, then pops to 1. Task 5c re-docks this group — hence the
     persistent `chipGroup` reference (mirrors `lens`).
     ========================================================== */
  const chipGroup = new THREE.Group();
  chipGroup.position.set(0, 0.6, 0);
  chipGroup.scale.setScalar(0.0001);
  chipGroup.visible = false;
  const chipBodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x090b0e,
    metalness: 0.5,
    roughness: 0.4,
  });
  chipGroup.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.5), chipBodyMat));
  const chipTopMat = new THREE.MeshStandardMaterial({
    color: 0x0a0d10,
    emissive: ACCENT,
    emissiveIntensity: 0.9,
  });
  const chipTop = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 1.42), chipTopMat);
  chipTop.rotation.x = -Math.PI / 2;
  chipTop.position.y = 0.061; // just above the slab's top face
  chipGroup.add(chipTop);
  const chipEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 0.12, 1.5)),
    new THREE.LineBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  chipGroup.add(chipEdges);
  scene.add(chipGroup);

  /* ==========================================================
     DÉPLOYER (chapter 4) — a cursor-tracking robotic camera-arm.
     Ported hierarchy/pose math from the old hero (three-scene.js),
     restyled as a FANUC-style industrial robot: signature yellow
     painted-metal links, near-black joint covers / motor housings,
     sparing emissive accent detail, and a WIDE 2-lens stereo 3D
     camera head (no scan beam/frustum, no HUD ring, no floor grid).
     The compressed chip (ch3) docks onto the head socket here.

     Everything is driven from p:
       • group hidden until p>0.72; rises y −1.5→0 + fades in 0.75→0.85
         (materials transparent, a shared opacity driven per frame)
       • chip lerps from its ch3 home to the moving head socket over
         0.78→0.90 while shrinking 1→0.4 (no reparenting)
       • iris wakes (emissive 0→1.1) over 0.88→0.94
       • cursor tracking blends in with w = smoothstep(0.9,1) so the
         arm holds a neutral rest pose below w=0 and un-blends on
         reverse scrub — no snap at the edges.
     ========================================================== */
  const ARM_X = 0; // arm base world position (yaw/dock math is relative to it)
  const ARM_Z = -1;
  const ARM_SCALE = 0.62; // composes with camera keyframe 5 ("arm wide")

  const armGroup = new THREE.Group();
  armGroup.position.set(ARM_X, 0, ARM_Z);
  armGroup.scale.setScalar(ARM_SCALE);
  armGroup.visible = false;
  scene.add(armGroup);

  // Materials — FANUC industrial look: signature yellow painted-metal body,
  // near-black joint covers / motor housings, sparing emerald accent detail,
  // dark head glass, and the shared emerald iris. All transparent so the intro
  // fades the whole arm via one shared opacity ramp. Every ref goes into
  // armMats (per-frame loop) → nothing left invisible after the fade.
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xF2A900, metalness: 0.35, roughness: 0.45, transparent: true, opacity: 0,
  });
  const jointMat = new THREE.MeshPhysicalMaterial({
    color: 0x17181a, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0,
  });
  const accentStripMat = new THREE.MeshStandardMaterial({
    color: 0x0a0d10, emissive: ACCENT, emissiveIntensity: 0.6, transparent: true, opacity: 0,
  });
  const headGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x05070a, metalness: 0.6, roughness: 0.08, transparent: true, opacity: 0,
  });
  const irisMat = new THREE.MeshStandardMaterial({
    color: ACCENT, emissive: ACCENT, emissiveIntensity: 0, transparent: true, opacity: 0,
  });
  const armMats = [bodyMat, jointMat, accentStripMat, headGlassMat, irisMat];

  function armMesh(geo, mat, parent) {
    const m = new THREE.Mesh(geo, mat);
    parent.add(m);
    return m;
  }

  // Static base (does not rotate) — wide black bolt-flange at the floor + a
  // heavy black pedestal the yellow turret sits on.
  const baseFlange = armMesh(new THREE.CylinderGeometry(1.4, 1.55, 0.12, 40), jointMat, armGroup);
  baseFlange.position.y = 0.06;
  const plinth = armMesh(new THREE.CylinderGeometry(0.9, 1.1, 0.42, 32), jointMat, armGroup);
  plinth.position.y = 0.3;

  // Yawing J1 turret — chunky, rounded, low yellow cylinder + one sparing
  // emerald accent ring.
  const yawBase = new THREE.Group();
  yawBase.position.y = 0.35;
  armGroup.add(yawBase);
  const turret = armMesh(new THREE.CylinderGeometry(1.0, 1.08, 0.5, 40), bodyMat, yawBase);
  turret.position.y = 0.3;
  const baseRing = armMesh(new THREE.TorusGeometry(1.0, 0.035, 12, 48), accentStripMat, yawBase);
  baseRing.position.y = 0.5;
  baseRing.rotation.x = Math.PI / 2;

  // Shoulder (J2, pitch about x) — broad yellow housing with a big black
  // circular joint cover on the side (the classic FANUC offset read).
  const shoulder = new THREE.Group();
  shoulder.position.y = 0.62;
  yawBase.add(shoulder);
  const shoulderHousing = armMesh(new THREE.BoxGeometry(0.95, 0.82, 0.66), bodyMat, shoulder);
  const shoulderCover = armMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 32), jointMat, shoulder);
  shoulderCover.rotation.z = Math.PI / 2; // disc faces along the J2 axis (+x)
  shoulderCover.position.set(0.48, 0, 0);

  // Upper arm (bicep) — broad flat-sided yellow box link, offset to one side.
  const UPPER_LEN = 2.0;
  const upper = armMesh(new THREE.BoxGeometry(0.5, UPPER_LEN, 0.34), bodyMat, shoulder);
  upper.position.set(0.08, UPPER_LEN / 2, 0);

  // Elbow (J3, pitch) — black boxy motor housing behind the joint + a black
  // cylindrical joint cover spanning the axis (circular covers both sides).
  const elbow = new THREE.Group();
  elbow.position.y = UPPER_LEN;
  shoulder.add(elbow);
  const elbowMotor = armMesh(new THREE.BoxGeometry(0.62, 0.56, 0.5), jointMat, elbow);
  elbowMotor.position.set(0, 0, -0.2);
  const elbowCover = armMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.6, 28), jointMat, elbow);
  elbowCover.rotation.z = Math.PI / 2; // spans the elbow axis (+x)

  // Forearm — tapering yellow link + a black cable-conduit cylinder along top.
  const FORE_LEN = 1.7;
  const fore = armMesh(new THREE.BoxGeometry(0.4, FORE_LEN, 0.3), bodyMat, elbow);
  fore.position.y = FORE_LEN / 2;
  const conduit = armMesh(new THREE.CylinderGeometry(0.07, 0.07, FORE_LEN * 0.82, 16), jointMat, elbow);
  conduit.position.set(0, FORE_LEN / 2, 0.2); // runs along the forearm's top

  // Wrist (pitch) — compact black cylinder joint + a small yellow flange.
  const wrist = new THREE.Group();
  wrist.position.y = FORE_LEN;
  elbow.add(wrist);
  const wristJoint = armMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 24), jointMat, wrist);
  const wristFlange = armMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 24), bodyMat, wrist);
  wristFlange.position.y = 0.16;

  // Stereo 3D camera head (end effector) — a WIDE dark housing on the flange
  // with TWO lens barrels side by side, each exiting along the arm axis (+y):
  // dark barrel, near-black glass disc, glowing emerald iris (the "wake"
  // irises, shared material). The chip (ch3) docks onto this head socket.
  const head = new THREE.Group();
  head.position.y = 0.2;
  wrist.add(head);
  const mount = armMesh(new THREE.CylinderGeometry(0.16, 0.2, 0.1, 20), jointMat, head);
  mount.position.y = 0.05;
  const housing = armMesh(new THREE.BoxGeometry(0.9, 0.3, 0.4), jointMat, head);
  housing.position.y = 0.27;
  const headStripe = armMesh(new THREE.BoxGeometry(0.92, 0.04, 0.03), accentStripMat, head);
  headStripe.position.set(0, 0.27, 0.2);
  // A tiny status LED on a housing corner (shares the iris material).
  const led = armMesh(new THREE.SphereGeometry(0.03, 12, 12), irisMat, head);
  led.position.set(0.4, 0.27, 0.21);
  // Two lens barrels side by side; irises share irisMat so BOTH wake together.
  const R = 0.18;
  function makeLens(x) {
    const barrel = armMesh(new THREE.CylinderGeometry(R, R * 0.9, 0.3, 28), jointMat, head);
    barrel.position.set(x, 0.5, 0);
    const glassDisc = armMesh(new THREE.CylinderGeometry(R * 0.82, R * 0.82, 0.04, 28), headGlassMat, head);
    glassDisc.position.set(x, 0.66, 0);
    const iris = armMesh(new THREE.CylinderGeometry(R * 0.34, R * 0.34, 0.05, 20), irisMat, head);
    iris.position.set(x, 0.665, 0); // iris glow driven via irisMat in updateChapter4
  }
  makeLens(-0.2);
  makeLens(0.2);

  // ---- Chapter-4 rest pose + tracking state (no per-frame alloc) ----------
  const REST = { yaw: 0, shoulder: 0.35, elbow: -0.7, wrist: 0.9 };
  const cur = { yaw: REST.yaw, shoulder: REST.shoulder, elbow: REST.elbow, wrist: REST.wrist };

  const pointer = { x: 0, y: 0 };
  let lastMove = performance.now() - 5000; // start "idle" so it roams before first move
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const aimPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.2); // z = 2.2
  const aimTarget = new THREE.Vector3(0, 1.8, 2.2);
  const headPos = new THREE.Vector3();
  const headDir = new THREE.Vector3();
  const socketV = new THREE.Vector3();
  const chipHome = new THREE.Vector3(0, 0.6, 0); // chip's ch3 resting position

  function onPointerMove(e) {
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    lastMove = performance.now();
  }
  window.addEventListener('mousemove', onPointerMove, { passive: true });

  /* ==========================================================
     CAMERA RIG — 5 keyframes, smoothstepped between bounds.
     far-orbit → lens close-up → detection field → chip macro →
     arm wide. Chapters 2–4 content arrives later; the path is
     owned here now so the scrub reads cinematic end-to-end.
     ========================================================== */
  const KEYS = [
    { at: 0.0, pos: new THREE.Vector3(0, 2.5, 12), look: new THREE.Vector3(0, 0, 0) },
    { at: 0.25, pos: new THREE.Vector3(0, 0.35, 4.1), look: new THREE.Vector3(0, 0, 0) },
    { at: 0.5, pos: new THREE.Vector3(3.6, 1.8, 6.2), look: new THREE.Vector3(0, 0.3, 0) },
    { at: 0.75, pos: new THREE.Vector3(0, 1.5, 3.2), look: new THREE.Vector3(0, 0.55, 0) },
    { at: 1.0, pos: new THREE.Vector3(2.6, 2.3, 7.6), look: new THREE.Vector3(0, 1.1, -1) },
  ];
  const _look = new THREE.Vector3(); // reused every frame — no alloc in loop

  function setCamera(p) {
    // Locate the surrounding keyframe pair.
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const t = smoothstep(a.at, b.at, p);
    camera.position.lerpVectors(a.pos, b.pos, t);
    _look.lerpVectors(a.look, b.look, t);
    camera.lookAt(_look);
  }

  /* ==========================================================
     CARDS — driven per-frame (not by CSS transitions).
     Each card composes its Tailwind centering transform (which we
     must preserve) with the reveal translateY. is-live toggles at
     k > 0.5. Only the currently-active card writes to the DOM.
     ========================================================== */
  const mqSm = window.matchMedia('(min-width:640px)'); // Tailwind `sm`
  const cardEls = Array.from(document.querySelectorAll('.story-card'));
  const cards = cardEls.map((el, idx) => {
    // Kill any inherited transition so per-frame writes aren't smeared.
    el.style.transition = 'none';
    const win = CARD_WINDOWS[idx] || CARD_WINDOWS[CARD_WINDOWS.length - 1];
    // A window that starts at 0 is the landing hero: it must be fully visible
    // on first paint, so suppress its leading-edge fade (trailing fade stays).
    return { el, w0: win[0], w1: win[1], noLeadIn: win[0] === 0, base: '', lastK: -1, live: false };
  });

  function computeCardBases() {
    const wide = mqSm.matches;
    for (const c of cards) {
      const cl = c.el.classList;
      let t = '';
      if (cl.contains('-translate-x-1/2') || (wide && cl.contains('sm:-translate-x-1/2'))) {
        t += 'translateX(-50%) ';
      }
      if (cl.contains('-translate-y-1/2') || (wide && cl.contains('sm:-translate-y-1/2'))) {
        t += 'translateY(-50%) ';
      }
      c.base = t;
    }
  }
  computeCardBases();

  function updateCards(p) {
    for (const c of cards) {
      // k = smooth ease-in near w0, ease-out near w1; 0 outside the window.
      // Hero card (w0===0) skips the ease-in so it's fully lit at p=0.
      const lead = c.noLeadIn ? 1 : smoothstep(c.w0, c.w0 + CARD_FADE, p);
      const k = lead * (1 - smoothstep(c.w1 - CARD_FADE, c.w1, p));

      // Skip DOM writes for a card that's dark this frame and was last frame.
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
     SCROLL → PROGRESS
     pTarget from scrollY vs the #story section geometry; eased into
     pCur per frame (frame-rate independent) for a smooth scrub.
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
  pCur = pTarget; // start settled — no intro lurch

  /* ==========================================================
     PER-CHAPTER UPDATES — dispatched from update(dt).
     Chapter 1 is implemented here; 2/3/4 are clean stubs that
     Tasks 5b/5c fill (detection boxes, compression morph, arm+dock).
     ========================================================== */
  function updateChapter1(p, t) {
    // World "comes into focus": fog thins as we move through the lens.
    scene.fog.density = THREE.MathUtils.lerp(FOG_START, FOG_FOCUS, smoothstep(0, 0.25, p));

    // Particle field: gentle ambient rotation (VOIR — the world drifts).
    particles.rotation.y = t * 0.02;

    // Lens: subtle scroll sync + idle tilt, then fade out as the camera
    // passes through it. All p-derived and reversible.
    const lensOpacity = 1 - smoothstep(LENS_FADE_IN, LENS_FADE_OUT, p);
    lens.visible = lensOpacity > 0.001;
    if (lens.visible) {
      // Scroll sync: the WHOLE stack telescopes + rotates together as one
      // unit; the knurled grip adds its own extra spin on top.
      const zoomT = smoothstep(0.02, 0.2, p);
      lensStack.position.z = zoomT * 0.18;
      lensStack.rotation.z = zoomT * 0.25;
      lensKnurl.rotation.z = zoomT * 1.2;
      // Faint idle tilt so the barrel reads as a physical object.
      lens.rotation.x = Math.sin(t * 0.3) * 0.03;
      // Fade: every lens material dims from its resting opacity to 0.
      for (let i = 0; i < lensMats.length; i++) {
        lensMats[i].m.opacity = lensMats[i].b * lensOpacity;
      }
    }
  }

  // DÉTECTER (chapter 2) — objects drift, boxes lock with a staggered
  // ramp + scale-pop, then everything fades out over p 0.5–0.56. Pure
  // function of p (+ time for the idle orbit) → reverse-scroll symmetric.
  function updateChapter2(p, t) {
    // Objects fade in 0.25→0.30, fade out 0.50→0.56.
    const objFade = smoothstep(0.25, 0.3, p) * (1 - smoothstep(0.5, 0.56, p));
    const vis = objFade > 0.001;
    detectGroup.visible = vis;
    if (!vis) return; // fully outside the chapter → skip all writes

    const outFade = 1 - smoothstep(0.5, 0.56, p);
    for (let i = 0; i < detects.length; i++) {
      const d = detects[i];
      // Object surfaces fade in/out together with objFade (ring kept slightly
      // transparent for the pale-sand look).
      for (let m = 0; m < d.mats.length; m++) d.mats[m].opacity = objFade;
      if (d.ringMat) d.ringMat.opacity = objFade * 0.7;

      // Slow idle orbit around the fixed centre (small amplitude → stays framed).
      const ang = t * 0.25 + d.phase;
      const x = d.bx + Math.cos(ang) * 0.18;
      const y = d.by + Math.sin(ang * 0.8) * 0.12;
      const z = d.bz + Math.sin(ang) * 0.18;
      d.mesh.position.set(x, y, z);
      d.mesh.rotation.y = t * 0.4 + d.phase;
      d.mesh.rotation.x = t * 0.25;
      d.box.position.set(x, y, z); // box is axis-aligned, tracks position only

      // Staggered lock: opacity ramps to 0.7 as p crosses this box's threshold.
      const lockRamp = smoothstep(d.lock - 0.05, d.lock, p);
      d.boxMat.opacity = lockRamp * 0.7 * outFade;
      // Tiny scale-pop right at the lock — a narrow, symmetric p-derived bump.
      const pop = Math.exp(-Math.pow((p - d.lock) / 0.015, 2)) * 0.15;
      d.box.scale.setScalar(1 + pop);

      // Label rides just above the box top edge; its opacity follows the same
      // staggered lock → out-fade curve as the box (appears with it, fades with it).
      d.label.position.set(x, y + d.boxTop + 0.14, z);
      d.labelMat.opacity = lockRamp * outFade;
    }
  }

  // COMPRESSER (chapter 3) — m1/m2 are set in update() before
  // updateParticles(); here we ease the field's opacity down (mass
  // "enters" the chip) and pop the chip in as m2 crosses 0.5.
  function updateChapter3() {
    // Particle opacity: base 0.75 → 0.15 as the field collapses into the chip.
    particleMat.opacity = 0.75 + (0.15 - 0.75) * m2;

    // Chip scale pops 0→1 around m2=0.5 with a small overshoot; never negative.
    const grow = smoothstep(0.5, 0.75, m2);
    const s = grow * (1 + Math.exp(-Math.pow((m2 - 0.58) / 0.06, 2)) * 0.1);
    chipGroup.visible = s > 0.001;
    if (chipGroup.visible) chipGroup.scale.setScalar(s);
  }

  // DÉPLOYER (chapter 4) — arm rises + fades in, the chip docks onto the
  // head socket, the iris wakes, and cursor tracking blends in over the last
  // sliver of scroll. All p-derived except the eased tracking pose (which is
  // the interactive "wake" and un-blends to rest as p falls — no snap).
  function updateChapter4(p, t, dt) {
    const armVisible = p > 0.72;
    armGroup.visible = armVisible;

    // --- Dock: chip travels from its ch3 home to the moving head socket. ---
    // Done regardless of arm visibility so reverse scroll always restores the
    // chip's home position (ch3 owns its scale/visibility below the window).
    const dockT = smoothstep(0.78, 0.9, p);
    if (dockT > 0) {
      head.getWorldPosition(socketV); // preallocated — no alloc
      chipGroup.position.lerpVectors(chipHome, socketV, dockT);
      chipGroup.scale.setScalar(1 - 0.6 * dockT); // 1 → 0.4
      chipGroup.visible = true;
    } else {
      chipGroup.position.copy(chipHome); // hand scale/visibility back to ch3
    }

    if (!armVisible) return;

    // --- Intro: rise y −1.5 → 0 and fade the whole arm in over 0.75–0.85. ---
    const intro = smoothstep(0.75, 0.85, p);
    armGroup.position.y = -1.5 + 1.5 * intro;
    for (let i = 0; i < armMats.length; i++) armMats[i].opacity = intro;

    // --- Iris wake: emissive 0 → 1.1 over 0.88–0.94 (+ a faint tracking flicker). ---
    const wake = smoothstep(0.88, 0.94, p);

    // --- Cursor-tracking influence: 0 (rest pose) → 1 (fully tracking). ---
    const w = smoothstep(0.9, 1, p);

    // Target point: raycast the pointer onto plane z=2.2, or an idle figure-8.
    const idle = performance.now() - lastMove > 1400;
    if (idle) {
      aimTarget.set(Math.sin(t * 0.35) * 2.2, 1.8 + Math.sin(t * 0.78) * 0.9, 2.2);
    } else {
      ndc.set(pointer.x, -pointer.y);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(aimPlane, aimTarget)) aimTarget.set(0, 1.8, 2.2);
      aimTarget.x = clamp(aimTarget.x, -3.2, 3.2);
      aimTarget.y = clamp(aimTarget.y, 0.4, 3.6);
    }

    // Posture solve (relative to the arm base), then blend rest ↔ tracking by w.
    const tgtYaw = Math.atan2(aimTarget.x - ARM_X, aimTarget.z - ARM_Z);
    const hN = clamp((aimTarget.y - 0.4) / 3.2, 0, 1); // 0 low → 1 high
    const tgtShoulder = 0.55 - hN * 0.45;
    const tgtElbow = -0.95 + hN * 0.5;
    const desYaw = REST.yaw + (tgtYaw - REST.yaw) * w;
    const desShoulder = REST.shoulder + (tgtShoulder - REST.shoulder) * w;
    const desElbow = REST.elbow + (tgtElbow - REST.elbow) * w;

    const k = 1 - Math.pow(0.0001, dt); // frame-rate-independent ease (body)
    cur.yaw += (desYaw - cur.yaw) * k;
    cur.shoulder += (desShoulder - cur.shoulder) * k;
    cur.elbow += (desElbow - cur.elbow) * k;
    yawBase.rotation.y = cur.yaw;
    shoulder.rotation.x = cur.shoulder;
    elbow.rotation.x = cur.elbow;

    // Analytic wrist solve: pitch the head so the lens axis (+y) hits the
    // target, then blend to rest by w and ease (snappier than the body).
    wrist.getWorldPosition(headPos);
    headDir.copy(aimTarget).sub(headPos);
    const sy = Math.sin(cur.yaw);
    const cy = Math.cos(cur.yaw);
    const depthInPlane = headDir.x * sy + headDir.z * cy;
    const phi = Math.atan2(depthInPlane, headDir.y);
    const solvedWrist = clamp(phi - (cur.shoulder + cur.elbow), -0.25, 2.2);
    const desWrist = REST.wrist + (solvedWrist - REST.wrist) * w;
    const kW = 1 - Math.pow(0.00001, dt);
    cur.wrist += (desWrist - cur.wrist) * kW;
    wrist.rotation.x = cur.wrist;

    // Iris life: wake ramp sets the floor; a faint pulse breathes once tracking.
    irisMat.emissiveIntensity = wake * (1.1 + w * 0.3 * Math.sin(t * 3));
  }

  /* ==========================================================
     MAIN UPDATE — everything derives from pCur (reversible scrub)
     ========================================================== */
  function update(dt) {
    readScroll();
    // Frame-rate-independent ease toward the scroll target.
    pCur += (pTarget - pCur) * (1 - Math.pow(0.001, dt));

    const p = pCur;
    const t = performance.now() * 0.001; // seconds, for ambient motion

    setCamera(p);
    updateCards(p);

    // COMPRESSER morph weights — set here (before updateParticles, which
    // reads them). Pure functions of p → reverse scroll returns them to 0
    // and the field relaxes back to `cloud`. The 0.46 start is a deliberate
    // slight overlap with ch3's card window.
    m1 = smoothstep(0.46, 0.6, p); // cloud → lattice
    m2 = smoothstep(0.6, 0.74, p); // lattice → chip
    updateParticles();

    updateChapter1(p, t);
    updateChapter2(p, t);
    updateChapter3(p, t);
    updateChapter4(p, t, dt);
  }

  function render() {
    renderer.render(scene, camera);
  }

  /* ---- Animation loop --------------------------------------- */
  const clock = new THREE.Clock();
  let visible = true;
  let frameId = null;

  function loop() {
    frameId = requestAnimationFrame(loop);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt);
    render();
  }

  /* ---- Resize ----------------------------------------------- */
  function onResize() {
    width = container.clientWidth || window.innerWidth || 1;
    height = container.clientHeight || window.innerHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    measureStory();
    computeCardBases(); // sm breakpoint may have crossed
  }
  let resizeObs = null;
  if ('ResizeObserver' in window) {
    resizeObs = new ResizeObserver(onResize);
    resizeObs.observe(container);
  } else {
    window.addEventListener('resize', onResize, { passive: true });
  }

  /* ---- Pause when the sticky stage is off-screen ------------ */
  const sticky = document.querySelector('.story-sticky') || container;
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) clock.getDelta(); // drop accumulated time on resume
      },
      { threshold: 0.0 }
    );
    io.observe(sticky);
  }

  /* ---- Pause on hidden tab ---------------------------------- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      visible = false;
    } else {
      visible = true;
      clock.getDelta();
    }
  });

  loop();
}

function boot() {
  try {
    init();
  } catch (err) {
    // Never let the story stage break the rest of the page — fall back
    // to the static stacked cards.
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
