import { normalize } from './normalize';
import { getProfileValue } from './profile';
import { findLearnedAnswer } from './learned';
import { AUTOCOMPLETE_MAP, COVER_LETTER_FILE_SYNONYMS, CV_FILE_SYNONYMS, LABEL_SYNONYMS } from './dictionaries';
import type { Confidence, FieldMatch, FieldSnapshot, LearnedAnswer, Profile } from './types';

const SKIP_TYPES = new Set(['hidden', 'submit', 'button', 'image', 'reset', 'password', 'search', 'checkbox']);

function contains(hay: string, syn: string): boolean {
  return (' ' + hay + ' ').includes(' ' + syn + ' ');
}

export function matchFields(fields: FieldSnapshot[], profile: Profile, learned: LearnedAnswer[]): FieldMatch[] {
  return fields.map((f) => matchField(f, profile, learned));
}

// Cross-language equivalents so a stored answer in one language can select
// its counterpart option on a site in the other language.
const EQUIVALENTS: string[][] = [
  ['oui', 'yes'],
  ['non', 'no'],
  ['monsieur', 'mr', 'mister'],
  ['madame', 'mme', 'mrs', 'ms', 'madam'],
  ['homme', 'male', 'masculin', 'man'],
  ['femme', 'female', 'feminin', 'woman'],
  ['immediate', 'immediatement', 'immediately', 'asap', 'des que possible'],
];
const EQUIV_LOOKUP = new Map<string, Set<string>>();
for (const group of EQUIVALENTS) {
  const set = new Set(group);
  for (const word of group) EQUIV_LOOKUP.set(word, set);
}

// "38 000" / "20,000" → 38000 / 20000; null unless the text is purely a number.
function parseNumeric(normalized: string): number | null {
  const joined = normalized.replace(/(\d)\s+(?=\d)/g, '$1');
  const m = joined.match(/^\s*(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

// Parses bracket-shaped option text: "moins de X", "X à Y", "plus de X" (FR/EN).
function parseRange(normalized: string): { min: number; max: number } | null {
  const t = normalized.replace(/(\d)\s+(?=\d)/g, '$1');
  let m = t.match(/(?:moins de?|less than|under|jusqu a)\s*(\d+)/);
  if (m) return { min: -Infinity, max: Number(m[1]) };
  m = t.match(/(\d+)\s*(?:a|to|et|jusqu a)\s*(\d+)/);
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  m = t.match(/(?:plus de?|more than|over|au dela de)\s*(\d+)/);
  if (m) return { min: Number(m[1]), max: Infinity };
  m = t.match(/(\d+)\s*(?:et plus|and (?:more|above|up))/);
  if (m) return { min: Number(m[1]), max: Infinity };
  return null;
}

export function resolveOption(f: FieldSnapshot, value: string): string | null {
  const v = normalize(value);
  if (!v) return null;
  for (const o of f.options) {
    if (normalize(o.text) === v || normalize(o.value) === v) return o.value;
  }
  const equivalents = EQUIV_LOOKUP.get(v);
  if (equivalents) {
    for (const o of f.options) {
      if (equivalents.has(normalize(o.text))) return o.value;
    }
  }
  for (const o of f.options) {
    const t = normalize(o.text);
    if (t && (contains(t, v) || contains(v, t))) return o.value;
  }
  const num = parseNumeric(v);
  if (num !== null) {
    for (const o of f.options) {
      const range = parseRange(normalize(o.text));
      if (range && num >= range.min && num <= range.max) return o.value;
    }
  }
  return null;
}

export function matchField(f: FieldSnapshot, profile: Profile, learned: LearnedAnswer[]): FieldMatch {
  if (SKIP_TYPES.has(f.type)) return { ref: f.ref, source: 'unknown' };

  const strong = [f.label, f.ariaLabel].map(normalize).filter(Boolean);
  const weak = [f.placeholder, f.name, f.id, f.context].map(normalize).filter(Boolean);

  if (f.type === 'file') {
    const haystacks = [...strong, ...weak];
    // Cover letter is checked first — it is more specific than the bare CV terms.
    if (haystacks.some((h) => COVER_LETTER_FILE_SYNONYMS.some((s) => contains(h, s)))) {
      return { ref: f.ref, key: 'files.coverLetter', confidence: 'high', source: 'profile' };
    }
    if (haystacks.some((h) => CV_FILE_SYNONYMS.some((s) => contains(h, s)))) {
      return { ref: f.ref, key: 'files.cv', confidence: 'high', source: 'profile' };
    }
    return { ref: f.ref, source: 'unknown' };
  }

  let key: string | undefined;
  let confidence: Confidence | undefined;

  const ac = (f.autocomplete || '').trim().toLowerCase().split(/\s+/).pop() ?? '';
  if (AUTOCOMPLETE_MAP[ac]) {
    key = AUTOCOMPLETE_MAP[ac];
    confidence = 'high';
  } else {
    let bestScore = 0;
    for (const [k, syns] of Object.entries(LABEL_SYNONYMS)) {
      for (const syn of syns) {
        let score = 0;
        let conf: Confidence = 'low';
        if (strong.some((h) => h === syn)) { score = 1000 + syn.length; conf = 'high'; }
        else if (strong.some((h) => contains(h, syn))) { score = 500 + syn.length; conf = 'low'; }
        else if (weak.some((h) => h === syn)) { score = 300 + syn.length; conf = 'high'; }
        else if (weak.some((h) => contains(h, syn))) { score = syn.length; conf = 'low'; }
        if (score > bestScore) { bestScore = score; key = k; confidence = conf; }
      }
    }
  }

  if (key) {
    const value = getProfileValue(profile, key);
    if (value) {
      if (f.tag === 'select' || f.type === 'radio') {
        const opt = resolveOption(f, value);
        if (!opt) return { ref: f.ref, key, source: 'unknown' };
        return { ref: f.ref, key, value: opt, confidence, source: 'profile' };
      }
      return { ref: f.ref, key, value, confidence, source: 'profile' };
    }
  }

  const question = f.label || f.ariaLabel || f.placeholder;
  if (question) {
    const hit = findLearnedAnswer(question, learned);
    if (hit) {
      if (f.tag === 'select' || f.type === 'radio') {
        const opt = resolveOption(f, hit.entry.answer);
        if (!opt) return { ref: f.ref, source: 'unknown' };
        return { ref: f.ref, value: opt, confidence: hit.confidence, source: 'learned' };
      }
      return { ref: f.ref, value: hit.entry.answer, confidence: hit.confidence, source: 'learned' };
    }
  }

  if (key) {
    return { ref: f.ref, key, source: 'unknown' };
  }
  return { ref: f.ref, source: 'unknown' };
}
