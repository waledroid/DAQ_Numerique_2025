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
