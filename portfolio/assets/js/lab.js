/* ============================================================
   EDGE VISION — Vision Lab engine (lab.html)
   Loaded as <script type="module"> with the three importmap.
   Auto-inits ONLY the parts whose target elements exist:
     (A) #lab-stage      → Three.js point-cloud / particle scene
     (B) [data-detect]   → 2D detection bounding-box overlay demo
     (C) #lab-webcam-btn → optional webcam getUserMedia detection
   Robust by design: try/catch no-op, resize, dpr cap 2,
   IntersectionObserver pause, prefers-reduced-motion static.
   ============================================================ */
import * as THREE from 'three';

/* ---------- Shared helpers / tokens ---------- */
const VOLT = 0x34d3a6;
const EMERALD = 0x34d399;
const ACCENT_CSS = '#34D3A6';
const VOLT_CSS = '#34D3A6';
const EMERALD_CSS = '#34D399';
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const LABELS = [
  ['robot', 0.98], ['person', 0.91], ['screen', 0.87],
  ['cable', 0.79], ['camera', 0.94], ['jetson', 0.96],
  ['arm', 0.88], ['box', 0.72], ['drone', 0.83],
];

function rnd(a, b) { return a + Math.random() * (b - a); }

/* ============================================================
   (A) Three.js point-cloud scene → #lab-stage
   ============================================================ */
function initStage() {
  const host = document.getElementById('lab-stage');
  if (!host) return;

  try {
    // WebGL capability probe
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl') || probe.getContext('experimental-webgl');
    if (!gl) throw new Error('WebGL indisponible');

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const w0 = host.clientWidth || 600;
    const h0 = host.clientHeight || 420;
    renderer.setSize(w0, h0, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, w0 / h0, 0.1, 100);
    camera.position.set(0, 0, 7);

    // Build a torus-knot point cloud (tinted volt→emerald along the form)
    const COUNT = Math.min(9000, Math.max(2600, Math.floor((w0 * h0) / 70)));
    const src = new THREE.TorusKnotGeometry(2.1, 0.62, 320, 32, 2, 3);
    const srcPos = src.attributes.position;
    const total = srcPos.count;

    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT); // per-point jitter phase
    const cVolt = new THREE.Color(VOLT);
    const cEmer = new THREE.Color(EMERALD);
    const tmp = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      const idx = (Math.floor(Math.random() * total)) * 3;
      positions[i * 3] = srcPos.array[idx];
      positions[i * 3 + 1] = srcPos.array[idx + 1];
      positions[i * 3 + 2] = srcPos.array[idx + 2];
      const t = (positions[i * 3 + 1] + 3) / 6; // vertical gradient
      tmp.copy(cVolt).lerp(cEmer, Math.min(1, Math.max(0, t)));
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
      seeds[i] = Math.random() * Math.PI * 2;
    }
    src.dispose();

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const basePos = positions.slice(0);

    // Soft round sprite so points read as a glowing point-cloud
    const sprite = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.65)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    })();

    const mat = new THREE.PointsMaterial({
      size: 0.06, map: sprite, vertexColors: true,
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.8,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // Cursor parallax target (eased)
    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    function onMove(e) {
      const r = host.getBoundingClientRect();
      targetX = ((e.clientX - r.left) / r.width - 0.5) * 2;
      targetY = ((e.clientY - r.top) / r.height - 0.5) * 2;
    }
    host.addEventListener('mousemove', onMove, { passive: true });
    host.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; });

    // Resize
    function resize() {
      const w = host.clientWidth || w0;
      const h = host.clientHeight || h0;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = ('ResizeObserver' in window) ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(host); else window.addEventListener('resize', resize);

    // IntersectionObserver pause
    let visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0.05 })
        .observe(host);
    }

    const posAttr = geo.attributes.position;
    const clock = new THREE.Clock();
    let raf = 0;

    function renderOnce() {
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;
      points.rotation.y += 0.0016;
      points.rotation.x = curY * 0.35;
      points.rotation.z = curX * 0.12;
      camera.position.x = curX * 0.8;
      camera.position.y = -curY * 0.6;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const t = clock.getElapsedTime();
      // gentle breathing ripple on each point
      const arr = posAttr.array;
      for (let i = 0; i < COUNT; i++) {
        const k = i * 3;
        const s = seeds[i];
        const amp = 0.05 + 0.05 * Math.sin(t * 0.6 + s);
        arr[k] = basePos[k] + Math.sin(t * 0.9 + s) * amp * (0.4 + Math.abs(curX));
        arr[k + 1] = basePos[k + 1] + Math.cos(t * 0.8 + s) * amp;
        arr[k + 2] = basePos[k + 2] + Math.sin(t * 1.1 + s) * amp;
      }
      posAttr.needsUpdate = true;
      points.rotation.y += 0.0016;
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;
      points.rotation.x = curY * 0.35;
      points.rotation.z = curX * 0.12;
      camera.position.x = curX * 0.8;
      camera.position.y = -curY * 0.6;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    }

    if (REDUCED) {
      // Static, no animation loop — render a single frame.
      resize();
      renderOnce();
    } else {
      frame();
    }
  } catch (err) {
    // Graceful no-op: leave any HTML fallback (panel + scanline) in place.
    try { console.warn('[lab] scene 3D désactivée:', err && err.message); } catch (e) {}
  }
}

