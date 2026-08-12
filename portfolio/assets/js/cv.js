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

  const API = 'api/cv';                      // local node server.js (dev only)
  const SAVE_API = '/.netlify/functions/cv'; // hosted proxy — holds the GitHub token server-side
  const SEED = 'data/cv.json';
  const DRAFT_KEY = 'edge-vision-cv-draft-v1';
  const LANG_KEY = 'edge-vision-cv-lang';
  const VIEW_KEY = 'edge-vision-cv-view'; // 'cv' | 'letter'

  // ---- Bilingual document --------------------------------------------------
  // data/cv.json = { fr: {...}, en: {...} } ; `doc` holds both languages,
  // `state` points to the active one. The flag button swaps languages; the
  // print button then produces the displayed language's PDF.
  const I18N = {
    fr: {
      title: 'CV — Atanda Abdullahi',
      letterTitle: 'Lettre de motivation — Atanda Abdullahi',
      tabCv: 'CV', tabLetter: 'Lettre de motivation',
      objetPrefix: 'Objet : Candidature au poste de ',
      contact: 'Contact',
      profile: 'Profil', skills: 'Compétences Clés', experience: 'Expérience Professionnelle',
      education: 'Formation', certifications: 'Certifications', projects: 'Projets',
      languages: 'Langues', interests: 'Intérêts',
      switchTo: 'Switch to English',
      // Texte utilisé quand un champ de l'offre est vide (lettre générique)
      fallbacks: { destinataire: 'Madame, Monsieur', entreprise: 'votre entreprise', poste: 'Ingénieur Vision par Ordinateur', source: 'votre site carrières', domaine: 'la vision par ordinateur temps réel', focus: 'les systèmes de perception temps réel' },
      cityDate: (d) => `Oullins, le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    },
    en: {
      title: 'Resume — Atanda Abdullahi',
      letterTitle: 'Cover Letter — Atanda Abdullahi',
      tabCv: 'Resume', tabLetter: 'Cover letter',
      objetPrefix: 'Re: Application for ',
      contact: 'Contact',
      profile: 'Profile', skills: 'Core Skills', experience: 'Professional Experience',
      education: 'Education', certifications: 'Certifications', projects: 'Projects',
      languages: 'Languages', interests: 'Interests',
      switchTo: 'Passer en français',
      fallbacks: { destinataire: 'Hiring Manager', entreprise: 'your company', poste: 'Computer Vision Engineer', source: 'your careers site', domaine: 'real-time computer vision', focus: 'real-time perception systems' },
      cityDate: (d) => `Oullins, ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    },
  };

  const EMPTY_OFFER = { texte: '', entreprise: '', poste: '', focus: '', domaine: '', exigence1: '', exigence2: '', lieu: '', profile: '' };

  // ---- Online editing from any device (phone included) --------------------
  // The Netlify function at SAVE_API keeps the GitHub token in its server-side
  // env (never shipped to the browser). Writes require the editor password,
  // which you type once per device; it lives only in this browser.
  const PW_KEY = 'edge-vision-cv-password';
  const pw = () => localStorage.getItem(PW_KEY) || '';

  let doc = null;
  let lang = localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'fr';
  let view = localStorage.getItem(VIEW_KEY) === 'letter' ? 'letter' : 'cv';
  let state = null;
  let editing = false;
  let serverOk = false;

  // Ancien format plat { identity… } (vieux brouillons) → enveloppé en bilingue.
  function normalizeDoc(d) {
    if (d && d.fr && d.fr.identity) {
      if (!(d.en && d.en.identity)) d.en = JSON.parse(JSON.stringify(d.fr));
    } else {
      d = { fr: d, en: JSON.parse(JSON.stringify(d)) };
    }
    // Vieux documents/brouillons sans lettre : structure vide, l'éditeur reste utilisable
    ['fr', 'en'].forEach((l) => {
      if (!d[l].letter) d[l].letter = { offer: { ...EMPTY_OFFER }, body: '' };
      d[l].letter.offer = { ...EMPTY_OFFER, ...(d[l].letter.offer || {}) };
      // `template` = lettre générique à {{marqueurs}}, préservée quand la
      // génération remplace `body` ; « Vider » y revient.
      if (!d[l].letter.template) d[l].letter.template = d[l].letter.body;
    });
    return d;
  }

  function applyLang() {
    const t = I18N[lang];
    document.documentElement.lang = lang;
    document.title = view === 'letter' ? t.letterTitle : t.title;
    $$('[data-i18n]').forEach((el) => {
      if (t[el.dataset.i18n]) el.textContent = t[el.dataset.i18n];
    });
    // toggleAttribute : `.hidden` (propriété HTMLElement) n'existe pas sur <svg>
    const flagEn = $('#flag-en');
    const flagFr = $('#flag-fr');
    if (flagEn) flagEn.toggleAttribute('hidden', lang === 'en');
    if (flagFr) flagFr.toggleAttribute('hidden', lang === 'fr');
    const btn = $('#btn-lang');
    if (btn) { btn.title = t.switchTo; btn.setAttribute('aria-label', t.switchTo); }
  }

  // ---- Onglets CV / Lettre --------------------------------------------------
  const TAB_ON = ['bg-accent', 'text-ink', 'border-accent', 'font-medium'];
  const TAB_OFF = ['border-line', 'text-muted', 'hover:text-mist', 'hover:border-accent'];
  function applyView() {
    $('#cv-sheet').hidden = view !== 'cv';
    $('#letter-sheet').hidden = view !== 'letter';
    $('#btn-offer').hidden = view !== 'letter';
    [['#tab-cv', 'cv'], ['#tab-letter', 'letter']].forEach(([sel, v]) => {
      const b = $(sel);
      if (!b) return;
      b.classList.remove(...TAB_ON, ...TAB_OFF);
      b.classList.add(...(view === v ? TAB_ON : TAB_OFF));
      b.setAttribute('aria-pressed', String(view === v));
    });
    document.title = view === 'letter' ? I18N[lang].letterTitle : I18N[lang].title;
    checkOverflow();
  }

  // ---- Lettre de motivation -------------------------------------------------
  // La lettre stockée est un GABARIT : le corps contient des {{marqueurs}}
  // ({{entreprise}}, {{poste}}, {{destinataire}}, {{source}}) remplacés à
  // l'affichage par les détails de l'offre. En mode édition on montre le
  // gabarit brut : Enregistrer conserve le générique, jamais le texte rempli.
  function fillPlaceholders(text) {
    const offer = state.letter.offer || {};
    const fb = I18N[lang].fallbacks;
    return String(text || '')
      .replace(/\{\{(\w+)\}\}/g, (m, k) => (offer[k] || '').trim() || fb[k] || m)
      // un remplacement en minuscules (« votre entreprise ») peut ouvrir un
      // paragraphe : on remet la majuscule en tête de paragraphe
      .replace(/(^|\n\s*\n)([a-zà-öø-ÿ])/g, (_m, p, c) => p + c.toUpperCase());
  }
  function renderLetter() {
    if (!state || !state.letter) return;
    const t = I18N[lang];
    const offer = state.letter.offer || {};
    $('#lt-name').textContent = get(state, 'identity.name') || '';
    $('#lt-sign').textContent = get(state, 'identity.name') || '';
    $('#lt-title').textContent = get(state, 'identity.title') || '';
    const wanted = ['email', 'e-mail', 'téléphone', 'phone', 'linkedin'];
    const lines = (state.contact || [])
      .filter((c) => wanted.some((w) => (c.label || '').toLowerCase().includes(w)))
      .map((c) => c.value);
    $('#lt-contact').textContent = lines.join('\n');
    $('#lt-citydate').textContent = t.cityDate(new Date());
    $('#lt-recipient').textContent =
      [offer.entreprise, offer.lieu].map((s) => (s || '').trim()).filter(Boolean).join('\n');
    const poste = (offer.poste || '').trim() || t.fallbacks.poste;
    // fr : élision devant voyelle/h — « au poste d'Ingénieur », « au poste de Data Scientist »
    $('#lt-objet').textContent = lang === 'fr'
      ? 'Objet : Candidature au poste ' + (/^[aeiouyhàâéèêëîïôöûü]/i.test(poste) ? 'd’' : 'de ') + poste
      : t.objetPrefix + poste;
    $('#lt-body').textContent = editing ? state.letter.body : fillPlaceholders(state.letter.body);
    checkOverflow();
  }

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
      host: '#certif-list', tpl: 'tpl-cert',
      blank: { name: 'Certification', year: 'Année' },
    },
    interests: {
      host: '#interest-list', tpl: 'tpl-cert',
      blank: { name: 'Intérêt', year: '' },
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
      blank: { name: 'Projet', year: 'Année', stack: 'Stack', desc: 'Description courte.' },
    },
  };

  function appendItem(key, data) {
    const cfg = LISTS[key];
    const node = tpl(cfg.tpl, cfg.map ? cfg.map(data) : data);
    if (key === 'experience') {
      const ul = $('[data-points]', node);
      (data.points || []).forEach((p) => ul.appendChild(tpl('tpl-point', { text: p })));
    }
    if (key === 'skills') {
      const itemsEl = $('[data-field="items"]', node);
      if (itemsEl) {
        itemsEl.innerHTML = '';
        const itemsArr = Array.isArray(data.items)
          ? data.items
          : String(data.items || '').split(/\s*[·,;]\s*/);
        itemsArr.forEach((itemText) => {
          const txt = itemText.trim();
          if (!txt) return;
          const tag = document.createElement('span');
          tag.className = 'skill-tag';
          tag.textContent = txt;
          itemsEl.appendChild(tag);
        });
      }
    }
    if (key === 'projects') {
      const stackEl = $('[data-field="stack"]', node);
      if (stackEl) {
        stackEl.innerHTML = '';
        const stackArr = String(data.stack || '').split(/\s*·\s*/);
        stackArr.forEach((st) => {
          const txt = st.trim();
          if (!txt) return;
          const tag = document.createElement('span');
          tag.className = 'stack-tag';
          tag.textContent = txt;
          stackEl.appendChild(tag);
        });
      }
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
    const host = $(cfg.host);
    if (host) host.appendChild(node);
    return node;
  }

  // ---- Render the whole sheet from state ---------------------------------
  function render() {
    $$('[data-edit]').forEach((el) => {
      el.textContent = get(state, el.dataset.edit) || '';
    });
    Object.keys(LISTS).forEach((key) => {
      const host = $(LISTS[key].host);
      if (!host) return;
      host.innerHTML = '';
      (state[key] || []).forEach((item) => appendItem(key, item));
    });
    renderLetter();
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
      if (!el || el.clientHeight === 0) return; // feuille masquée (onglet Lettre actif)
      el.style.setProperty('--sp', 1);
      // 8 passes : le ratio ne réduit que les marges, la convergence est lente
      for (let i = 0; i < 8; i++) {
        const cs = getComputedStyle(el);
        const padTop = parseFloat(cs.paddingTop) || 0;
        const padBot = parseFloat(cs.paddingBottom) || 0;
        const avail = el.clientHeight - padTop - padBot;
        let last = el.lastElementChild;
        while (last && last.offsetHeight === 0) last = last.previousElementSibling;
        if (!last) break;
        const content = last.offsetTop + last.offsetHeight - padTop;
        // Convergence asymétrique : ne s'arrêter que si le contenu TIENT (sinon la
        // garde une-page, à ±2px, resterait déclenchée à 3px de dépassement).
        if (content <= 0 || (content <= avail && avail - content < 3)) break;
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
    d.skills = $$('#skills-list [data-item]').map((it) => {
      const tags = $$('.skill-tag', it);
      const items = tags.length
        ? tags.map((t) => t.textContent.trim()).filter(Boolean)
        : fieldOf(it, 'items').split(/\s*[·,;]\s*/).filter(Boolean);
      return {
        category: fieldOf(it, 'category'),
        items: items,
      };
    });
    d.languages = $$('#lang-list [data-item]').map((it) => ({
      name: fieldOf(it, 'name'), level: fieldOf(it, 'level'),
    }));
    d.certifications = $$('#certif-list [data-item]').map((it) => ({
      name: fieldOf(it, 'name'), year: fieldOf(it, 'year'),
    }));
    d.interests = $$('#interest-list [data-item]').map((it) => ({
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
    d.projects = $$('#proj-list [data-item]').map((it) => {
      const tags = $$('.stack-tag', it);
      const stack = tags.length
        ? tags.map((t) => t.textContent.trim()).join(' · ')
        : fieldOf(it, 'stack');
      return {
        name: fieldOf(it, 'name'),
        year: fieldOf(it, 'year'),
        stack: stack,
        desc: fieldOf(it, 'desc'),
      };
    });
    // En édition, #lt-body affiche le corps brut : c'est lui qu'on stocke.
    // S'il contient encore des {{marqueurs}}, c'est le gabarit générique
    // qui vient d'être retouché — on le synchronise aussi.
    const lb = $('#lt-body');
    if (editing && lb) {
      d.letter.body = lb.textContent;
      if (/\{\{\w+\}\}/.test(d.letter.body)) d.letter.template = d.letter.body;
    }
    return d;
  }

  // ---- Edit mode ----------------------------------------------------------
  function applyEditable() {
    $$('[data-edit], [data-field], #lt-body').forEach((el) => {
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
    renderLetter(); // édition → gabarit brut ({{marqueurs}}) ; lecture → texte rempli
    checkOverflow();
  }

  // ---- One-page guard -----------------------------------------------------
  // Measure with the edit-only controls hidden so the warning reflects what
  // actually prints, not the +/× buttons inflating the columns.
  function checkOverflow() {
    const body = document.body;
    const wasEditing = body.classList.contains('editing');
    if (wasEditing) body.classList.remove('editing');
    const over = ['.side', '.mainc', '.ltc'].some((sel) => {
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
  async function save() {
    const data = collect();
    state = data;
    doc[lang] = data;

    // 1. Hosted proxy when logged in (password set) — saves from any device
    if (pw()) {
      let result;
      try {
        const r = await fetch(SAVE_API, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-CV-Password': pw() },
          body: JSON.stringify(doc),
        });
        result = r.ok
          ? { ok: true }
          : { ok: false, status: r.status, ...(await r.json().catch(() => ({}))) };
      } catch (err) {
        result = { ok: false, error: 'réseau indisponible' };
      }
      if (result.ok) {
        localStorage.removeItem(DRAFT_KEY);
        toast('Enregistré sur GitHub ✓');
      } else {
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify(doc)); } catch (err) {}
        if (result.status === 401) {
          localStorage.removeItem(PW_KEY);
          updateStatus();
          toast('Mot de passe incorrect — reconnectez-vous', true);
          openLogin();
        } else {
          toast('Échec : ' + (result.error || 'erreur') + ' — brouillon gardé', true);
        }
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
        body: JSON.stringify(doc, null, 2),
      });
      saved = r.ok;
    } catch (err) { /* no server */ }
    if (saved) {
      localStorage.removeItem(DRAFT_KEY);
      toast('Enregistré sur le serveur ✓');
    } else {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(doc)); } catch (err) {}
      toast('Serveur indisponible — brouillon gardé dans ce navigateur', true);
    }
    setEditing(false);
    render();
  }

  async function load() {
    let data = null;
    // 1. Hosted proxy — freshest committed CV, even right after a phone edit
    try {
      const r = await fetch(SAVE_API, { cache: 'no-store' });
      const ct = r.headers.get('content-type') || '';
      if (r.ok && ct.includes('json')) { data = await r.json(); }
    } catch (err) { /* not on Netlify */ }
    // 2. Live server data (node server.js, local dev)
    if (!data) {
      try {
        const r = await fetch(API, { cache: 'no-store' });
        const ct = r.headers.get('content-type') || '';
        if (r.ok && ct.includes('json')) { data = await r.json(); serverOk = true; }
      } catch (err) { /* static hosting */ }
    }
    // 3. Local draft (offline after an edit)
    if (!data) {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) { try { data = JSON.parse(draft); } catch (err) {} }
    }
    // 4. Seed file
    if (!data) {
      const r = await fetch(SEED, { cache: 'no-store' });
      data = await r.json();
    }
    doc = normalizeDoc(data);
    state = doc[lang];
    applyLang();
    applyView();
    updateStatus();
    const resetBtn = $('#btn-reset');
    if (resetBtn) resetBtn.hidden = !localStorage.getItem(DRAFT_KEY);
    render();
  }

  // ---- Online login (password) --------------------------------------------
  function updateStatus() {
    const el = $('#srv-status');
    if (!el) return;
    const online = !!pw();
    el.textContent = online ? 'connecté (en ligne)' : serverOk ? 'serveur connecté' : 'mode local';
    el.classList.toggle('text-emerald', online || serverOk);
  }

  const loginModal = $('#login-modal');

  function openLogin() {
    const connected = !!pw();
    $('#login-desc').textContent = connected
      ? 'Vous êtes connecté sur cet appareil. Entrez un nouveau mot de passe pour le remplacer, ou déconnectez-vous.'
      : 'Entrez le mot de passe d’édition pour enregistrer le CV directement sur GitHub depuis cet appareil.';
    $('#login-disconnect').hidden = !connected;
    const input = $('#login-input');
    input.value = '';
    input.type = 'password';
    $('#login-show').checked = false;
    loginModal.style.display = 'flex';
    setTimeout(() => input.focus(), 30);
  }
  function closeLogin() { loginModal.style.display = 'none'; }

  $('#login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const password = $('#login-input').value.trim();
    if (!password) { $('#login-input').focus(); return; }
    localStorage.setItem(PW_KEY, password);
    closeLogin();
    updateStatus();
    toast('Connecté ✓ — les enregistrements iront sur GitHub');
  });
  $('#login-disconnect').addEventListener('click', () => {
    localStorage.removeItem(PW_KEY);
    closeLogin();
    updateStatus();
    toast('Déconnecté', true);
  });
  $('#login-cancel').addEventListener('click', closeLogin);
  $('#login-show').addEventListener('change', (e) => {
    $('#login-input').type = e.target.checked ? 'text' : 'password';
  });
  loginModal.addEventListener('click', (e) => {
    if (e.target.matches('[data-login-backdrop]')) closeLogin();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (loginModal.style.display !== 'none') closeLogin();
    const om = $('#offer-modal');
    if (om && om.style.display !== 'none') om.style.display = 'none';
  });

  // ---- Onglets ------------------------------------------------------------
  function setView(v) {
    if (view === v) return;
    view = v;
    localStorage.setItem(VIEW_KEY, v);
    applyView();
    if (v === 'cv') autoSpace(); // la feuille CV vient de redevenir mesurable
    renderLetter();
    checkOverflow();
  }
  $('#tab-cv').addEventListener('click', () => setView('cv'));
  $('#tab-letter').addEventListener('click', () => setView('letter'));

  // ---- Formulaire « Offre » : coller → analyser → corriger → générer --------
  const offerModal = $('#offer-modal');
  const OFFER_FIELDS = ['entreprise', 'poste', 'focus', 'domaine', 'exigence1', 'exigence2', 'lieu'];
  const PROFILE_NAMES = {
    robotics3d: { fr: 'profil : 3D / robotique', en: 'profile: 3D / robotics' },
    edgeai: { fr: 'profil : Edge AI', en: 'profile: Edge AI' },
    industrial: { fr: 'profil : vision industrielle', en: 'profile: industrial vision' },
  };
  function offerFormValues() {
    const o = { texte: $('#offer-text').value, profile: state.letter.offer.profile || '' };
    OFFER_FIELDS.forEach((k) => { o[k] = $('#offer-' + k).value.trim(); });
    return o;
  }
  function fillOfferForm(o) {
    $('#offer-text').value = o.texte || '';
    OFFER_FIELDS.forEach((k) => { $('#offer-' + k).value = o[k] || ''; });
    $('#offer-profile').textContent = o.profile ? (PROFILE_NAMES[o.profile] || {})[lang] || '' : '';
  }
  function openOffer() {
    fillOfferForm(state.letter.offer);
    offerModal.style.display = 'flex';
    setTimeout(() => $('#offer-text').focus(), 30);
  }
  function closeOffer() { offerModal.style.display = 'none'; }
  $('#btn-offer').addEventListener('click', openOffer);
  $('#offer-cancel').addEventListener('click', closeOffer);
  offerModal.addEventListener('click', (e) => {
    if (e.target.matches('[data-offer-backdrop]')) closeOffer();
  });

  // Analyse locale (mots-clés) : remplit les champs, ne touche pas à la lettre
  $('#offer-analyze').addEventListener('click', () => {
    const text = $('#offer-text').value.trim();
    if (!text) { toast('Collez d’abord le texte de l’offre', true); return; }
    const res = LetterGen.analyze(text, lang);
    const current = offerFormValues();
    OFFER_FIELDS.forEach((k) => {
      if (res.fields[k]) $('#offer-' + k).value = res.fields[k];
      else if (!current[k]) $('#offer-' + k).value = '';
    });
    state.letter.offer.profile = res.profile;
    $('#offer-profile').textContent = (PROFILE_NAMES[res.profile] || {})[lang] || '';
    toast('Offre analysée — vérifiez/corrigez les champs puis Générer');
  });

  // Génération heuristique : assemble la lettre modulaire et remplace le corps
  $('#offer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const o = offerFormValues();
    if ($('#offer-text').value.trim() && !o.profile) o.profile = LetterGen.detectProfile($('#offer-text').value);
    state.letter.offer = { ...EMPTY_OFFER, ...o };
    state.letter.body = LetterGen.generate({ ...o }, lang, o.profile || undefined);
    renderLetter();
    closeOffer();
    toast('Lettre générée — relisez, ajustez via ✎ Modifier, puis Enregistrer');
  });

  // IA (OpenRouter via fonction Netlify / server.js) : analyse + rédaction.
  // Passe par le mot de passe éditeur pour ne pas exposer un endpoint ouvert.
  $('#offer-ai').addEventListener('click', async () => {
    const text = $('#offer-text').value.trim();
    if (!text) { toast('Collez d’abord le texte de l’offre', true); return; }
    const btn = $('#offer-ai');
    btn.disabled = true;
    const prev = btn.textContent;
    btn.textContent = '… analyse en cours';
    try {
      const payload = JSON.stringify({ text, lang });
      const headers = { 'Content-Type': 'application/json', 'X-CV-Password': pw() };
      let r = null;
      for (const url of ['/.netlify/functions/letter', 'api/letter']) {
        try {
          r = await fetch(url, { method: 'POST', headers, body: payload });
          // 404/405 = endpoint absent ici (statique local ou Netlify) → suivant
          if (r.status !== 404 && r.status !== 405) break;
        } catch (err) { r = null; }
      }
      if (!r) throw new Error('service IA injoignable');
      if (r.status === 401) { openLogin(); throw new Error('mot de passe requis (⚙ Connexion)'); }
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.letter) throw new Error(data.error || 'réponse IA invalide');
      const o = { ...EMPTY_OFFER, texte: text, ...(data.fields || {}) };
      state.letter.offer = o;
      state.letter.body = String(data.letter).trim();
      fillOfferForm(o);
      renderLetter();
      closeOffer();
      toast('Lettre rédigée par IA — relisez et ajustez avant d’enregistrer');
    } catch (err) {
      toast('IA indisponible : ' + err.message + ' — utilisez ⌕ Analyser', true);
    } finally {
      btn.disabled = false;
      btn.textContent = prev;
    }
  });

  // Vider : retour à la lettre générique ({{marqueurs}}), offre effacée
  $('#offer-clear').addEventListener('click', () => {
    state.letter.offer = { ...EMPTY_OFFER };
    state.letter.body = state.letter.template || state.letter.body;
    fillOfferForm(state.letter.offer);
    renderLetter();
    closeOffer();
    toast('Offre vidée — lettre générique restaurée');
  });

  // ---- Wiring -------------------------------------------------------------
  $('#btn-login').addEventListener('click', openLogin);
  $('#btn-edit').addEventListener('click', () => setEditing(true));
  $('#btn-cancel').addEventListener('click', () => { setEditing(false); render(); });
  $('#btn-save').addEventListener('click', save);
  $('#btn-print').addEventListener('click', () => window.print());
  $('#btn-lang').addEventListener('click', () => {
    if (editing) doc[lang] = collect(); // garde les modifs en cours lors du basculement
    lang = lang === 'fr' ? 'en' : 'fr';
    localStorage.setItem(LANG_KEY, lang);
    state = doc[lang];
    applyLang();
    render();
  });
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
    if (!editing) return;
    if (e.target.closest('#cv-sheet')) {
      autoSpace();
      checkOverflow();
    } else if (e.target.closest('#letter-sheet')) {
      checkOverflow(); // la lettre n'utilise pas l'espacement auto
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
