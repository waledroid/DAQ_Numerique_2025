import { normalize } from './normalize';

export interface PageInfo {
  url: string;
  title: string;
  text: string;
  fieldCount: number;
  hasFileInput: boolean;
}

export const APPLICATION_THRESHOLD = 6;

const KEYWORDS = [
  'postuler', 'candidature', 'apply', 'application', 'curriculum vitae', 'resume',
  'lettre de motivation', 'cover letter', 'recrutement', 'deposer votre cv', 'join our team',
];

const URL_HINTS = [
  'apply', 'application', 'candidature', 'postuler', 'jobs', 'careers',
  'carrieres', 'recrutement', 'emploi', 'offre',
];

export function scoreApplicationPage(info: PageInfo): number {
  const haystack = ' ' + normalize(info.title + ' ' + info.text) + ' ';
  const distinct = KEYWORDS.filter((k) => haystack.includes(' ' + k + ' ')).length;
  const url = info.url.toLowerCase();
  let score = Math.min(6, 2 * distinct);
  if (URL_HINTS.some((h) => url.includes(h))) score += 3;
  if (info.fieldCount >= 3) score += 2;
  if (info.hasFileInput) score += 2;
  return score;
}
