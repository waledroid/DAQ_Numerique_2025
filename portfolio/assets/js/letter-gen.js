/* ============================================================
   EDGE VISION — LetterGen (letter-gen.js)
   Moteur heuristique de lettre de motivation : analyse d'une
   offre d'emploi par mots-clés (aucune API), classement du
   profil du poste, puis assemblage d'une lettre modulaire
   [ouverture][projet 1][projet 2][adéquation][clôture] à partir
   d'une base d'expériences VÉRIFIÉES (rien d'inventé).

   UMD minimal : global navigateur `LetterGen` + module.exports,
   pour être partagé par cv.js, server.js et la fonction Netlify.
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LetterGen = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // ---- Base d'expériences (faits réels du CV uniquement) -------------------
  const EXPERIENCE = {
    isitec: {
      fr: {
        vision3d: "Chez Isitec International, j'ai développé un système de perception multi-caméras temps réel (~60 FPS) pour le suivi 2D/3D de colis : calibration des caméras et outillage avec isiCal (ChArUco/Multical), triangulation et fusion multi-caméras, communication avec des AGV.",
        edge: "Chez Isitec International, j'ai travaillé sur toute la chaîne d'un moteur de détection et de segmentation (mAP@50 ≈ 0,96) : de l'entraînement à l'optimisation FP16/INT8 avec OpenVINO et TensorRT, jusqu'à l'intégration aux automates de tri (PLC) sur ligne de production.",
        industriel: "Chez Isitec International, j'ai développé un système de perception multi-caméras temps réel (~60 FPS) pour le suivi 2D/3D de colis, en couvrant toute la chaîne : calibration et outillage avec isiCal, optimisation de modèles (FP16/INT8, OpenVINO, TensorRT) et intégration aux automates (PLC). J'ai aussi créé isiGen, une chaîne de données synthétiques (SDXL, SAM2) pour la génération automatisée de datasets annotés, afin de pallier le manque de données réelles étiquetées.",
      },
      en: {
        vision3d: "At Isitec International, I developed a real-time multi-camera perception system running at ~60 FPS for 2D/3D parcel tracking: camera calibration and tooling with isiCal (ChArUco/Multical), triangulation and multi-camera fusion, communicating with AGVs.",
        edge: "At Isitec International, I worked across the full pipeline of a detection and segmentation engine (mAP@50 ≈ 0.96): from training to FP16/INT8 optimization with OpenVINO and TensorRT, through to sorting PLC integration on production lines.",
        industriel: "At Isitec International, I developed a real-time multi-camera perception system running at ~60 FPS for 2D/3D parcel tracking, working across the full pipeline: camera calibration and tooling with isiCal, model optimization (FP16/INT8, OpenVINO, TensorRT) and PLC integration. I also built isiGen, a synthetic-data pipeline (SDXL, SAM2) for automated dataset generation and fast annotation, addressing the challenge of limited real-world labeled data.",
      },
    },
    wasoria: {
      fr: "Lors de mon stage chez WASORIA, j'ai compressé l'encodeur d'images de SAM, un Vision Transformer, par distillation de connaissances et optimisation TensorRT sur Jetson Orin Nano : +25 % de débit de segmentation et −40 % de latence d'inférence.",
      en: "During my internship at WASORIA, I compressed the SAM image encoder, a Vision Transformer, using knowledge distillation and TensorRT optimization on a Jetson Orin Nano — improving segmentation throughput by 25% while reducing inference latency by 40%.",
    },
    rosbot: {
      fr: "Mon expérience couvre aussi la vision stéréo, la localisation 3D et la robotique : mon projet ROSBot Harmony (C++, ROS 2, MoveIt) couvre la navigation autonome, la coordination multi-robots et la planification de mouvements pour une flotte mobile.",
      en: "My experience also covers stereo vision, 3D localization and robotics: my ROSBot Harmony project (C++, ROS 2, MoveIt) spans autonomous navigation, multi-robot coordination and motion planning for a mobile fleet.",
    },
    profil: {
      fr: "Titulaire d'un Master 2 en Vision par Ordinateur, je travaille principalement en Python et PyTorch, et en C++ lorsque les contraintes temps réel l'exigent — avec le souci constant de livrer des systèmes fiables, du prototype à la production.",
      en: "With an M2 in Computer Vision, I work primarily in Python and PyTorch, and in C++ when real-time performance and system-level constraints require it — always with a focus on shipping reliable systems from prototype to production.",
    },
  };

  // ---- Lettre générique (candidature large, sans offre analysée) ------------
  // Version préférée : ouverture (M2 + perception temps réel), projet Isitec
  // avec bilan, paragraphe d'ampleur (stéréo/3D/robotique + WASORIA + langages),
  // paragraphe d'adéquation, puis clôture. `poste`/`entreprise` s'insèrent avec
  // leurs valeurs par défaut génériques.
  function genericLetter(L, poste, entreprise) {
    if (L === 'fr') {
      const qu = /^[aeiouyhàâéèêëîïôöûü]/i.test(poste) ? "qu'" : 'que ';
      return [
        `Madame, Monsieur,\n\nJe vous adresse ma candidature pour rejoindre ${entreprise} en tant ${qu}${poste}. Titulaire d'un Master 2 en Vision par Ordinateur, j'ai construit mon expertise autour du traitement d'image, de l'extraction et de l'ingénierie de caractéristiques (feature engineering), ainsi que du développement de systèmes de vision temps réel et de leur déploiement sur des plateformes edge.`,
        `Mon expérience couvre l'ensemble de la chaîne de vision, de l'acquisition et du traitement des images jusqu'à l'optimisation des modèles et leur intégration dans des environnements industriels. Chez Isitec International, j'ai développé un système de perception multi-caméras temps réel (~60 FPS) pour le suivi 2D/3D de colis. J'ai travaillé sur la calibration des caméras avec isiCal, le traitement et l'exploitation des données de vision, l'optimisation des modèles en FP16/INT8 avec OpenVINO et TensorRT, ainsi que leur intégration avec les automates industriels (PLC).`,
        `J'ai également développé isiGen, une chaîne de génération de données synthétiques basée sur SDXL, ControlNet et SAM2, pour automatiser la génération d'images et accélérer leur annotation. J'y ai notamment intégré des méthodes de détection de contours afin de mieux contrôler la structure et les caractéristiques visuelles des images générées. Ce projet m'a permis de renforcer mes compétences en préparation de données, détection de contours, segmentation, annotation et conception de pipelines de vision.`,
        `Mon parcours comprend également la vision stéréo, la localisation et la reconstruction 3D, l'accélération de modèles de deep learning et la robotique avec ROS 2 et MoveIt. Chez WASORIA, j'ai travaillé sur la compression de l'encodeur d'image de SAM, un Vision Transformer, par distillation de connaissances et optimisation TensorRT pour un déploiement sur Jetson Orin Nano. Ce travail a permis d'améliorer de 25 % le débit de segmentation et de réduire de 40 % la latence d'inférence.`,
        `Je travaille principalement avec Python et PyTorch, et j'utilise C++ lorsque les contraintes de performance, de temps réel ou de déploiement système l'exigent. Mon objectif est de transformer les méthodes de vision et d'intelligence artificielle en systèmes fiables, performants et réellement déployables sur le terrain.`,
        `Je souhaite aujourd'hui mettre cette expérience au service de projets concrets en vision par ordinateur, perception et automatisation. Je serais particulièrement motivé à contribuer à des systèmes où le traitement d'image, la robustesse de la perception et les contraintes temps réel sont au cœur des enjeux.`,
        `Je serais heureux d'échanger avec vous sur la manière dont mon expérience en vision par ordinateur, traitement d'image, feature engineering, perception 3D, optimisation et déploiement edge pourrait contribuer aux projets de ${entreprise}.`,
        `Je vous remercie de votre attention et vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`,
      ].join('\n\n');
    }
    return [
      `Dear Hiring Manager,\n\nI am writing to apply to join ${entreprise} as a ${poste}. With an M2 in Computer Vision, I have built my expertise around image processing, feature extraction and feature engineering, and the development of real-time vision systems and their deployment on edge platforms.`,
      `My experience spans the entire vision pipeline, from image acquisition and processing to model optimization and integration into industrial environments. At Isitec International, I developed a real-time multi-camera perception system (~60 FPS) for 2D/3D parcel tracking. I worked on camera calibration with isiCal, the processing and exploitation of vision data, model optimization in FP16/INT8 with OpenVINO and TensorRT, and their integration with industrial controllers (PLC).`,
      `I also developed isiGen, a synthetic-data generation pipeline based on SDXL, ControlNet and SAM2, to automate image generation and speed up annotation. In particular, I integrated edge-detection methods to better control the structure and visual features of the generated images. This project strengthened my skills in data preparation, edge detection, segmentation, annotation and the design of vision pipelines.`,
      `My background also includes stereo vision, 3D localization and reconstruction, deep-learning model acceleration, and robotics with ROS 2 and MoveIt. At WASORIA, I worked on compressing the SAM image encoder, a Vision Transformer, through knowledge distillation and TensorRT optimization for deployment on a Jetson Orin Nano. This work improved segmentation throughput by 25% and reduced inference latency by 40%.`,
      `I work primarily with Python and PyTorch, and use C++ when performance, real-time or system-deployment constraints require it. My goal is to turn vision and AI methods into reliable, high-performance systems that can genuinely be deployed in the field.`,
      `I would now like to put this experience to work on concrete projects in computer vision, perception and automation. I would be especially motivated to contribute to systems where image processing, perception robustness and real-time constraints are central.`,
      `I would be glad to discuss how my experience in computer vision, image processing, feature engineering, 3D perception, optimization and edge deployment could contribute to ${entreprise}'s projects.`,
      `Thank you for your consideration.\n\nYours sincerely,`,
    ].join('\n\n');
  }

  // ---- Profils de poste : mots-clés pondérés --------------------------------
  const PROFILES = {
    robotics3d: {
      label: { fr: 'perception 3D et robotique', en: '3D perception and robotics' },
      keywords: ['ros', 'ros2', 'ros 2', 'moveit', 'robot', 'robotics', 'robotique', 'slam', 'navigation',
        'stereo', 'stéréo', 'point cloud', 'nuage de points', 'lidar', 'depth', 'profondeur', '3d',
        'motion planning', 'manipulation', 'drone', 'agv', 'amr', 'autonomous', 'autonome', 'adas',
        'localization', 'localisation', 'odometry', 'calibration'],
      skills: { fr: 'vision stéréo, localisation 3D, ROS 2/MoveIt et perception multi-caméras', en: 'stereo vision, 3D localization, ROS 2/MoveIt and multi-camera perception' },
    },
    edgeai: {
      label: { fr: "l'IA embarquée et l'optimisation de modèles", en: 'edge AI and model optimization' },
      keywords: ['edge', 'embedded', 'embarqué', 'jetson', 'tensorrt', 'openvino', 'onnx', 'quantization',
        'quantification', 'int8', 'fp16', 'compression', 'distillation', 'latency', 'latence',
        'optimization', 'optimisation', 'nvidia', 'cuda', 'arm', 'raspberry', 'low-power', 'inference', 'inférence'],
      skills: { fr: 'compression de modèles (distillation, INT8/FP16), TensorRT/OpenVINO et déploiement sur Jetson', en: 'model compression (distillation, INT8/FP16), TensorRT/OpenVINO and Jetson deployment' },
    },
    industrial: {
      label: { fr: 'la vision industrielle', en: 'industrial vision' },
      keywords: ['industrial', 'industriel', 'industrielle', 'factory', 'usine', 'production', 'manufacturing',
        'plc', 'automate', 'conveyor', 'convoyeur', 'inspection', 'quality', 'qualité', 'sorting', 'tri',
        'warehouse', 'entrepôt', 'logistics', 'logistique', 'defect', 'défaut', 'multi-camera', 'multi-caméras'],
      skills: { fr: 'vision multi-caméras temps réel, intégration automates (PLC) et données synthétiques', en: 'real-time multi-camera vision, PLC integration and synthetic data' },
    },
  };

  // ---- Termes techniques reconnus (extraction des exigences clés) -----------
  const TECH_TERMS = ['C++', 'Python', 'PyTorch', 'TensorFlow', 'ROS 2', 'ROS', 'MoveIt', 'TensorRT',
    'OpenVINO', 'ONNX', 'CUDA', 'Jetson', 'OpenCV', 'SLAM', 'LiDAR', 'GStreamer', 'MQTT', 'Docker',
    'Kubernetes', 'FastAPI', 'AWS', 'YOLO', 'DETR', 'ViT', 'Transformers', 'stereo', 'stéréo', '3D',
    'INT8', 'FP16', 'PLC', 'ADAS', 'SDXL', 'SAM2', 'ByteTrack', 'Linux', 'Git'];

  const count = (text, word) => {
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(^|[^\\w])' + esc + '($|[^\\w])', 'gi');
    return (text.match(re) || []).length;
  };

  function detectProfile(text) {
    const scores = {};
    Object.keys(PROFILES).forEach((p) => {
      scores[p] = PROFILES[p].keywords.reduce((s, k) => s + count(text, k), 0);
    });
    const best = Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0];
    return scores[best] > 0 ? best : 'industrial'; // défaut : cœur de l'expérience actuelle
  }

  // ---- Analyse heuristique de l'offre ---------------------------------------
  const TITLE_RE = /((?:ingénieur|développeur|architecte|lead|senior|junior)[^\n,.;:]{0,60}|[^\n,.;:]{0,60}(?:engineer|developer|scientist|architect))/i;

  function analyze(text, lang) {
    text = String(text || '');
    const profile = detectProfile(text);

    // Entreprise : « chez X », « at X », « rejoignez X », « join X »
    let entreprise = '';
    // verbes insensibles à la casse, mais le NOM doit garder ses majuscules
    const em = text.match(/\b(?:[Cc]hez|[Aa]t|[Rr]ejoignez|[Rr]ejoindre|[Jj]oin)\s+([A-Z][\w&.’'-]*(?:\s+[A-Z][\w&.’'-]*){0,2})/);
    if (em) entreprise = em[1].trim();

    // Poste : intitulé métier reconnu (première occurrence)
    let poste = '';
    const pm = text.match(TITLE_RE);
    if (pm) poste = pm[1].trim().replace(/\s+/g, ' ');

    // Lieu : « à Paris », « in Munich », « Paris, France », codes postaux…
    let lieu = '';
    const lm = text.match(/(?:\bà|\bin|\bbased in|\bposte basé à|\blocation\s*:?)\s+([A-Z][\wéèêàâôûïü-]+(?:[ -][A-Z][\wéèêàâôûïü-]+)?(?:,\s*[A-Z][\wéèêàâôûïü]+)?)/);
    if (lm) lieu = lm[1].trim();

    // Technologies présentes, par fréquence
    const techs = TECH_TERMS
      .map((t) => ({ t, n: count(text, t) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .map((x) => x.t);
    // « stéréo »/« stereo » : garder la variante de la langue cible
    const uniq = [...new Set(techs.map((t) => (t === 'stéréo' || t === 'stereo') ? (lang === 'fr' ? 'stéréo' : 'stereo') : t))];

    return {
      profile,
      fields: {
        entreprise,
        poste,
        focus: PROFILES[profile].label[lang] || '',
        domaine: '',
        exigence1: uniq[0] || '',
        exigence2: uniq[1] || '',
        lieu,
      },
    };
  }

  // ---- Assemblage modulaire de la lettre ------------------------------------
  // [ouverture][projet le plus pertinent][second projet][adéquation][clôture]
  function generate(fields, lang, profileOverride) {
    const f = fields || {};
    const profile = profileOverride || (PROFILES[f.profile] ? f.profile : null) || 'industrial';
    const L = lang === 'en' ? 'en' : 'fr';
    const P = PROFILES[profile];
    const isGeneric = !(f.entreprise || '').trim();
    const entreprise = (f.entreprise || '').trim() || (L === 'fr' ? 'votre entreprise' : 'your company');
    const poste = (f.poste || '').trim() || (L === 'fr' ? 'Ingénieur Vision par Ordinateur' : 'Computer Vision Engineer');

    // Aucune offre analysée → lettre générique préférée.
    if (isGeneric) return genericLetter(L, poste, entreprise);
    const focus = (f.focus || '').trim() || P.label[L];
    const domaine = (f.domaine || '').trim();
    const reqs = [f.exigence1, f.exigence2].map((s) => (s || '').trim()).filter(Boolean);
    const lieu = (f.lieu || '').trim();

    // Projet en tête selon le profil ; le second complète.
    const first = profile === 'edgeai' ? EXPERIENCE.wasoria[L] : EXPERIENCE.isitec[L][profile === 'robotics3d' ? 'vision3d' : profile === 'industrial' ? 'industriel' : 'edge'];
    const second = profile === 'edgeai'
      ? EXPERIENCE.isitec[L].edge
      : (profile === 'robotics3d' ? EXPERIENCE.rosbot[L] + ' ' + EXPERIENCE.wasoria[L] : EXPERIENCE.wasoria[L]);

    if (L === 'fr') {
      const ouverture = `Madame, Monsieur,\n\nActuellement Ingénieur Vision par Ordinateur & Edge-AI chez Isitec International, je vous adresse ma candidature au poste ${/^[aeiouyhàâéèêëîïôöûü]/i.test(poste) ? "d'" : 'de '}${poste} chez ${entreprise}.${domaine ? ` Votre travail autour de ${domaine} rejoint directement ce qui m'anime : ${focus}.` : ` Votre positionnement sur ${focus} rejoint directement ce qui m'anime.`}`;
      const adequation = `${reqs.length ? `Votre besoin en ${reqs.join(' et ')} correspond à mon quotidien : ` : 'Mon quotidien couvre précisément ce périmètre : '}${P.skills.fr}. ${EXPERIENCE.profil.fr}`;
      const cloture = `Je serais heureux d'échanger sur la façon dont cette expérience peut servir vos projets, lors d'un entretien${lieu ? `, à ${lieu} ou en visioconférence` : ''}. Je vous remercie de l'attention portée à ma candidature et vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`;
      return [ouverture, first, second, adequation, cloture].join('\n\n');
    }

    const opening = `Dear Hiring Manager,\n\nI am writing to apply for the ${poste} position at ${entreprise}. As a Computer Vision & Edge-AI Engineer at Isitec International, I focus on exactly what this role calls for: ${focus}.${domaine ? ` I am particularly drawn to ${entreprise}'s work on ${domaine}.` : ''}`;
    const match = `${reqs.length ? `Your need for ${reqs.join(' and ')} maps directly onto my day-to-day work: ` : 'My day-to-day work covers precisely this scope: '}${P.skills.en}. ${EXPERIENCE.profil.en}`;
    const closing = `I would welcome the opportunity to discuss how this experience could contribute to your team${lieu ? ` in ${lieu}` : ''}. Thank you for your time and consideration.\n\nYours sincerely,`;
    return [opening, first, second, match, closing].join('\n\n');
  }

  // ---- Support IA (OpenRouter) : prompt contraint + parsing robuste ---------
  // Partagé par netlify/functions/letter.js et server.js — le modèle ne peut
  // s'appuyer QUE sur les faits ci-dessus, jamais en inventer.
  function buildPrompt(text, lang) {
    const L = lang === 'en' ? 'en' : 'fr';
    const facts = JSON.stringify({
      isitec: EXPERIENCE.isitec[L],
      wasoria: EXPERIENCE.wasoria[L],
      rosbot: EXPERIENCE.rosbot[L],
      profil: EXPERIENCE.profil[L],
    });
    return [
      'You are helping Atanda Abdullahi, a Computer Vision & Edge-AI Engineer, apply to a job.',
      'Below is a job offer, then a JSON of his VERIFIED experience facts.',
      'Tasks:',
      '1. Extract from the offer: entreprise (company name), poste (job title), focus (technical focus, a short phrase), domaine (company domain/project, a short phrase), exigence1 and exigence2 (the two most important technical requirements), lieu (location).',
      '2. Write a cover letter in ' + (L === 'fr' ? 'FRENCH' : 'ENGLISH') + ', 4-5 paragraphs, structured as: opening (position + company + why interested), most relevant experience for THIS offer, second experience, match between the offer requirements and his skills, closing.',
      'STRICT RULES: use ONLY the facts provided — never invent projects, employers, metrics or skills. Professional, direct tone, no flattery, no buzzwords. ' + (L === 'fr'
        ? 'Commencer par « Madame, Monsieur, » et finir par une formule de politesse française classique.'
        : 'Start with "Dear Hiring Manager," and end with "Yours sincerely,".') + ' Do NOT include the signature name, date or addresses — only the letter text.',
      'Answer in EXACTLY this format (no markdown fences, nothing else):',
      'FIELDS: {"entreprise":"","poste":"","focus":"","domaine":"","exigence1":"","exigence2":"","lieu":""}',
      '---LETTER---',
      '<the full letter as plain text>',
      'The FIELDS line must be valid single-line JSON with short values.',
      '',
      '--- JOB OFFER ---',
      String(text || '').slice(0, 12000),
      '--- VERIFIED FACTS ---',
      facts,
    ].join('\n');
  }

  // Champs = une ligne JSON ; lettre = texte brut après un délimiteur. Les
  // petits modèles gratuits cassent le JSON multi-lignes, pas ce format-ci.
  function parseAIResponse(content) {
    const s = String(content || '').replace(/```[a-z]*\n?/gi, '').trim();
    let fields = {};
    const fm = s.match(/FIELDS\s*:\s*(\{[^\n]*\})/);
    if (fm) {
      try { fields = JSON.parse(fm[1]); } catch (err) { fields = {}; }
    }
    let letter = '';
    const dm = s.match(/-{2,}\s*LETTER\s*-{2,}/i);
    if (dm) {
      letter = s.slice(dm.index + dm[0].length).trim();
    } else {
      // Dégradé : prendre à partir de la salutation si le modèle a ignoré le format
      const lm = s.match(/(Dear\s|Madame|Monsieur|Bonjour)/);
      if (lm && s.length - lm.index > 200) letter = s.slice(lm.index).trim();
    }
    if (!letter) throw new Error('lettre absente de la réponse');
    return { fields, letter };
  }

  return { analyze, generate, detectProfile, buildPrompt, parseAIResponse, EXPERIENCE, PROFILES };
});
