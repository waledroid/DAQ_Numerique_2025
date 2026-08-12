// Netlify Function — rédaction IA de la lettre de motivation via OpenRouter.
//
// La clé API vit UNIQUEMENT dans l'environnement serveur de cette fonction
// (variables Netlify), jamais dans le navigateur ni dans le dépôt. L'appel
// est protégé par le même mot de passe éditeur que l'enregistrement du CV,
// pour ne pas laisser un endpoint ouvert consommer le quota.
//
// Variables d'environnement Netlify requises :
//   OPENROUTER_API_KEY  clé https://openrouter.ai/keys
//   EDITOR_PASSWORD     déjà utilisée par functions/cv.js
// Optionnelle :
//   OPENROUTER_MODEL    défaut : openrouter/free (modèle gratuit auto)

const LetterGen = require('../../assets/js/letter-gen.js');

const MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST uniquement' });

  const pw = event.headers['x-cv-password'] || '';
  if (!process.env.EDITOR_PASSWORD || pw !== process.env.EDITOR_PASSWORD) {
    return json(401, { error: 'Mot de passe incorrect' });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return json(503, { error: 'OPENROUTER_API_KEY non configurée' });
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch (err) { return json(400, { error: 'JSON invalide' }); }
  const text = String(payload.text || '').trim();
  const lang = payload.lang === 'en' ? 'en' : 'fr';
  if (!text) return json(400, { error: 'texte de l’offre manquant' });

  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: LetterGen.buildPrompt(text, lang) }],
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return json(r.status, { error: (data.error && data.error.message) || `OpenRouter ${r.status}` });
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return json(200, LetterGen.parseAIResponse(content));
  } catch (err) {
    return json(502, { error: 'analyse IA impossible : ' + err.message });
  }
};
