/* ============================================================
   EDGE VISION — Home hero 3D scene (three-scene.js)
   Renders a metallic robotic arm into #hero-canvas that tracks
   the cursor (echoing the candidate's robotics + CV tracking work).
   ES module — loaded via <script type="module"> with an importmap
   exposing "three" and "three/addons/". No external assets.

   Design notes:
   - Near-black / transparent canvas so the page bg shows through.
   - Volt-green (#A3E635) key + emerald (#34D399) rim lighting.
   - Reflective grid floor, soft fog, dark metallic materials.
   - Base yaw + shoulder pitch ease toward the cursor; idle breathing
     sway when the mouse is still.
   - End effector is a stereo camera head: two big lens barrels with
     glowing irises and a faint scan frustum — the arm "looks" at
     the cursor rather than gripping.
   - A floating wireframe scan-ring + bounding box reinforce the
     vision-lab theme.
   - Robust: no-ops silently if container missing or WebGL absent.
   - Pauses when off-screen (IntersectionObserver) and renders a
     single static frame under prefers-reduced-motion.
   ============================================================ */

import * as THREE from 'three';

const ACCENT = 0xa3e635; // volt-lime key light
const EMERALD = 0x34d399; // secondary green rim
const INK = 0x08090b; // page background / fog

function init() {
  const container = document.getElementById('hero-canvas');
  if (!container) return; // page doesn't use the hero scene — no-op

  // ---- Capability + preference checks -----------------------------------
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // transparent → page bg shows through
      powerPreference: 'high-performance',
    });
  } catch (err) {
    // WebGL unavailable — leave the HTML fallback (.panel/.scanline) visible
    return;
  }
  if (!renderer || !renderer.getContext()) return;

  // ---- Sizing helpers ----------------------------------------------------
  let width = container.clientWidth || 1;
  let height = container.clientHeight || 1;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ('outputColorSpace' in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  // WebGL works — hide the HTML fallback so it doesn't show through the
  // transparent canvas, and overlay the canvas on the full container
  // (the container is a grid; stacked children would clip the scene).
  for (const child of Array.from(container.children)) {
    child.style.display = 'none';
  }
  if (!container.style.position && getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.inset = '0';
  container.appendChild(renderer.domElement);

  // ---- Scene + fog -------------------------------------------------------
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(INK, 0.05);

  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
  camera.position.set(6.0, 4.3, 8.8);
  camera.lookAt(0, 2.1, 0);

  // ---- Lighting ----------------------------------------------------------
  const ambient = new THREE.AmbientLight(0x20262e, 1.1);
  scene.add(ambient);

  // Volt-green key light (top-front) casting shadows
  const key = new THREE.DirectionalLight(ACCENT, 2.4);
  key.position.set(4, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0008;
  scene.add(key);

  // Emerald rim light from behind for metallic edges
  const rim = new THREE.DirectionalLight(EMERALD, 1.6);
  rim.position.set(-6, 4, -5);
  scene.add(rim);

  // Faint cool fill so the dark side isn't pure black
  const fill = new THREE.PointLight(0x4b5563, 0.8, 40);
  fill.position.set(-3, 2, 6);
  scene.add(fill);

  // ---- Materials ---------------------------------------------------------
  const metalDark = new THREE.MeshStandardMaterial({
    color: 0x161a20,
    metalness: 0.92,
    roughness: 0.34,
  });
  const metalMid = new THREE.MeshStandardMaterial({
    color: 0x222831,
    metalness: 0.85,
    roughness: 0.42,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: 0.55,
    metalness: 0.3,
    roughness: 0.5,
  });
  const jointMat = new THREE.MeshStandardMaterial({
    color: 0x0d0f12,
    metalness: 0.95,
    roughness: 0.28,
  });

  // ---- Reflective grid floor --------------------------------------------
  const grid = new THREE.GridHelper(40, 40, EMERALD, 0x1b2128);
  grid.position.y = 0;
  grid.material.opacity = 0.28;
  grid.material.transparent = true;
  scene.add(grid);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(20, 48),
    new THREE.MeshStandardMaterial({
      color: 0x0a0c0f,
      metalness: 0.7,
      roughness: 0.55,
      transparent: true,
      opacity: 0.9,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---- Build the robotic arm --------------------------------------------
  // Hierarchy: yawBase → shoulder(pitch) → upperArm → elbow(pitch) →
  //            forearm → wrist(pitch) → camera head (2 lenses + frustum)
  const armRoot = new THREE.Group();
  scene.add(armRoot);

  function addMesh(geo, mat, parent, cast) {
    const m = new THREE.Mesh(geo, mat);
    if (cast !== false) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    parent.add(m);
    return m;
  }

  // Static base plinth (on the floor, does not rotate)
  const plinth = addMesh(
    new THREE.CylinderGeometry(1.05, 1.25, 0.35, 32),
    metalDark,
    armRoot
  );
  plinth.position.y = 0.175;

  // Yawing base turret — follows cursor horizontally
  const yawBase = new THREE.Group();
  yawBase.position.y = 0.35;
  armRoot.add(yawBase);

  const turret = addMesh(
    new THREE.CylinderGeometry(0.85, 0.95, 0.55, 32),
    metalMid,
    yawBase
  );
  turret.position.y = 0.275;
  // Accent ring around the turret
  const ring = addMesh(
    new THREE.TorusGeometry(0.86, 0.05, 16, 48),
    accentMat,
    yawBase,
    false
  );
  ring.position.y = 0.42;
  ring.rotation.x = Math.PI / 2;

  // Shoulder joint (pitch)
  const shoulder = new THREE.Group();
  shoulder.position.y = 0.62;
  yawBase.add(shoulder);
  const shoulderJoint = addMesh(
    new THREE.SphereGeometry(0.42, 24, 24),
    jointMat,
    shoulder
  );
  shoulderJoint.scale.set(1, 1, 1.15);

  // Upper arm link
  const UPPER_LEN = 2.0;
  const upper = addMesh(
    new THREE.BoxGeometry(0.42, UPPER_LEN, 0.42),
    metalMid,
    shoulder
  );
  upper.position.y = UPPER_LEN / 2;
  // Accent stripe along the upper arm
  const upperStripe = addMesh(
    new THREE.BoxGeometry(0.46, UPPER_LEN * 0.8, 0.06),
    accentMat,
    shoulder,
    false
  );
  upperStripe.position.set(0, UPPER_LEN / 2, 0.22);

  // Elbow joint (pitch)
  const elbow = new THREE.Group();
  elbow.position.y = UPPER_LEN;
  shoulder.add(elbow);
  const elbowJoint = addMesh(
    new THREE.SphereGeometry(0.32, 24, 24),
    jointMat,
    elbow
  );

  // Forearm link
  const FORE_LEN = 1.7;
  const fore = addMesh(
    new THREE.BoxGeometry(0.32, FORE_LEN, 0.32),
    metalDark,
    elbow
  );
  fore.position.y = FORE_LEN / 2;
  const foreStripe = addMesh(
    new THREE.BoxGeometry(0.36, FORE_LEN * 0.75, 0.05),
    accentMat,
    elbow,
    false
  );
  foreStripe.position.set(0, FORE_LEN / 2, 0.17);

  // Wrist joint (pitch)
  const wrist = new THREE.Group();
  wrist.position.y = FORE_LEN;
  elbow.add(wrist);
  const wristJoint = addMesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.3, 20),
    jointMat,
    wrist
  );
  wristJoint.rotation.z = Math.PI / 2;

  // Stereo camera head (end effector) — the arm "sees" instead of grips.
  // Mount plate + wide housing, two big lens barrels exiting along the
  // arm axis (+y), each with a dark glass element, a glowing iris and an
  // accent focus ring; a status LED and a faint scan frustum complete it.
  const head = new THREE.Group();
  head.position.y = 0.2;
  wrist.add(head);

  const lensGlassMat = new THREE.MeshStandardMaterial({
    color: 0x05070a,
    metalness: 0.6,
    roughness: 0.08,
  });
  const irisMat = new THREE.MeshStandardMaterial({
    color: EMERALD,
    emissive: EMERALD,
    emissiveIntensity: 0.9,
    metalness: 0.2,
    roughness: 0.4,
  });

  // Mount plate connecting wrist to housing
  const mount = addMesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.12, 20),
    jointMat,
    head
  );
  mount.position.y = 0.06;

  // Housing — wide stereo body (think depth camera), lenses on top face
  const housing = addMesh(
    new THREE.BoxGeometry(0.92, 0.3, 0.42),
    metalMid,
    head
  );
  housing.position.y = 0.27;
  const housingStripe = addMesh(
    new THREE.BoxGeometry(0.94, 0.05, 0.03),
    accentMat,
    head,
    false
  );
  housingStripe.position.set(0, 0.27, 0.21);

  // Status LED on the housing corner (pulses while tracking)
  const led = addMesh(
    new THREE.SphereGeometry(0.035, 12, 12),
    irisMat,
    head,
    false
  );
  led.position.set(0.38, 0.27, 0.23);

  function makeLens(x, r) {
    // Barrel
    const barrel = addMesh(
      new THREE.CylinderGeometry(r, r * 0.9, 0.34, 28),
      metalDark,
      head
    );
    barrel.position.set(x, 0.59, 0);
    // Accent focus ring at the rim
    const focusRing = addMesh(
      new THREE.TorusGeometry(r * 1.02, 0.028, 12, 36),
      accentMat,
      head,
      false
    );
    focusRing.position.set(x, 0.74, 0);
    focusRing.rotation.x = Math.PI / 2;
    // Dark glass element
    const glass = addMesh(
      new THREE.CylinderGeometry(r * 0.82, r * 0.82, 0.04, 28),
      lensGlassMat,
      head,
      false
    );
    glass.position.set(x, 0.765, 0);
    // Glowing iris at the center
    const iris = addMesh(
      new THREE.CylinderGeometry(r * 0.3, r * 0.3, 0.05, 20),
      irisMat,
      head,
      false
    );
    iris.position.set(x, 0.77, 0);
  }
  makeLens(-0.23, 0.2);
  makeLens(0.23, 0.2);

  // Faint scan frustum projecting from between the lenses (apex at head)
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.65, 2.1, 4, 1, true),
    new THREE.MeshBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beam.position.y = 0.78 + 1.05;
  beam.rotation.x = Math.PI; // apex toward the lenses, opening outward
  beam.rotation.y = Math.PI / 4; // square frustum aligned with the housing
  head.add(beam);
  const beamEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(beam.geometry),
    new THREE.LineBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0.16,
    })
  );
  beamEdges.position.copy(beam.position);
  beamEdges.rotation.copy(beam.rotation);
  head.add(beamEdges);

  // ---- HUD detail: floating wireframe scan-ring + bounding box ----------
  const hud = new THREE.Group();
  scene.add(hud);

  const scanRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.7, 0.012, 8, 64),
    new THREE.MeshBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0.35,
    })
  );
  scanRing.rotation.x = Math.PI / 2;
  scanRing.position.y = 3.2;
  hud.add(scanRing);

  const bbox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.6, 2.0, 1.6)),
    new THREE.LineBasicMaterial({
      color: EMERALD,
      transparent: true,
      opacity: 0.22,
    })
  );
  bbox.position.y = 3.4;
  hud.add(bbox);

  // Faint particle "point cloud" drifting above the arm
  const pCount = 90;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 8;
    pPos[i * 3 + 1] = Math.random() * 5 + 1;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const points = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: ACCENT,
      size: 0.05,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    })
  );
  scene.add(points);

  // ---- Cursor tracking ---------------------------------------------------
  // Normalised pointer (-1..1). The cursor ray is projected onto a virtual
  // plane in front of the arm; the head aims at that 3D point like a
  // tracked object (base yaw + posture + an analytic wrist solve).
  const pointer = { x: 0, y: 0 };
  let lastMove = performance.now();

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const aimPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.2); // z = 2.2
  const targetPt = new THREE.Vector3(0, 2.6, 2.2);
  const headPos = new THREE.Vector3();
  const headDir = new THREE.Vector3();

  function onPointerMove(e) {
    // Canvas-relative NDC, deliberately unclamped: over the canvas the head
    // looks exactly at the cursor; outside it the aim extrapolates so the
    // arm still reacts anywhere on the page.
    const rect = container.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    lastMove = performance.now();
  }
  if (!reduceMotion) {
    window.addEventListener('mousemove', onPointerMove, { passive: true });
  }

  // ---- Animation loop ----------------------------------------------------
  const clock = new THREE.Clock();
  let visible = true;
  let frameId = null;

  // Eased current angles (focus drives the lens iris / scan-beam pulse).
  // Wrist rests around 1.0 so the lens face tilts toward the viewer
  // instead of pointing straight up.
  const cur = { yaw: 0, shoulder: 0.25, elbow: -0.6, wrist: 1.0, focus: 0.9 };

  function update(dt, t) {
    // Idle if cursor hasn't moved in ~1.4s
    const idle = t - lastMove > 1400;
    const breathe = Math.sin(t * 0.0012) * 0.06;

    // ---- Where to look ----
    if (idle || reduceMotion) {
      // Roam: a slow figure-eight in front of the arm
      targetPt.set(
        Math.sin(t * 0.00035) * 2.6,
        2.4 + Math.sin(t * 0.00078) * 1.1,
        2.2
      );
    } else {
      ndc.set(pointer.x, -pointer.y);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(aimPlane, targetPt)) {
        targetPt.set(0, 2.6, 2.2);
      }
      targetPt.x = THREE.MathUtils.clamp(targetPt.x, -4.5, 4.5);
      targetPt.y = THREE.MathUtils.clamp(targetPt.y, 0.25, 5.2);
    }

    // ---- Posture: yaw faces the target, shoulder/elbow adopt the reach ----
    const tgtYaw = Math.atan2(targetPt.x, targetPt.z);
    const hN = THREE.MathUtils.clamp((targetPt.y - 0.25) / 5, 0, 1); // 0 low → 1 high
    const tgtShoulder = 0.55 - hN * 0.45 + (idle ? breathe : 0);
    const tgtElbow = -0.95 + hN * 0.5 + (idle ? breathe * 1.5 : 0);
    const tgtFocus = idle || reduceMotion
      ? 0.7 + Math.sin(t * 0.0016) * 0.3 // slow autofocus pulse
      : 1.1; // tracking: irises glow hot, beam stays lit

    const k = reduceMotion ? 1 : 1 - Math.pow(0.0001, dt); // frame-rate independent ease
    cur.yaw += (tgtYaw - cur.yaw) * k;
    cur.shoulder += (tgtShoulder - cur.shoulder) * k;
    cur.elbow += (tgtElbow - cur.elbow) * k;
    cur.focus += (tgtFocus - cur.focus) * k;

    yawBase.rotation.y = cur.yaw;
    shoulder.rotation.x = cur.shoulder;
    elbow.rotation.x = cur.elbow;

    // ---- Aim the head: solve the wrist pitch so the lens axis (+y of the
    // head) points at the target, then ease toward it (gaze leads slightly).
    wrist.getWorldPosition(headPos);
    headDir.copy(targetPt).sub(headPos);
    const sy = Math.sin(cur.yaw);
    const cy = Math.cos(cur.yaw);
    const depthInPlane = headDir.x * sy + headDir.z * cy; // along the arm's facing
    const phi = Math.atan2(depthInPlane, headDir.y); // desired pitch from vertical
    const tgtWrist = THREE.MathUtils.clamp(
      phi - (cur.shoulder + cur.elbow),
      -0.25,
      2.2
    );
    const kHead = reduceMotion ? 1 : 1 - Math.pow(0.00001, dt); // snappier than the body
    cur.wrist += (tgtWrist - cur.wrist) * kHead;
    wrist.rotation.x = cur.wrist;
    // Camera-head life: iris/LED glow follows focus, scan beam breathes
    irisMat.emissiveIntensity = 0.5 + cur.focus * 0.6;
    beam.material.opacity = 0.015 + cur.focus * 0.025;
    beamEdges.material.opacity = 0.06 + cur.focus * 0.08;
    beam.rotation.y = Math.PI / 4 + t * 0.0003; // slow frustum sweep
    beamEdges.rotation.y = beam.rotation.y;

    // HUD motion
    if (!reduceMotion) {
      scanRing.rotation.z = t * 0.0006;
      scanRing.position.y = 3.2 + Math.sin(t * 0.0014) * 0.25;
      bbox.rotation.y = t * 0.0004;
      points.rotation.y = t * 0.00015;
      ring.rotation.z = t * 0.0009;
    }
  }

  function render() {
    renderer.render(scene, camera);
  }

  function loop() {
    frameId = requestAnimationFrame(loop);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt, performance.now());
    render();
  }

  // ---- Resize handling ---------------------------------------------------
  function onResize() {
    width = container.clientWidth || 1;
    height = container.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    if (reduceMotion) render(); // keep static frame crisp on resize
  }
  let resizeObs = null;
  if ('ResizeObserver' in window) {
    resizeObs = new ResizeObserver(onResize);
    resizeObs.observe(container);
  } else {
    window.addEventListener('resize', onResize);
  }

  // ---- Reduced motion: one static frame, no loop ------------------------
  if (reduceMotion) {
    update(0, performance.now());
    render();
    return;
  }

  // ---- Pause when off-screen --------------------------------------------
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

function boot() {
  try {
    init();
  } catch (err) {
    // Never let the hero scene break the rest of the page
    if (window.console && console.warn) {
      console.warn('[three-scene] disabled:', err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
