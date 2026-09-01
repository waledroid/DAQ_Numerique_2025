import { describe, it, expect, afterEach } from 'vitest';
import { seedFromBundle } from '../../src/lib/seed';
import {
  ChunkedStore, setStoreForTests, loadProfile, loadLearned, loadStoredFile,
  saveProfile, type AreaLike,
} from '../../src/lib/storage';
import { emptyProfile } from '../../src/engine/profile';

class FakeArea implements AreaLike {
  data: Record<string, unknown> = {};
  async get(keys: string[] | null) {
    if (keys === null) return { ...this.data };
    const out: Record<string, unknown> = {};
    for (const k of keys) if (k in this.data) out[k] = this.data[k];
    return out;
  }
  async set(items: Record<string, unknown>) { Object.assign(this.data, items); }
  async remove(keys: string | string[]) {
    for (const k of Array.isArray(keys) ? keys : [keys]) delete this.data[k];
  }
}

const getUrl = (p: string) => 'chrome-extension://x/' + p;

function fakeFetch(map: Record<string, { ok: boolean; json?: unknown; bytes?: number[] }>) {
  return async (url: string): Promise<Response> => {
    const key = url.replace('chrome-extension://x/', '');
    const entry = map[key];
    if (!entry) return { ok: false } as Response;
    return {
      ok: entry.ok,
      json: async () => entry.json,
      arrayBuffer: async () => new Uint8Array(entry.bytes ?? []).buffer,
    } as Response;
  };
}

afterEach(() => setStoreForTests(null));

describe('seedFromBundle', () => {
  it('seeds profile, learned answers and CV when storage is empty', async () => {
    const local = new FakeArea();
    setStoreForTests(new ChunkedStore(new FakeArea()));
    const seeded = await seedFromBundle(getUrl, fakeFetch({
      'seed/profile.json': { ok: true, json: {
        identity: { firstName: 'Ada' },
        learnedAnswers: [{ question: 'Civilité', answer: 'Monsieur' }],
      } },
      'seed/cv.pdf': { ok: true, bytes: [1, 2, 3, 4] },
    }), local);
    expect(seeded).toBe(true);
    expect((await loadProfile()).identity.firstName).toBe('Ada');
    expect((await loadLearned())[0].answer).toBe('Monsieur');
    const cv = await loadStoredFile('cv', local);
    expect(cv?.mime).toBe('application/pdf');
    expect(cv?.data.length).toBeGreaterThan(0);
  });

  it('does nothing when a profile already has data', async () => {
    setStoreForTests(new ChunkedStore(new FakeArea()));
    const p = emptyProfile();
    p.identity.firstName = 'Existing';
    await saveProfile(p);
    const seeded = await seedFromBundle(getUrl, fakeFetch({
      'seed/profile.json': { ok: true, json: { identity: { firstName: 'Ada' } } },
    }), new FakeArea());
    expect(seeded).toBe(false);
    expect((await loadProfile()).identity.firstName).toBe('Existing');
  });

  it('returns false and stays safe when no seed file is bundled', async () => {
    setStoreForTests(new ChunkedStore(new FakeArea()));
    const seeded = await seedFromBundle(getUrl, fakeFetch({}), new FakeArea());
    expect(seeded).toBe(false);
    expect(await loadProfile()).toEqual(emptyProfile());
  });

  it('falls back to cv.docx when cv.pdf is absent', async () => {
    const local = new FakeArea();
    setStoreForTests(new ChunkedStore(new FakeArea()));
    await seedFromBundle(getUrl, fakeFetch({
      'seed/profile.json': { ok: true, json: { identity: { firstName: 'Ada' } } },
      'seed/cv.docx': { ok: true, bytes: [9, 9] },
    }), local);
    const cv = await loadStoredFile('cv', local);
    expect(cv?.name).toBe('cv.docx');
    expect(cv?.mime).toContain('word');
  });
});