/* ============================================================
   (B) 2D detection overlay over every [data-detect]
   ============================================================ */
function initDetectOverlays() {
  const targets = document.querySelectorAll('[data-detect]');
  if (!targets.length) return;
  targets.forEach((el) => {
    try { attachOverlay(el); } catch (e) { /* per-target no-op */ }
  });
}

function makeBoxes(n) {
  const boxes = [];
  for (let i = 0; i < n; i++) {
    const lab = LABELS[Math.floor(Math.random() * LABELS.length)];
    boxes.push({
      x: rnd(0.04, 0.55), y: rnd(0.06, 0.55),
      w: rnd(0.18, 0.4), h: rnd(0.18, 0.4),
      vx: rnd(-0.0009, 0.0009), vy: rnd(-0.0009, 0.0009),
      label: lab[0], conf: lab[1], life: rnd(120, 320), age: 0,
    });
  }
  return boxes;
}

function attachOverlay(el) {
  // Container that positions the canvas exactly over the media.
  const host = (el.tagName === 'IMG') ? el.parentElement || el : el;
  const cs = getComputedStyle(host);
  if (cs.position === 'static') host.style.position = 'relative';

  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '5',
  });
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;
  function size() {
    const r = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  const ro = ('ResizeObserver' in window) ? new ResizeObserver(size) : null;
  if (ro) ro.observe(host); else window.addEventListener('resize', size);

  let boxes = makeBoxes(3);
  let scan = 0, raf = 0, visible = true;

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0.05 })
      .observe(host);
  }

  function drawBox(b) {
    const x = b.x * W, y = b.y * H, w = b.w * W, h = b.h * H;
    // glass tint fill (subtle accent wash, softly blurred like frosted glass)
    ctx.save();
    ctx.filter = 'blur(2px)';
    ctx.fillStyle = 'rgba(52,211,166,0.10)';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    // box — 1px accent border
    ctx.strokeStyle = ACCENT_CSS;
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(52,211,166,0.5)';
    ctx.shadowBlur = 6;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 0;
    // corner ticks (HUD feel)
    const c = 10;
    ctx.strokeStyle = VOLT_CSS;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
    ctx.moveTo(x + w - c, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - c);
    ctx.stroke();
    // label
    const text = b.label + ' ' + b.conf.toFixed(2);
    ctx.font = '11px "JetBrains Mono", monospace';
    const tw = ctx.measureText(text).width + 12;
    ctx.fillStyle = 'rgba(52,211,166,0.88)';
    ctx.fillRect(x, y - 16, tw, 16);
    ctx.fillStyle = '#07140a';
    ctx.fillText(text, x + 6, y - 4);
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!visible || W === 0) return;
    ctx.clearRect(0, 0, W, H);

    // scanline
    scan += REDUCED ? 0 : 0.006;
    if (scan > 1) scan = 0;
    const sy = scan * H;
    const grad = ctx.createLinearGradient(0, sy - 24, 0, sy + 24);
    grad.addColorStop(0, 'rgba(52,211,166,0)');
    grad.addColorStop(0.5, 'rgba(52,211,166,0.35)');
    grad.addColorStop(1, 'rgba(52,211,166,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, sy - 24, W, 48);
    ctx.strokeStyle = 'rgba(52,211,166,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();

    // move + draw boxes, recycle expired ones
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (!REDUCED) {
        b.x += b.vx; b.y += b.vy; b.age++;
        if (b.x < 0.02 || b.x + b.w > 0.98) b.vx *= -1;
        if (b.y < 0.04 || b.y + b.h > 0.98) b.vy *= -1;
        b.conf = Math.min(0.99, Math.max(0.6, b.conf + rnd(-0.01, 0.01)));
        if (b.age > b.life) { boxes.splice(i, 1); continue; }
      }
      drawBox(b);
    }
    if (!REDUCED && boxes.length < 3 && Math.random() < 0.03) {
      boxes.push(makeBoxes(1)[0]);
    }

    // telemetry corner
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(52,211,166,0.85)';
    ctx.fillText('EDGE-VISION · ' + boxes.length + ' obj · ' + (REDUCED ? 'static' : 'live'), 8, H - 8);
  }

  tick();
}

/* ============================================================
   (C) Optional webcam detection → #lab-webcam-btn / #lab-webcam
   ============================================================ */
