import { normalize } from './normalize';
import { getProfileValue } from './profile';
import { findLearnedAnswer } from './learned';
import { AUTOCOMPLETE_MAP, CV_FILE_SYNONYMS, LABEL_SYNONYMS } from './dictionaries';
import type { Confidence, FieldMatch, FieldSnapshot, LearnedAnswer, Profile } from './types';

const SKIP_TYPES = new Set(['hidden', 'submit', 'button', 'image', 'reset', 'password', 'search', 'checkbox']);

function contains(hay: string, syn: string): boolean {
  return (' ' + hay + ' ').includes(' ' + syn + ' ');
}

export function matchFields(fields: FieldSnapshot[], profile: Profile, learned: LearnedAnswer[]): FieldMatch[] {
  return fields.map((f) => matchField(f, profile, learned));
}

export function resolveOption(f: FieldSnapshot, value: string): string | null {
  const v = normalize(value);
  if (!v) return null;
  for (const o of f.options) {
    if (normalize(o.text) === v || normalize(o.value) === v) return o.value;
  }
  for (const o of f.options) {
    const t = normalize(o.text);
    if (t && (contains(t, v) || contains(v, t))) return o.value;
  }
  return null;
}

export function matchField(f: FieldSnapshot, profile: Profile, learned: LearnedAnswer[]): FieldMatch {
  if (SKIP_TYPES.has(f.type)) return { ref: f.ref, source: 'unknown' };

  const strong = [f.label, f.ariaLabel].map(normalize).filter(Boolean);
  const weak = [f.placeholder, f.name, f.id, f.context].map(normalize).filter(Boolean);

  if (f.type === 'file') {
    const isCv = [...strong, ...weak].some((h) => CV_FILE_SYNONYMS.some((s) => contains(h, s)));
    return isCv
      ? { ref: f.ref, key: 'files.cv', confidence: 'high', source: 'profile' }
      : { ref: f.ref, source: 'unknown' };
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
