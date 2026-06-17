/* ============================================================
   EDGE VISION — CV editor (cv.js)
   Loads the CV data as JSON, renders it into the A4 sheet via a
   micro template engine, and lets the owner edit everything in
   place (contenteditable) then persist it.

   Persistence strategy (no database):
   - `node server.js`  → GET/PUT /api/cv reads/writes data/cv.json.
   - Static hosting    → /api/cv is absent; drafts are kept in
     localStorage so the editor still works in the browser.
   Printing uses the browser's print-to-PDF with exact A4 CSS.
   ============================================================ */
(() => {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const API = 'api/cv';
  const SEED = 'data/cv.json';
  const DRAFT_KEY = 'edge-vision-cv-draft-v1';

  // ---- Direct-to-GitHub persistence (no backend needed on a live host) ----
  // The editor commits data/cv.json to the repo through the GitHub Contents
  // API, authenticated with a fine-grained token you paste once (kept only in
  // this browser's localStorage — never hardcode it here, the repo is public).
  const GH = {
    owner: 'waledroid', repo: 'DAQ_Numerique_2025',
    branch: 'main', path: 'portfolio/data/cv.json',
  };
  const GH_TOKEN_KEY = 'edge-vision-gh-token';
  const ghToken = () => localStorage.getItem(GH_TOKEN_KEY) || '';
  // UTF-8-safe base64 (the CV has accented characters)
  const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

  let state = null;
  let editing = false;
  let serverOk = false;

  // ---- Micro template engine: {{a.b.c}} interpolation, HTML-escaped ----
  const get = (obj, path) =>
    path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  function tpl(id, scope) {
    const html = $('#' + id).innerHTML.replace(
      /\{\{([\w.]+)\}\}/g,
      (_, p) => esc(get(scope, p))
    );
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  // ---- Lists: host element + template + default item for "+ add" --------
  const LISTS = {
    contact: {
      host: '#contact-list', tpl: 'tpl-contact',
      blank: { label: 'Libellé', value: 'Valeur' },
    },
    skills: {
      host: '#skills-list', tpl: 'tpl-skill',
      blank: { category: 'Catégorie', items: 'Compétence A · Compétence B' },
      map: (s) => ({ category: s.category, items: s.items.join(' · ') }),
    },
    languages: {
      host: '#lang-list', tpl: 'tpl-lang',
      blank: { name: 'Langue', level: 'Niveau' },
    },
    certifications: {
      host: '#cert-list', tpl: 'tpl-cert',
      blank: { name: 'Certification', year: 'Année' },
    },
    experience: {
      host: '#exp-list', tpl: 'tpl-exp',
      blank: { role: 'Poste', company: 'Entreprise', location: 'Ville', dates: 'Dates', points: ['Réalisation clé.'] },
    },
    education: {
      host: '#edu-list', tpl: 'tpl-edu',
      blank: { degree: 'Diplôme', school: 'Établissement', dates: 'Date' },
    },
    projects: {
      host: '#proj-list', tpl: 'tpl-proj',
      blank: { name: 'Projet', stack: 'Stack', desc: 'Description courte.' },
    },
  };

  function appendItem(key, data) {
    const cfg = LISTS[key];
    const node = tpl(cfg.tpl, cfg.map ? cfg.map(data) : data);
    if (key === 'experience') {
      const ul = $('[data-points]', node);
      (data.points || []).forEach((p) => ul.appendChild(tpl('tpl-point', { text: p })));
    }
    if (key === 'contact') {
      const a = $('.cvalue', node);
      if (a) {
        const label = (data.label || '').toLowerCase();
        const val = (data.value || '').trim();
        if (label.includes('email') || label.includes('e-mail')) {
          a.setAttribute('href', 'mailto:' + val);
        } else if (label.includes('téléphone') || label.includes('phone') || label.includes('tel')) {
          a.setAttribute('href', 'tel:' + val.replace(/\s+/g, ''));
        } else if (label.includes('linkedin') || label.includes('github') || label.includes('portfolio') || label.includes('site') || label.includes('website')) {
          let url = val;
          if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
          a.setAttribute('href', url);
        }
      }
    }
    $(cfg.host).appendChild(node);
    return node;
  }

  // ---- Render the whole sheet from state ---------------------------------
  function render() {
    $$('[data-edit]').forEach((el) => {
      el.textContent = get(state, el.dataset.edit) || '';
    });
    Object.keys(LISTS).forEach((key) => {
      $(LISTS[key].host).innerHTML = '';
      (state[key] || []).forEach((item) => appendItem(key, item));
    });
    applyEditable();
    autoSpace();
    checkOverflow();
  }

  // ---- Auto spacing --------------------------------------------------------
  // Scale each column's vertical rhythm (the --sp CSS variable) so the
  // content breathes into exactly one A4 page: sparse content relaxes,
  // dense content tightens. Measured with edit chrome hidden so the result
  // matches what prints.
  function autoSpace() {
    const body = document.body;
    const wasEditing = body.classList.contains('editing');
    if (wasEditing) body.classList.remove('editing');
    ['.side', '.mainc'].forEach((sel) => {
      const el = $(sel);
      if (!el) return;
      el.style.setProperty('--sp', 1);
      for (let i = 0; i < 4; i++) {
        const cs = getComputedStyle(el);
        const padTop = parseFloat(cs.paddingTop) || 0;
        const padBot = parseFloat(cs.paddingBottom) || 0;
        const avail = el.clientHeight - padTop - padBot;
        let last = el.lastElementChild;
        while (last && last.offsetHeight === 0) last = last.previousElementSibling;
        if (!last) break;
        const content = last.offsetTop + last.offsetHeight - padTop;
        if (content <= 0 || Math.abs(avail - content) < 3) break;
        const prev = parseFloat(el.style.getPropertyValue('--sp')) || 1;
        const next = Math.min(1.65, Math.max(0.75, prev * (avail / content)));
        el.style.setProperty('--sp', next.toFixed(3));
        if (next === prev) break;
      }
    });
    if (wasEditing) body.classList.add('editing');
  }

  // ---- Collect the DOM back into a data object ---------------------------
  const fieldOf = (item, name) => {
    const el = $('[data-field="' + name + '"]', item);
    return el ? el.textContent.trim() : '';
  };
  function collect() {
    const d = JSON.parse(JSON.stringify(state));
    $$('[data-edit]').forEach((el) => {
      const keys = el.dataset.edit.split('.');
      let o = d;
      while (keys.length > 1) o = o[keys.shift()];
      o[keys[0]] = el.textContent.trim();
    });
    d.contact = $$('#contact-list [data-item]').map((it) => ({
      label: fieldOf(it, 'label'), value: fieldOf(it, 'value'),
    }));
    d.skills = $$('#skills-list [data-item]').map((it) => ({
      category: fieldOf(it, 'category'),
      items: fieldOf(it, 'items').split(/\s*[·,;]\s*/).filter(Boolean),
    }));
    d.languages = $$('#lang-list [data-item]').map((it) => ({
      name: fieldOf(it, 'name'), level: fieldOf(it, 'level'),
    }));
    d.certifications = $$('#cert-list [data-item]').map((it) => ({
      name: fieldOf(it, 'name'), year: fieldOf(it, 'year'),
    }));
    d.experience = $$('#exp-list [data-item]').map((it) => ({
      role: fieldOf(it, 'role'),
      company: fieldOf(it, 'company'),
      location: fieldOf(it, 'location'),
      dates: fieldOf(it, 'dates'),
      points: $$('[data-field="point"]', it).map((p) => p.textContent.trim()).filter(Boolean),
    }));
    d.education = $$('#edu-list [data-item]').map((it) => ({
      degree: fieldOf(it, 'degree'), school: fieldOf(it, 'school'), dates: fieldOf(it, 'dates'),
    }));
    d.projects = $$('#proj-list [data-item]').map((it) => ({
      name: fieldOf(it, 'name'), stack: fieldOf(it, 'stack'), desc: fieldOf(it, 'desc'),
    }));
    return d;
  }

  // ---- Edit mode ----------------------------------------------------------
  function applyEditable() {
    $$('[data-edit], [data-field]').forEach((el) => {
      if (editing) el.setAttribute('contenteditable', 'true');
      else el.removeAttribute('contenteditable');
    });
  }
  function setEditing(on) {
    editing = on;
    document.body.classList.toggle('editing', on);
    $('#btn-edit').hidden = on;
    $('#btn-save').hidden = !on;
    $('#btn-cancel').hidden = !on;
    applyEditable();
    checkOverflow();
  }

  // ---- One-page guard -----------------------------------------------------
  // Measure with the edit-only controls hidden so the warning reflects what
  // actually prints, not the +/× buttons inflating the columns.
  function checkOverflow() {
    const body = document.body;
    const wasEditing = body.classList.contains('editing');
    if (wasEditing) body.classList.remove('editing');
    const over = ['.side', '.mainc'].some((sel) => {
      const el = $(sel);
      return el && el.scrollHeight > el.clientHeight + 2;
    });
    if (wasEditing) body.classList.add('editing');
    $('#overflow-warn').hidden = !over;
  }

  // ---- Toast --------------------------------------------------------------
  let toastTimer = null;
  function toast(msg, warn) {
    const el = $('#toast');
    el.textContent = msg;
    el.style.borderColor = warn ? 'rgba(248,113,113,.5)' : 'rgba(163,230,53,.5)';
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
  }

  // ---- Persistence --------------------------------------------------------
  // Commit data/cv.json straight to the repo via the GitHub Contents API.
  // Returns { ok, error }. Read the current file's sha first (404 = create).
  async function commitToGitHub(data) {
    const url = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${GH.path}`;
    const headers = {
      Authorization: `Bearer ${ghToken()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    let sha;
    try {
      const cur = await fetch(`${url}?ref=${GH.branch}`, { headers, cache: 'no-store' });
      if (cur.ok) sha = (await cur.json()).sha;
      else if (cur.status !== 404) {
        const e = await cur.json().catch(() => ({}));
        return { ok: false, error: e.message || `HTTP ${cur.status}` };
      }
    } catch (err) {
      return { ok: false, error: 'réseau indisponible' };
    }
    // Byte-for-byte match server.js so git diffs stay clean
    const json = JSON.stringify(data, null, 2) + '\n';
    try {
      const r = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: 'CV: mise à jour via l’éditeur',
          content: b64(json),
          sha,
          branch: GH.branch,
        }),
      });
      if (r.ok) return { ok: true };
      const e = await r.json().catch(() => ({}));
      return { ok: false, error: e.message || `HTTP ${r.status}` };
    } catch (err) {
      return { ok: false, error: 'réseau indisponible' };
    }
  }

  async function save() {
    const data = collect();
    state = data;

    // 1. Direct-to-GitHub when a token is configured (works on any host)
    if (ghToken()) {
      const { ok, error } = await commitToGitHub(data);
      if (ok) {
        localStorage.removeItem(DRAFT_KEY);
        toast('Enregistré sur GitHub ✓');
      } else {
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (err) {}
        toast('GitHub : ' + error + ' — brouillon gardé', true);
      }
      setEditing(false);
      render();
      return;
    }

    // 2. Local node server.js, else localStorage draft (unchanged)
    let saved = false;
    try {
      const r = await fetch(API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data, null, 2),
      });
      saved = r.ok;
    } catch (err) { /* no server */ }
    if (saved) {
      localStorage.removeItem(DRAFT_KEY);
      toast('Enregistré sur le serveur ✓');
    } else {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (err) {}
      toast('Serveur indisponible — brouillon gardé dans ce navigateur', true);
    }
    setEditing(false);
    render();
  }

  async function load() {
    let data = null;
    // 1. Live server data (node server.js)
    try {
      const r = await fetch(API, { cache: 'no-store' });
      const ct = r.headers.get('content-type') || '';
      if (r.ok && ct.includes('json')) { data = await r.json(); serverOk = true; }
    } catch (err) { /* static hosting */ }
    // 2. Local draft (static hosting after an edit)
    if (!data) {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) { try { data = JSON.parse(draft); } catch (err) {} }
    }
    // 3. Seed file
    if (!data) {
      const r = await fetch(SEED, { cache: 'no-store' });
      data = await r.json();
    }
    state = data;
    updateStatus();
    const resetBtn = $('#btn-reset');
    if (resetBtn) resetBtn.hidden = !localStorage.getItem(DRAFT_KEY);
    render();
  }

  // ---- GitHub connection --------------------------------------------------
  function updateStatus() {
    const el = $('#srv-status');
    if (!el) return;
    const gh = !!ghToken();
    el.textContent = gh ? 'GitHub connecté' : serverOk ? 'serveur connecté' : 'mode local';
    el.classList.toggle('text-emerald', gh || serverOk);
  }

  function connectGitHub() {
    const current = ghToken();
    const msg = current
      ? 'Jeton GitHub connecté. Collez un nouveau jeton pour le remplacer, ou laissez vide pour vous déconnecter.'
      : 'Collez votre jeton GitHub (fine-grained, dépôt DAQ_Numerique_2025, Contents : lecture/écriture) pour enregistrer le CV directement en ligne.';
    const input = prompt(msg, '');
    if (input === null) return; // cancelled — no change
    const token = input.trim();
    if (token) {
      localStorage.setItem(GH_TOKEN_KEY, token);
      toast('GitHub connecté ✓ — les enregistrements iront sur le dépôt');
    } else {
      localStorage.removeItem(GH_TOKEN_KEY);
      toast('GitHub déconnecté', true);
    }
    updateStatus();
  }

  // ---- Wiring -------------------------------------------------------------
  $('#btn-github').addEventListener('click', connectGitHub);
  $('#btn-edit').addEventListener('click', () => setEditing(true));
  $('#btn-cancel').addEventListener('click', () => { setEditing(false); render(); });
  $('#btn-save').addEventListener('click', save);
  $('#btn-print').addEventListener('click', () => window.print());
  $('#btn-reset').addEventListener('click', async () => {
    if (!confirm('Effacer le brouillon enregistré dans ce navigateur et recharger le CV publié ?')) return;
    localStorage.removeItem(DRAFT_KEY);
    setEditing(false);
    await load();
    toast('Brouillon local effacé — CV publié rechargé ✓');
  });

  document.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (rm && editing) {
      rm.closest('[data-item]').remove();
      autoSpace();
      checkOverflow();
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add && editing) {
      const key = add.dataset.add;
      const node = appendItem(key, LISTS[key].blank);
      applyEditable();
      const first = $('[data-field]', node);
      if (first) first.focus();
      autoSpace();
      checkOverflow();
      return;
    }
    const addPoint = e.target.closest('[data-addpoint]');
    if (addPoint && editing) {
      const ul = $('[data-points]', addPoint.closest('[data-item]'));
      const li = tpl('tpl-point', { text: 'Nouvelle réalisation.' });
      li.setAttribute('contenteditable', 'true');
      ul.appendChild(li);
      li.focus();
      autoSpace();
      checkOverflow();
    }
  });

  // Keep the spacing and one-page warning honest while typing
  document.addEventListener('input', (e) => {
    if (editing && e.target.closest('#cv-sheet')) {
      autoSpace();
      checkOverflow();
    }
  });
  window.addEventListener('resize', () => { autoSpace(); checkOverflow(); });
  // Re-measure once webfonts and the portrait have real metrics
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { autoSpace(); checkOverflow(); });
  }
  window.addEventListener('load', () => { autoSpace(); checkOverflow(); });

  load().catch((err) => {
    console.error('[cv] chargement impossible:', err);
    toast('Impossible de charger les données du CV', true);
  });
})();
