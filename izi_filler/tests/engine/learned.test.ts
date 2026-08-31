import { describe, it, expect } from 'vitest';
import { jaccard, findLearnedAnswer, makeLearned, mergeLearnedAnswers } from '../../src/engine/learned';

const learned = [
  makeLearned('Quelle est votre disponibilité ?', 'Immédiate', 'fr'),
  makeLearned('Why do you want to work here?', 'I admire the product.', 'en'),
];

describe('jaccard', () => {
  it('is 1 for identical sets, 0 for disjoint', () => {
    expect(jaccard(['a', 'b'], ['b', 'a'])).toBe(1);
    expect(jaccard(['a'], ['b'])).toBe(0);
    expect(jaccard([], ['a'])).toBe(0);
  });
});

describe('findLearnedAnswer', () => {
  it('matches an identical question with high confidence', () => {
    const hit = findLearnedAnswer('Quelle est votre disponibilité ?', learned);
    expect(hit?.entry.answer).toBe('Immédiate');
    expect(hit?.confidence).toBe('high');
  });
  it('matches a reworded question with low confidence', () => {
    const hit = findLearnedAnswer('Pourquoi voulez-vous travailler ici, dans notre équipe ?', [
      makeLearned('Pourquoi souhaitez-vous travailler ici ?', 'Motivation X', 'fr'),
    ]);
    expect(hit?.entry.answer).toBe('Motivation X');
    expect(hit?.confidence).toBe('low');
  });
  it('returns null for unrelated questions', () => {
    expect(findLearnedAnswer('Numéro de sécurité sociale', learned)).toBeNull();
  });
  it('returns null for empty question', () => {
    expect(findLearnedAnswer('', learned)).toBeNull();
  });
});

describe('mergeLearnedAnswers', () => {
  it('adds imported question/answer pairs and dedupes by normalized key', () => {
    const existing = [makeLearned('Civilité', 'Monsieur', 'fr')];
    const merged = mergeLearnedAnswers(existing, [
      { question: 'Civilité ?', answer: 'Monsieur' },
      { question: 'Disponibilité', answer: 'Immédiate' },
    ], 'fr');
    expect(merged).toHaveLength(2);
    expect(merged[1].answer).toBe('Immédiate');
  });
  it('ignores non-arrays and malformed items', () => {
    const existing = [makeLearned('Civilité', 'Monsieur', 'fr')];
    expect(mergeLearnedAnswers(existing, 'nope', 'fr')).toHaveLength(1);
    expect(mergeLearnedAnswers(existing, [{ question: 42 }, null, { answer: 'x' }], 'fr')).toHaveLength(1);
  });
});

describe('makeLearned', () => {
  it('stores normalized key and metadata', () => {
    const l = makeLearned('Votre préavis ?', '1 mois', 'fr');
    expect(l.normalizedKey).toBe('preavis');
    expect(l.timesUsed).toBe(0);
    expect(l.lastUsed).toMatch(/^\d{4}-/);
  });
});
