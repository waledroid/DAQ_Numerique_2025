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
const ACCENT = 0x34d3a6; // volt-emerald — the ONE accent, never 0xa3e635
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
     LENS (chapter 1) — a dark metal ring + inner transmission
     disc floating at origin; the "eye" the world focuses through.
     ========================================================== */
  const lens = new THREE.Group();
  const ringMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c0e11,
    metalness: 0.9,
    roughness: 0.25,
    transparent: true,
    opacity: 1,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.07, 24, 96), ringMat);
  lens.add(ring);
  const discMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.92,
    thickness: 0.5,
    roughness: 0.12,
    metalness: 0,
    transparent: true,
    opacity: 1,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.55, 96), discMat);
  disc.position.z = -0.01;
  lens.add(disc);
  scene.add(lens);

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

    // Lens: subtle rotation, then fade out as the camera passes through it.
    const lensOpacity = 1 - smoothstep(LENS_FADE_IN, LENS_FADE_OUT, p);
    lens.visible = lensOpacity > 0.001;
    if (lens.visible) {
      lens.rotation.z = t * 0.05;
      lens.rotation.x = Math.sin(t * 0.3) * 0.04;
      ringMat.opacity = lensOpacity;
      discMat.opacity = lensOpacity;
    }
  }

  // Stubs — filled by Task 5b (chapters 2 & 3) and Task 5c (chapter 4).
  function updateChapter2(_p, _t) {} // DÉTECTER — bounding boxes
  function updateChapter3(_p, _t) {} // COMPRESSER — cloud→lattice→chip morph
  function updateChapter4(_p, _t) {} // DÉPLOYER — arm rise, dock, cursor wake

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

    // Morph weights (chapter 3 sets these; 0 for now) → field stays cloud.
    updateParticles();

    updateChapter1(p, t);
    updateChapter2(p, t);
    updateChapter3(p, t);
    updateChapter4(p, t);
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
