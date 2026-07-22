/* ============================================================
   EDGE VISION — shared site behaviour for every page.
   Injects nav + footer (single source of truth), custom cursor,
   magnetic buttons, scroll reveals, smooth scroll, active link.
   Depends (optionally) on GSAP + Lenis being loaded before it.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Site nav data (one place to edit links) ---------- */
  var PAGES = [
    { href: 'index.html',      label: 'Accueil' },
    { href: 'about.html',      label: 'À propos' },
    { href: 'experience.html', label: 'Parcours' },
    { href: 'projects.html',   label: 'Projets' },
    { href: 'lab.html',        label: 'Lab' },
    { href: 'contact.html',    label: 'Contact' },
  ];
  var current = (location.pathname.split('/').pop() || 'index.html');
  if (current === '') current = 'index.html';

  /* ---------- Build the nav ---------- */
  function buildNav(host) {
    var links = PAGES.map(function (p) {
      var active = p.href === current ? ' is-active' : '';
      return '<a href="' + p.href + '" class="nav-link font-mono text-sm py-2' + active + '" data-magnetic>' + p.label + '</a>';
    }).join('');

    host.className = 'nav';
    host.innerHTML =
      '<nav class="max-w-shell mx-auto flex items-center justify-between px-5 sm:px-8 py-4">' +
        '<a href="index.html" class="flex items-center gap-2 group" data-magnetic>' +
          '<span class="inline-block w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_12px_var(--glow)]"></span>' +
          '<span class="font-display font-bold tracking-tight text-mist">ATANDA<span class="text-accent">.</span></span>' +
        '</a>' +
        '<div class="hidden md:flex items-center gap-8">' + links + '</div>' +
        '<div class="flex items-center gap-3">' +
          '<a href="cv.html" class="hidden sm:inline-flex btn" data-magnetic><i class="fa-solid fa-file-lines"></i> CV</a>' +
          '<button id="nav-burger" class="md:hidden text-mist text-2xl w-10 h-10 grid place-items-center" aria-label="Menu"><i class="fa-solid fa-bars"></i></button>' +
        '</div>' +
      '</nav>';

    // mobile drawer
    var drawer = document.createElement('div');
    drawer.className = 'drawer is-closed fixed top-0 left-0 z-[70] h-full w-72 bg-ink/95 backdrop-blur-xl border-r border-line p-8 pt-24 md:hidden';
    drawer.innerHTML =
      '<button id="drawer-close" class="absolute top-6 right-6 text-mist text-2xl" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>' +
      PAGES.map(function (p) {
        var active = p.href === current ? ' text-volt' : ' text-muted';
        return '<a href="' + p.href + '" class="block py-4 text-2xl font-display border-b border-line' + active + '">' + p.label + '</a>';
      }).join('') +
      '<a href="cv.html" class="btn mt-8"><i class="fa-solid fa-file-lines"></i> Voir le CV</a>';
    document.body.appendChild(drawer);

    function toggle(open) { drawer.classList.toggle('is-closed', !open); document.body.classList.toggle('overflow-hidden', open); }
    host.querySelector('#nav-burger').addEventListener('click', function () { toggle(true); });
    drawer.querySelector('#drawer-close').addEventListener('click', function () { toggle(false); });
    drawer.querySelectorAll('a[href]').forEach(function (a) { a.addEventListener('click', function () { toggle(false); }); });

    // scrolled state
    window.addEventListener('scroll', function () {
      host.classList.toggle('nav--scrolled', window.scrollY > 24);
    }, { passive: true });
  }

  /* ---------- Build the footer ---------- */
  function buildFooter(host) {
    var year = new Date().getFullYear();
    host.className = 'border-t border-line bg-ink';
    host.innerHTML =
      '<div class="max-w-shell mx-auto px-5 sm:px-8 py-16">' +
        '<div class="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">' +
          '<div>' +
            '<a href="index.html" class="font-display text-2xl font-bold">Atanda Abdullahi<span class="text-accent">.</span></a>' +
            '<p class="text-muted mt-3 max-w-xs text-sm leading-relaxed">Vision par Ordinateur &amp; Edge-AI — Deep Learning embarqué, TensorRT, ROS2. Oullins, Lyon.</p>' +
            '<p class="label mt-5 text-emerald"><span class="w-2 h-2 rounded-full bg-emerald inline-block"></span>Disponible pour un entretien</p>' +
          '</div>' +
          '<div><h4 class="font-mono text-xs uppercase tracking-widest text-muted mb-4">Navigation</h4>' +
            PAGES.map(function (p) { return '<a href="' + p.href + '" class="block text-muted hover:text-accent py-1 link-u w-fit">' + p.label + '</a>'; }).join('') +
          '</div>' +
          '<div><h4 class="font-mono text-xs uppercase tracking-widest text-muted mb-4">Réseaux</h4>' +
            '<a href="https://linkedin.com/in/waledroid" target="_blank" rel="noopener" class="block text-muted hover:text-accent py-1 link-u w-fit">LinkedIn</a>' +
            '<a href="https://github.com/waledroid" target="_blank" rel="noopener" class="block text-muted hover:text-accent py-1 link-u w-fit">GitHub</a>' +
            '<a href="mailto:waledroid@gmail.com" class="block text-muted hover:text-accent py-1 link-u w-fit">Email</a>' +
          '</div>' +
          '<div><h4 class="font-mono text-xs uppercase tracking-widest text-muted mb-4">Contact</h4>' +
            '<p class="text-muted py-1">waledroid@gmail.com</p>' +
            '<p class="text-muted py-1">+33 7 49 49 99 78</p>' +
            '<p class="text-muted py-1">33 boulevard de l\'Europe, Montmein Sud<br>69600 Oullins — Lyon</p>' +
          '</div>' +
        '</div>' +
        '<div class="divider my-10"></div>' +
        '<div class="flex flex-col sm:flex-row justify-between gap-3 text-xs font-mono text-muted">' +
          '<span>© ' + year + ' Atanda Abdullahi — Tous droits réservés.</span>' +
          '<span>Conçu &amp; codé avec une touche de vert.</span>' +
        '</div>' +
      '</div>';
  }

  /* ---------- Custom cursor + magnetic ---------- */
  function initCursor() {
    if (window.matchMedia('(hover: none)').matches) return;
    var dot = document.getElementById('cursor-dot');
    var ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;
    var mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(loop);
    })();
    var hot = 'a, button, [data-magnetic], input, textarea, .panel';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(hot)) ring.classList.add('is-active');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(hot)) ring.classList.remove('is-active');
    });

    // magnetic pull
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2);
        var y = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + x * 0.25 + 'px,' + y * 0.35 + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-visible'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- Smooth scroll (Lenis if present) + anchor jumps ---------- */
  function initSmooth() {
    var lenis = null;
    if (window.Lenis && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
      function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      if (window.gsap && window.ScrollTrigger) {
        lenis.on('scroll', window.ScrollTrigger.update);
      }
    }
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var t = document.querySelector(id);
        if (!t) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(t, { offset: -80 });
        else t.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /* ---------- Text scramble on [data-scramble] ---------- */
  function initScramble() {
    var chars = '!<>-_\\/[]{}—=+*^?#01';
    document.querySelectorAll('[data-scramble]').forEach(function (el) {
      var target = el.textContent, frame = 0, queue = [];
      function set() {
        queue = [];
        for (var i = 0; i < target.length; i++) {
          queue.push({ to: target[i], start: Math.floor(Math.random() * 18), end: Math.floor(Math.random() * 18) + 18, ch: '' });
        }
        frame = 0; tick();
      }
      function tick() {
        var out = '', done = 0;
        for (var i = 0; i < queue.length; i++) {
          var q = queue[i];
          if (frame >= q.end) { done++; out += q.to; }
          else if (frame >= q.start) {
            if (!q.ch || Math.random() < 0.28) q.ch = chars[Math.floor(Math.random() * chars.length)];
            out += '<span style="color:var(--accent)">' + q.ch + '</span>';
          } else out += '';
        }
        el.innerHTML = out;
        if (done < queue.length) { frame++; requestAnimationFrame(tick); }
      }
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { set(); io.disconnect(); } }, { threshold: 0.6 });
      io.observe(el);
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    var navHost = document.querySelector('[data-site-nav]');
    var footHost = document.querySelector('[data-site-footer]');
    if (navHost) buildNav(navHost);
    if (footHost) buildFooter(footHost);
    initCursor();
    initReveal();
    initSmooth();
    initScramble();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
