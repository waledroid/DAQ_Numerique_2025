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
      return '<a href="' + p.href + '" class="nav-link font-mono' + active + '">' + p.label + '</a>';
    }).join('');

    host.className = 'nav';
    host.innerHTML =
      '<nav class="glass-nav">' +
        '<a href="index.html" class="font-display font-bold text-mist text-sm sm:text-base tracking-tight shrink-0 whitespace-nowrap" aria-label="Accueil">Atanda Abdullahi<span class="text-accent">.</span></a>' +
        '<div class="flex items-center gap-2 shrink-0">' +
          '<div class="hidden md:flex items-center">' + links + '</div>' +
          '<a href="cv.html" class="btn hidden sm:inline-flex" style="padding:7px 16px" data-magnetic><i class="fa-solid fa-file-lines"></i> CV</a>' +
          '<button id="nav-burger" class="md:hidden w-9 h-9 rounded-full bg-white/5 border border-line grid place-items-center text-mist text-base" aria-label="Menu"><i class="fa-solid fa-bars"></i></button>' +
        '</div>' +
      '</nav>';

    // mobile drawer
    var drawer = document.createElement('div');
    drawer.className = 'drawer is-closed fixed top-0 left-0 z-[70] h-full w-72 border-r border-line p-8 pt-24 md:hidden';
    drawer.innerHTML =
      '<button id="drawer-close" class="absolute top-6 right-6 text-mist text-2xl" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>' +
      PAGES.map(function (p) {
        var active = p.href === current ? ' text-accent' : ' text-muted';
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
    var navLinks = PAGES.map(function (p) {
      return '<a href="' + p.href + '" class="text-muted hover:text-mist transition-colors link-u w-fit">' + p.label + '</a>';
    }).join('');
    var socials =
      '<a href="https://github.com/waledroid" target="_blank" rel="noopener" class="w-9 h-9 rounded-full bg-white/5 border border-line grid place-items-center text-muted hover:text-accent transition-colors" aria-label="GitHub"><i class="fa-brands fa-github"></i></a>' +
      '<a href="https://linkedin.com/in/waledroid" target="_blank" rel="noopener" class="w-9 h-9 rounded-full bg-white/5 border border-line grid place-items-center text-muted hover:text-accent transition-colors" aria-label="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>' +
      '<a href="mailto:waledroid@gmail.com" class="w-9 h-9 rounded-full bg-white/5 border border-line grid place-items-center text-muted hover:text-accent transition-colors" aria-label="Email"><i class="fa-solid fa-envelope"></i></a>';

    host.className = 'py-10 sm:py-16';
    host.innerHTML =
      '<div class="max-w-shell mx-auto px-5 sm:px-8">' +
        '<div class="panel rounded-3xl px-6 sm:px-10 py-8 sm:py-10">' +
          '<div class="flex flex-wrap items-center justify-between gap-4">' +
            '<a href="index.html" class="flex items-baseline gap-3">' +
              '<span class="font-display text-xl sm:text-2xl font-bold text-mist">Atanda Abdullahi<span class="text-accent">.</span></span>' +
              '<span class="font-signature text-2xl text-muted/70 hidden sm:inline-block">Atanda</span>' +
            '</a>' +
            '<span class="chip"><span class="w-1.5 h-1.5 rounded-full bg-accent inline-block"></span>Disponible pour un entretien</span>' +
          '</div>' +
          '<div class="divider my-7"></div>' +
          '<div class="flex flex-wrap items-center justify-between gap-6">' +
            '<div class="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-sm">' + navLinks + '</div>' +
            '<div class="flex items-center gap-3">' + socials + '</div>' +
          '</div>' +
          '<div class="divider my-7"></div>' +
          '<div class="flex flex-col sm:flex-row justify-between gap-2 text-xs font-mono text-muted">' +
            '<span>© ' + year + ' Atanda Abdullahi</span>' +
            '<span>Conçu &amp; développé à Lyon</span>' +
          '</div>' +
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
