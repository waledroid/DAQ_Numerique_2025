/* ============================================================
   LIQUID OPTICS — shared depth backdrop (glass-bg.js)
   Renders a slow-drifting field of soft emerald bokeh discs into
   every [data-glass-bg] element on the page. Used behind sub-page
   hero sections (about/experience/projects/lab/contact) to give a
   subtle 3D "depth of field" backdrop without pulling attention.
   ES module — loaded via <script type="module"> with an importmap
   exposing "three". No external assets beyond the CDN three build.

   Design notes:
   - ~120 points split across 3 THREE.Points groups (near/mid/far)
     for a cheap parallax-of-depth read; sizes 0.25 / 0.5 / 0.9.
   - Single CanvasTexture sprite: 64x64 radial gradient, volt-lime
     (#A3E635 family) fading to transparent. Additive blending,
     depthWrite disabled, opacity kept low (<= 0.35) so the field
     reads as soft bokeh rather than a starfield.
   - Positions randomised in a 14x8x6 box centered on the origin.
     Slow upward y-drift per point (speed varies per point), wraps
     from the top of the box back to the bottom.
   - The whole field eases toward the pointer position for a very
     subtle parallax (+-0.4 units), lerped smoothly frame to frame.
   - Robust: no-ops silently if no [data-glass-bg] host, or WebGL
     is unavailable. Renders a single static frame under
     prefers-reduced-motion. Pauses when the host scrolls
     off-screen (IntersectionObserver). DPR capped at 2.
   ============================================================ */

import * as THREE from 'three';

const ACCENT = 'rgba(163,230,53,0.8)'; // #A3E635 family, radial sprite core
const BOX = { x: 14, y: 8, z: 6 };
// ~120 particles total, split across 3 depth groups (near/mid/far).
const GROUPS = [
  { size: 0.25, count: 40, speed: 0.6 },
  { size: 0.5, count: 40, speed: 1.0 },
  { size: 0.9, count: 40, speed: 1.5 },
];
const PARALLAX_RANGE = 0.4; // +/- units the field eases toward the pointer

function makeSpriteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, ACCENT);
  gradient.addColorStop(1, 'rgba(163,230,53,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function initInstance(container, sharedTexture) {
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // transparent — page bg shows through
      powerPreference: 'low-power',
    });
  } catch (err) {
    return; // WebGL unavailable — silent no-op, host stays empty
  }
  if (!renderer || !renderer.getContext()) return;

  // ---- Sizing --------------------------------------------------------
  let width = container.clientWidth || 1;
  let height = container.clientHeight || 1;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.inset = '0';
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }
  container.appendChild(renderer.domElement);

  // ---- Scene / camera --------------------------------------------------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 50);
  camera.position.set(0, 0, 7);
  camera.lookAt(0, 0, 0);

  // ---- Points groups -----------------------------------------------------
  const pointsMeshes = [];
  const halfX = BOX.x / 2;
  const halfY = BOX.y / 2;
  const halfZ = BOX.z / 2;

  for (const group of GROUPS) {
    const positions = new Float32Array(group.count * 3);
    const speeds = new Float32Array(group.count);
    for (let i = 0; i < group.count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * BOX.x;
      positions[i * 3 + 1] = (Math.random() - 0.5) * BOX.y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * BOX.z;
      speeds[i] = group.speed * (0.7 + Math.random() * 0.6);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: group.size,
      map: sharedTexture,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const mesh = new THREE.Points(geometry, material);
    scene.add(mesh);
    pointsMeshes.push({ mesh, positions, speeds, count: group.count });
  }

  // ---- Pointer parallax --------------------------------------------------
  const pointer = { x: 0, y: 0 };
  const field = { x: 0, y: 0 };

  function onPointerMove(e) {
    const rect = container.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  }
  if (!reduceMotion) {
    window.addEventListener('mousemove', onPointerMove, { passive: true });
  }

  // ---- Animation loop ------------------------------------------------
  const clock = new THREE.Clock();
  let visible = true;
  let frameId = null;

  function update(dt) {
    // Ease the whole field toward the pointer, +/- PARALLAX_RANGE units.
    const targetX = pointer.x * PARALLAX_RANGE;
    const targetY = -pointer.y * PARALLAX_RANGE;
    const k = reduceMotion ? 1 : 1 - Math.pow(0.0001, dt);
    field.x += (targetX - field.x) * k;
    field.y += (targetY - field.y) * k;

    for (const group of pointsMeshes) {
      const { mesh, positions, speeds, count } = group;
      if (!reduceMotion) {
        for (let i = 0; i < count; i++) {
          const idx = i * 3 + 1;
          positions[idx] += 0.0004 * dt * 1000 * speeds[i];
          if (positions[idx] > halfY) {
            positions[idx] -= BOX.y;
          }
        }
        mesh.geometry.attributes.position.needsUpdate = true;
      }
      mesh.position.x = field.x;
      mesh.position.y = field.y;
    }
  }

  function render() {
    renderer.render(scene, camera);
  }

  function loop() {
    frameId = requestAnimationFrame(loop);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt);
    render();
  }

  // ---- Resize -----------------------------------------------------------
  function onResize() {
    width = container.clientWidth || 1;
    height = container.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    if (reduceMotion) render();
  }
  let resizeObs = null;
  if ('ResizeObserver' in window) {
    resizeObs = new ResizeObserver(onResize);
    resizeObs.observe(container);
  } else {
    window.addEventListener('resize', onResize);
  }

  // ---- Reduced motion: one static frame, no loop -------------------------
  if (reduceMotion) {
    update(0);
    render();
    return;
  }

  // ---- Pause when off-screen ----------------------------------------------
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) clock.getDelta(); // drop accumulated time on resume
      },
      { threshold: 0.01 }
    );
    io.observe(container);
  }

  loop();
}

function init() {
  const containers = document.querySelectorAll('[data-glass-bg]');
  if (!containers.length) return; // page doesn't use the backdrop — no-op

  const sharedTexture = makeSpriteTexture();
  if (!sharedTexture) return;

  for (const container of containers) {
    initInstance(container, sharedTexture);
  }
}

function boot() {
  try {
    init();
  } catch (err) {
    // Never let the backdrop break the rest of the page
    if (window.console && console.warn) {
      console.warn('[glass-bg] disabled:', err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
