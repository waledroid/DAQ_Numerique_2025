import { normalizeKey } from './normalize';
import type { Confidence, Lang, LearnedAnswer } from './types';

export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / (sa.size + sb.size - inter);
}

export function findLearnedAnswer(
  question: string,
  learned: LearnedAnswer[],
): { entry: LearnedAnswer; confidence: Confidence } | null {
  const qKey = normalizeKey(question);
  if (!qKey) return null;
  const qTokens = qKey.split(' ');
  let best: LearnedAnswer | null = null;
  let bestScore = 0;
  for (const l of learned) {
    const score = l.normalizedKey === qKey ? 1 : jaccard(qTokens, l.normalizedKey.split(' '));
    if (score > bestScore) {
      best = l;
      bestScore = score;
    }
  }
  if (!best || bestScore < 0.55) return null;
  return { entry: best, confidence: bestScore >= 0.85 ? 'high' : 'low' };
}

// Merges question/answer pairs from an imported JSON file into an existing
// learned list, deduplicating by normalized question key.
export function mergeLearnedAnswers(
  existing: LearnedAnswer[],
  imported: unknown,
  lang: Lang,
): LearnedAnswer[] {
  if (!Array.isArray(imported)) return existing;
  const out = [...existing];
  for (const item of imported) {
    if (item === null || typeof item !== 'object') continue;
    const { question, answer } = item as { question?: unknown; answer?: unknown };
    if (typeof question !== 'string' || typeof answer !== 'string') continue;
    if (!question.trim() || !answer.trim()) continue;
    const entry = makeLearned(question, answer, lang);
    if (entry.normalizedKey && !out.some((e) => e.normalizedKey === entry.normalizedKey)) {
      out.push(entry);
    }
  }
  return out;
}

export function makeLearned(questionText: string, answer: string, lang: Lang): LearnedAnswer {
  return {
    questionText,
    normalizedKey: normalizeKey(questionText),
    answer,
    lang,
    timesUsed: 0,
    lastUsed: new Date().toISOString(),
  };
}