function initWebcam() {
  const btn = document.getElementById('lab-webcam-btn');
  if (!btn) return;
  const stage = document.getElementById('lab-webcam');
  let active = false, stream = null, raf = 0, canvas = null, ctx = null, video = null;
  let boxes = [], scan = 0;

  function msg(text, tone) {
    if (!stage) return;
    const cs = getComputedStyle(stage);
    if (cs.position === 'static') stage.style.position = 'relative';
    let m = stage.querySelector('[data-lab-msg]');
    if (!m) {
      m = document.createElement('div');
      m.setAttribute('data-lab-msg', '');
      Object.assign(m.style, {
        position: 'absolute', inset: '0', display: 'grid', placeItems: 'center',
        textAlign: 'center', padding: '1.5rem', zIndex: '6',
        font: '13px "JetBrains Mono", monospace', color: tone || '#9BA1A8',
      });
      stage.appendChild(m);
    }
    m.style.color = tone || '#9BA1A8';
    m.textContent = text;
  }
  function clearMsg() {
    const m = stage && stage.querySelector('[data-lab-msg]');
    if (m) m.remove();
  }

  async function start() {
    if (!stage) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      msg('Webcam non supportée par ce navigateur.', '#9BA1A8');
      return;
    }
    msg('Demande d\'accès à la caméra…', ACCENT_CSS);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    } catch (err) {
      const name = err && err.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        msg('Accès caméra refusé. Autorisez la caméra pour lancer la détection.', '#9BA1A8');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        msg('Aucune caméra détectée sur cet appareil.', '#9BA1A8');
      } else {
        msg('Caméra indisponible.', '#9BA1A8');
      }
      return;
    }

    try {
      clearMsg();
      const cs = getComputedStyle(stage);
      if (cs.position === 'static') stage.style.position = 'relative';
      stage.style.overflow = 'hidden';

      video = document.createElement('video');
      video.autoplay = true; video.muted = true; video.playsInline = true;
      Object.assign(video.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        objectFit: 'cover', transform: 'scaleX(-1)', zIndex: '4',
      });
      video.srcObject = stream;
      stage.appendChild(video);
      await video.play().catch(() => {});

      canvas = document.createElement('canvas');
      Object.assign(canvas.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: '5',
      });
      stage.appendChild(canvas);
      ctx = canvas.getContext('2d');

      boxes = makeBoxes(2);
      active = true;
      btn.setAttribute('aria-pressed', 'true');
      const txt = btn.querySelector('[data-label]');
      if (txt) txt.textContent = 'Arrêter la caméra'; else btn.textContent = 'Arrêter la caméra';
      loop();
    } catch (err) {
      msg('Erreur lors de l\'initialisation de la caméra.', '#9BA1A8');
      stop();
    }
  }

  function sizeCanvas() {
    if (!canvas) return { W: 0, H: 0 };
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { W: r.width, H: r.height };
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!active || !ctx) return;
    const { W, H } = sizeCanvas();
    if (!W) return;
    ctx.clearRect(0, 0, W, H);

    scan += 0.006; if (scan > 1) scan = 0;
    const sy = scan * H;
    const grad = ctx.createLinearGradient(0, sy - 24, 0, sy + 24);
    grad.addColorStop(0, 'rgba(52,211,166,0)');
    grad.addColorStop(0.5, 'rgba(52,211,166,0.3)');
    grad.addColorStop(1, 'rgba(52,211,166,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, sy - 24, W, 48);

    for (const b of boxes) {
      b.x += b.vx; b.y += b.vy;
      if (b.x < 0.02 || b.x + b.w > 0.98) b.vx *= -1;
      if (b.y < 0.04 || b.y + b.h > 0.98) b.vy *= -1;
      b.conf = Math.min(0.99, Math.max(0.6, b.conf + rnd(-0.01, 0.01)));
      const x = b.x * W, y = b.y * H, w = b.w * W, h = b.h * H;
      ctx.save();
      ctx.filter = 'blur(2px)';
      ctx.fillStyle = 'rgba(52,211,166,0.10)';
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      ctx.strokeStyle = ACCENT_CSS; ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(52,211,166,0.5)'; ctx.shadowBlur = 6;
      ctx.strokeRect(x, y, w, h); ctx.shadowBlur = 0;
      const text = b.label + ' ' + b.conf.toFixed(2);
      ctx.font = '11px "JetBrains Mono", monospace';
      const tw = ctx.measureText(text).width + 12;
      ctx.fillStyle = 'rgba(52,211,166,0.88)'; ctx.fillRect(x, y - 16, tw, 16);
      ctx.fillStyle = '#07140a'; ctx.fillText(text, x + 6, y - 4);
    }
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(52,211,166,0.85)';
    ctx.fillText('LIVE · cam · ' + boxes.length + ' obj', 8, H - 8);
  }

  function stop() {
    active = false;
    if (raf) cancelAnimationFrame(raf);
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (video) { video.srcObject = null; video.remove(); video = null; }
    if (canvas) { canvas.remove(); canvas = null; ctx = null; }
    btn.setAttribute('aria-pressed', 'false');
    const txt = btn.querySelector('[data-label]');
    if (txt) txt.textContent = 'Activer la webcam'; else btn.textContent = 'Activer la webcam';
  }

  btn.addEventListener('click', () => {
    if (active) stop(); else start();
  });
  window.addEventListener('pagehide', stop);
  // Expose for the page to trigger programmatically if desired.
  window.labWebcam = { start, stop };
}

/* ============================================================
   Boot — auto-init only the parts whose targets exist.
   ============================================================ */
function boot() {
  initStage();
  initDetectOverlays();
  initWebcam();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export { initStage, initDetectOverlays, initWebcam };
