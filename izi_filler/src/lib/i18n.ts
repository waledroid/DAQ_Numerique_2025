import type { Lang } from '../engine/types';

const MESSAGES = {
  promptTitle: { fr: 'izifill — Remplir cette page ?', en: 'izifill — Fill this page?' },
  yes: { fr: 'Oui, remplir', en: 'Yes, fill' },
  notThisSite: { fr: 'Jamais sur ce site', en: 'Never on this site' },
  summary: {
    fr: '{filled} remplis · {uncertain} incertains · {unknown} à compléter',
    en: '{filled} filled · {uncertain} uncertain · {unknown} left for you',
  },
  saveAnswer: { fr: 'Enregistrer cette réponse', en: 'Save this answer' },
  answerSaved: { fr: 'Réponse enregistrée ✔', en: 'Answer saved ✔' },
  applicationTracked: { fr: 'Candidature enregistrée ✔', en: 'Application tracked ✔' },
  profileSaved: { fr: 'Profil enregistré ✔', en: 'Profile saved ✔' },
  fillManually: { fr: 'À remplir manuellement', en: 'Fill manually' },
} as const;

export type MsgKey = keyof typeof MESSAGES;

export function t(key: MsgKey, lang: Lang, vars?: Record<string, string | number>): string {
  let msg: string = MESSAGES[key][lang];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) msg = msg.replaceAll('{' + k + '}', String(v));
  }
  return msg;
}

export function detectLang(): Lang {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}
