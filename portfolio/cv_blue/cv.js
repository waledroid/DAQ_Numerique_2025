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

  const API = '../api/cv_blue';                // local node server.js (dev only) → cv_blue/cv.json
  const SAVE_API = '/.netlify/functions/cv?doc=cv_blue'; // hosted proxy — GitHub token côté serveur, même mot de passe que cv.html
  const SEED = 'cv.json';
  const DRAFT_KEY = 'cv-blue-draft-v1';
  const LANG_KEY = 'cv-blue-lang';
  const VIEW_KEY = 'cv-blue-view'; // 'cv' | 'letter'
  const CV_KEY = 'cv-blue-variant'; // id du CV actif (onglet sous « CV »)

  // ---- Bilingual, multi-CV document ---------------------------------------
  // cv.json = { cvs: [ { id, label: {fr,en}, fr: {…, letter}, en: {…, letter} }, … ] }
  // Plusieurs CV (un onglet chacun sous « CV »), chacun avec SA lettre de
  // motivation. `doc` tient tout ; `state` pointe sur la langue active du CV
  // actif, `letter` sur sa lettre (= state.letter).
  const I18N = {
    fr: {
      title: 'CV — Abdullahi Atanda',
      letterTitle: 'Lettre de motivation — Abdullahi Atanda',
      tabCv: 'CV', tabLetter: 'Lettre de motivation',
      addCv: '+ CV', addCvPrompt: 'Nom du nouveau CV (copie du CV affiché) :', renameCv: 'Renommer ce CV', renamePrompt: 'Nouveau nom :',
      deleteCv: 'Supprimer ce CV', deleteConfirm: (n) => `Supprimer le CV « ${n} » ? (effectif après Enregistrer)`,
      objetPrefix: 'Objet : Candidature au poste de ',
      contact: 'Contact',
      profile: 'Profil', skills: 'Compétences Clés', experience: 'Expérience Professionnelle',
      education: 'Formation', certifications: 'Certifications', projects: 'Projets',
      languages: 'Langues', interests: 'Centres d’intérêt', availability: 'Disponibilité',
      switchTo: 'Switch to English',
      // Texte utilisé quand un champ de l'offre est vide (lettre générique)
      fallbacks: { destinataire: 'Madame, Monsieur', entreprise: 'votre établissement', poste: 'Équipier polyvalent', source: 'votre annonce', domaine: 'la restauration rapide', focus: 'le service en période de forte affluence' },
      dateSuffix: (d) => `, le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    },
    en: {
      title: 'Resume — Abdullahi Atanda',
      letterTitle: 'Cover Letter — Abdullahi Atanda',
      tabCv: 'Resume', tabLetter: 'Cover letter',
      addCv: '+ Resume', addCvPrompt: 'Name of the new resume (copy of the current one):', renameCv: 'Rename this resume', renamePrompt: 'New name:',
      deleteCv: 'Delete this resume', deleteConfirm: (n) => `Delete resume “${n}”? (applied on Save)`,
      objetPrefix: 'Re: Application for ',
      contact: 'Contact',
      profile: 'Profile', skills: 'Core Skills', experience: 'Professional Experience',
      education: 'Education', certifications: 'Certifications', projects: 'Projects',
      languages: 'Languages', interests: 'Interests', availability: 'Availability',
      switchTo: 'Passer en français',
      fallbacks: { destinataire: 'Hiring Manager', entreprise: 'your establishment', poste: 'Crew Member', source: 'your job posting', domaine: 'fast-food service', focus: 'busy service periods' },
      dateSuffix: (d) => `, ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    },
  };

  const EMPTY_OFFER = { texte: '', entreprise: '', poste: '', focus: '', domaine: '', exigence1: '', exigence2: '', lieu: '', profile: '' };

  // Intitulés propres à une variante de CV. Ex. « oenologie » : candidature à
  // une formation, pas à un poste — la section « Disponibilité » porte le
  // projet professionnel et l'objet de la lettre ne dit pas « au poste de ».
  // `objet` ne s'applique que si aucun poste n'est saisi dans l'offre.
  const I18N_CV = {
    oenologie: {
      fr: { availability: 'Projet Professionnel', objet: 'Objet : Candidature au DU Technicien en Œnologie' },
      en: { availability: 'Career Objective', objet: 'Re: Application — DU Technicien en Œnologie (University Diploma in Oenology)' },
    },
  };
  const cvI18n = () => (I18N_CV[cvId] || {})[lang] || {};

  // ---- Online editing from any device (phone included) --------------------
  // The Netlify function at SAVE_API keeps the GitHub token in its server-side
  // env (never shipped to the browser). Writes require the editor password,
  // which you type once per device; it lives only in this browser.
  const PW_KEY = 'edge-vision-cv-password'; // partagé avec cv.html : une seule connexion
  const pw = () => localStorage.getItem(PW_KEY) || '';

  let doc = null;
  let lang = localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'fr';
  let view = localStorage.getItem(VIEW_KEY) === 'letter' ? 'letter' : 'cv';
  let cvId = localStorage.getItem(CV_KEY) || '';
  let state = null;
  let letter = null;
  let editing = false;
  let serverOk = false;

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const DEFAULT_CV = { id: 'restaurant', label: { fr: 'Restaurant', en: 'Restaurant' } };

  // Migre les anciens formats vers { cvs: [ { id, label, fr, en } ] } :
  //  - plat { identity… }                         (tout premiers brouillons)
  //  - bilingue { fr: {…, letter}, en: {…, letter} } (un seul CV)
  //  - { cvs, letter } (lettre partagée, transitoire) → lettre recopiée dans chaque CV
  function normalizeDoc(d) {
    if (!(d && Array.isArray(d.cvs) && d.cvs.length)) {
      let fr, en;
      if (d && d.fr && d.fr.identity) { fr = d.fr; en = (d.en && d.en.identity) ? d.en : clone(d.fr); }
      else { fr = d; en = clone(d); }
      d = { cvs: [{ ...DEFAULT_CV, fr, en }] };
    }
    const shared = d.letter || {};
    delete d.letter;
    d.cvs.forEach((cv, i) => {
      if (!cv.id) cv.id = 'cv' + (i + 1);
      if (typeof cv.label === 'string') cv.label = { fr: cv.label, en: cv.label };
      if (!cv.label) cv.label = { fr: cv.id, en: cv.id };
      if (!(cv.fr && cv.fr.identity)) cv.fr = clone(cv.en);
      if (!(cv.en && cv.en.identity)) cv.en = clone(cv.fr);
      ['fr', 'en'].forEach((l) => {
        // Vieux documents/brouillons sans lettre : structure vide, l'éditeur reste utilisable
        if (!cv[l].letter) cv[l].letter = shared[l] ? clone(shared[l]) : { offer: { ...EMPTY_OFFER }, body: '' };
        const lt = cv[l].letter;
        lt.offer = { ...EMPTY_OFFER, ...(lt.offer || {}) };
        // `template` = lettre générique à {{marqueurs}}, préservée quand la
        // génération remplace `body` ; « Vider » y revient.
        if (!lt.template) lt.template = lt.body;
        // Ville de l'expéditeur (la date, elle, est toujours générée du jour)
        if (!lt.ville) lt.ville = 'Beaune';
      });
    });
    return d;
  }

  // CV actif (onglet) : retombe sur le premier si l'id mémorisé n'existe plus
  function activeCv() {
    let cv = doc.cvs.find((c) => c.id === cvId);
    if (!cv) { cv = doc.cvs[0]; cvId = cv.id; localStorage.setItem(CV_KEY, cvId); }
    return cv;
  }
  function bindState() {
    state = activeCv()[lang];
    letter = state.letter;
    document.body.dataset.cv = cvId; // permet un style par variante (ex. taille de police)
  }
  const cvLabel = (cv) => (cv.label && (cv.label[lang] || cv.label.fr || cv.label.en)) || cv.id;

  function applyLang() {
    const t = I18N[lang];
    document.documentElement.lang = lang;
    document.title = docTitle();
    const ov = cvI18n();
    $$('[data-i18n]').forEach((el) => {
      const v = ov[el.dataset.i18n] || t[el.dataset.i18n];
      if (v) el.textContent = v;
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
    // style.display : la classe utilitaire `flex` l'emporterait sur l'attribut hidden
    const tabs = $('#cv-tabs');
    if (tabs) tabs.style.display = view === 'cv' ? '' : 'none';
    renderCvTabs();
    document.title = docTitle();
    checkOverflow();
  }
  // « CV Restaurant — Abdullahi Atanda » : sert aussi de nom de fichier PDF
  function docTitle() {
    const t = I18N[lang];
    if (view === 'letter') return t.letterTitle;
    if (!doc || doc.cvs.length < 2) return t.title;
    return t.title.replace(' — ', ` ${cvLabel(activeCv())} — `);
  }

  // ---- Sous-onglets : variantes de CV ---------------------------------------
  const SUB_ON = ['bg-emerald/15', 'text-emerald', 'border-emerald', 'font-medium'];
  const SUB_OFF = ['border-line', 'text-muted', 'hover:text-mist', 'hover:border-emerald'];
  const SUB_BASE = 'font-mono text-[0.62rem] tracking-widest uppercase rounded-full px-4 py-1.5 border transition';
  function renderCvTabs() {
    const host = $('#cv-tabs');
    if (!host || !doc) return;
    host.innerHTML = '';
    const active = activeCv();
    doc.cvs.forEach((cv) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = SUB_BASE + ' ' + (cv === active ? SUB_ON : SUB_OFF).join(' ');
      b.textContent = cvLabel(cv);
      b.setAttribute('aria-pressed', String(cv === active));
      b.addEventListener('click', () => setCv(cv.id));
      host.appendChild(b);
    });
    const t = I18N[lang];
    const mk = (text, title, cls, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'edit-only ' + SUB_BASE + ' ' + cls;
      b.textContent = text; b.title = title; b.setAttribute('aria-label', title);
      b.addEventListener('click', fn);
      host.appendChild(b);
    };
    mk(t.addCv, t.addCvPrompt, 'border-dashed border-line text-muted hover:text-accent hover:border-accent', addCv);
    mk('✎', t.renameCv, 'border-line text-muted hover:text-mist', renameCv);
    if (doc.cvs.length > 1) mk('✕', t.deleteCv, 'border-line text-muted hover:text-red-400 hover:border-red-400/60', deleteCv);
  }
  function setCv(id) {
    if (id === cvId) return;
    if (editing) activeCv()[lang] = collect(); // garde les modifs en cours
    cvId = id;
    localStorage.setItem(CV_KEY, id);
    bindState();
    renderCvTabs();
    applyLang(); // intitulés par variante (I18N_CV) + titre du document
    render();
  }
  const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cv';
  function addCv() {
    const t = I18N[lang];
    const name = (prompt(t.addCvPrompt, '') || '').trim();
    if (!name) return;
    if (editing) activeCv()[lang] = collect();
    const src = activeCv();
    let id = slug(name); let n = 2;
    while (doc.cvs.some((c) => c.id === id)) id = slug(name) + '-' + n++;
    doc.cvs.push({ id, label: { fr: name, en: name }, fr: clone(src.fr), en: clone(src.en) });
    setCv(id);
  }
  function renameCv() {
    const t = I18N[lang];
    const cv = activeCv();
    const name = (prompt(t.renamePrompt, cvLabel(cv)) || '').trim();
    if (!name) return;
    cv.label[lang] = name;
    // même libellé dans l'autre langue s'il n'a jamais été personnalisé
    const other = lang === 'fr' ? 'en' : 'fr';
    if (!cv.label[other] || cv.label[other] === cv.id) cv.label[other] = name;
    renderCvTabs();
    document.title = docTitle();
  }
  function deleteCv() {
    const t = I18N[lang];
    if (doc.cvs.length < 2) return;
    const cv = activeCv();
    if (!confirm(t.deleteConfirm(cvLabel(cv)))) return;
    doc.cvs = doc.cvs.filter((c) => c !== cv);
    cvId = doc.cvs[0].id;
    localStorage.setItem(CV_KEY, cvId);
    bindState();
    renderCvTabs();
    applyLang(); // intitulés par variante (I18N_CV) + titre du document
    render();
  }

  // ---- Lettre de motivation -------------------------------------------------
  // La lettre stockée est un GABARIT : le corps contient des {{marqueurs}}
  // ({{entreprise}}, {{poste}}, {{destinataire}}, {{source}}) remplacés à
  // l'affichage par les détails de l'offre. En mode édition on montre le
  // gabarit brut : Enregistrer conserve le générique, jamais le texte rempli.
  function fillPlaceholders(text) {
    const offer = letter.offer || {};
    const fb = I18N[lang].fallbacks;
    return String(text || '')
      .replace(/\{\{(\w+)\}\}/g, (m, k) => (offer[k] || '').trim() || fb[k] || m)
      // un remplacement en minuscules (« votre entreprise ») peut ouvrir un
      // paragraphe : on remet la majuscule en tête de paragraphe
      .replace(/(^|\n\s*\n)([a-zà-öø-ÿ])/g, (_m, p, c) => p + c.toUpperCase());
  }
  function renderLetter() {
    if (!state || !letter) return;
    const t = I18N[lang];
    const offer = letter.offer || {};
    $('#lt-name').textContent = get(state, 'identity.name') || '';
    $('#lt-sign').textContent = get(state, 'identity.name') || '';
    $('#lt-title').textContent = get(state, 'identity.title') || '';
    const wanted = ['email', 'e-mail', 'téléphone', 'phone', 'linkedin'];
    const lines = (state.contact || [])
      .filter((c) => wanted.some((w) => (c.label || '').toLowerCase().includes(w)))
      .map((c) => c.value);
    $('#lt-contact').textContent = lines.join('\n');
    $('#lt-city').textContent = (letter.ville || '').trim() || 'Beaune';
    $('#lt-date').textContent = t.dateSuffix(new Date());
    $('#lt-recipient').textContent =
      [offer.entreprise, offer.lieu].map((s) => (s || '').trim()).filter(Boolean).join('\n');
    const poste = (offer.poste || '').trim() || t.fallbacks.poste;
    // fr : élision devant voyelle/h — « au poste d'Ingénieur », « au poste de Data Scientist »
    $('#lt-objet').textContent = (!(offer.poste || '').trim() && cvI18n().objet)
      ? cvI18n().objet // variante avec objet dédié (ex. candidature à une formation)
      : lang === 'fr'
        ? 'Objet : Candidature au poste ' + (/^[aeiouyhàâéèêëîïôöûü]/i.test(poste) ? 'd’' : 'de ') + poste
        : t.objetPrefix + poste;
    $('#lt-body').textContent = editing ? letter.body : fillPlaceholders(letter.body);
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
      markEmptySection(host);
    });
    renderLetter();
    applyEditable();
    autoSpace();
    checkOverflow();
  }

  // Le <h2 class="sec"> qui précède une liste vide est masqué hors édition
  function markEmptySection(host) {
    const h = host.previousElementSibling;
    if (h && h.classList.contains('sec')) h.classList.toggle('is-empty', !host.children.length);
  }
  function markEmptySections() {
    Object.keys(LISTS).forEach((key) => { const host = $(LISTS[key].host); if (host) markEmptySection(host); });
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
    // En édition, #lt-body affiche le corps brut : c'est lui qu'on stocke.
    // S'il contient encore des {{marqueurs}}, c'est le gabarit générique
    // qui vient d'être retouché — on le synchronise aussi.
    const lb = $('#lt-body');
    if (editing && lb && d.letter) {
      d.letter.body = lb.textContent;
      if (/\{\{\w+\}\}/.test(d.letter.body)) d.letter.template = d.letter.body;
      d.letter.ville = ($('#lt-city').textContent || '').trim() || 'Beaune';
    }
    return d;
  }

  // ---- Edit mode ----------------------------------------------------------
  function applyEditable() {
    $$('[data-edit], [data-field], #lt-body, #lt-city').forEach((el) => {
      if (editing) el.setAttribute('contenteditable', 'true');
      else el.removeAttribute('contenteditable');
    });
  }
  let docSnapshot = null; // état du document à l'entrée en édition (pour « Annuler »)
  function setEditing(on) {
    if (on && !editing) docSnapshot = { doc: clone(doc), cvId };
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
    activeCv()[lang] = data;
    bindState();

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
    bindState();
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
    if (editing) { activeCv()[lang] = collect(); bindState(); } // garde les modifs en cours (CV et lettre)
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
    const o = { texte: $('#offer-text').value, profile: letter.offer.profile || '' };
    OFFER_FIELDS.forEach((k) => { o[k] = $('#offer-' + k).value.trim(); });
    return o;
  }
  function fillOfferForm(o) {
    $('#offer-text').value = o.texte || '';
    OFFER_FIELDS.forEach((k) => { $('#offer-' + k).value = o[k] || ''; });
    $('#offer-profile').textContent = o.profile ? (PROFILE_NAMES[o.profile] || {})[lang] || '' : '';
  }
  function openOffer() {
    fillOfferForm(letter.offer);
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
    letter.offer.profile = res.profile;
    $('#offer-profile').textContent = (PROFILE_NAMES[res.profile] || {})[lang] || '';
    toast('Offre analysée — vérifiez/corrigez les champs puis Générer');
  });

  // Génération heuristique : assemble la lettre modulaire et remplace le corps
  $('#offer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const o = offerFormValues();
    if ($('#offer-text').value.trim() && !o.profile) o.profile = LetterGen.detectProfile($('#offer-text').value);
    letter.offer = { ...EMPTY_OFFER, ...o };
    letter.body = LetterGen.generate({ ...o }, lang, o.profile || undefined);
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
      letter.offer = o;
      letter.body = String(data.letter).trim();
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
    letter.offer = { ...EMPTY_OFFER };
    letter.body = letter.template || letter.body;
    fillOfferForm(letter.offer);
    renderLetter();
    closeOffer();
    toast('Offre vidée — lettre générique restaurée');
  });

  // ---- Wiring -------------------------------------------------------------
  $('#btn-login').addEventListener('click', openLogin);
  $('#btn-edit').addEventListener('click', () => setEditing(true));
  $('#btn-cancel').addEventListener('click', () => {
    // Annuler rétablit aussi les CV ajoutés/renommés/supprimés pendant l'édition
    if (docSnapshot) { doc = normalizeDoc(docSnapshot.doc); cvId = docSnapshot.cvId; docSnapshot = null; bindState(); renderCvTabs(); }
    setEditing(false);
    render();
  });
  $('#btn-save').addEventListener('click', save);
  $('#btn-print').addEventListener('click', () => window.print());
  $('#btn-lang').addEventListener('click', () => {
    if (editing) activeCv()[lang] = collect(); // garde les modifs en cours lors du basculement
    lang = lang === 'fr' ? 'en' : 'fr';
    localStorage.setItem(LANG_KEY, lang);
    bindState();
    applyLang();
    renderCvTabs();
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
      markEmptySections();
      autoSpace();
      checkOverflow();
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add && editing) {
      const key = add.dataset.add;
      const node = appendItem(key, LISTS[key].blank);
      markEmptySections();
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
