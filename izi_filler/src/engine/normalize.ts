const STOPWORDS = new Set([
  // FR
  'le', 'la', 'les', 'l', 'de', 'des', 'du', 'd', 'un', 'une', 'votre', 'vos', 'vous',
  'est', 'et', 'ou', 'au', 'aux', 'ce', 'cette', 'svp', 'veuillez', 'merci',
  'quel', 'quelle', 'quels', 'quelles', 'pourquoi', 'comment', 'combien',
  // EN
  'the', 'a', 'an', 'your', 'you', 'of', 'to', 'in', 'for', 'is', 'are', 'do', 'does',
  'please', 'what', 'why', 'how', 'much', 'many',
]);

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function tokens(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

export function normalizeKey(text: string): string {
  return tokens(text)
    .filter((t) => !STOPWORDS.has(t))
    .join(' ');
}
