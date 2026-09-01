import { completionPercent, mergeImportedProfile } from '../engine/profile';
import { mergeLearnedAnswers } from '../engine/learned';
import {
  loadLearned, loadProfile, saveLearned, saveProfile, saveStoredFile, type AreaLike,
} from './storage';

// CV files we try in order, with their MIME types.
const CV_CANDIDATES: [string, string][] = [
  ['seed/cv.pdf', 'application/pdf'],
  ['seed/cv.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['seed/cv.doc', 'application/msword'],
];

function bytesToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// Seeds the active profile, learned answers and CV from files bundled in the
// extension (public/seed/*), but only when no profile data exists yet — so it
// repopulates after a fresh install/reinstall without ever clobbering edits.
// The seed files are gitignored: absent on a plain clone, in which case this
// is a safe no-op. `fetchFn`/`getUrl`/`fileArea` are injectable for testing.
type FetchLike = (input: string) => Promise<{ ok: boolean; json(): Promise<unknown>; arrayBuffer(): Promise<ArrayBuffer> }>;

export async function seedFromBundle(
  getUrl: (path: string) => string,
  fetchFn: FetchLike = fetch,
  fileArea?: AreaLike,
): Promise<boolean> {
  const existing = await loadProfile();
  if (completionPercent(existing) > 0) return false;

  let data: unknown;
  try {
    const res = await fetchFn(getUrl('seed/profile.json'));
    if (!res.ok) return false;
    data = await res.json();
  } catch {
    return false;
  }

  await saveProfile(mergeImportedProfile(data));
  const learned = (data as Record<string, unknown> | null)?.learnedAnswers;
  const merged = mergeLearnedAnswers(await loadLearned(), learned, 'fr');
  if (merged.length > 0) await saveLearned(merged);

  for (const [path, mime] of CV_CANDIDATES) {
    try {
      const res = await fetchFn(getUrl(path));
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      await saveStoredFile('cv', { name: path.split('/').pop() ?? 'cv', mime, data: bytesToBase64(buf) }, fileArea);
      break;
    } catch {
      // try the next candidate
    }
  }
  return true;
}
