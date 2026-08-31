import { describe, it, expect, afterEach } from 'vitest';
import {
  ChunkedStore, setStoreForTests, loadProfile, saveProfile, loadSettings,
  addApplication, loadApplications, saveStoredFile, loadStoredFile,
  type AreaLike, type StoredFile,
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

class QuotaArea extends FakeArea {
  override async set(): Promise<void> { throw new Error('QUOTA_BYTES quota exceeded'); }
}

afterEach(() => setStoreForTests(null));

describe('ChunkedStore', () => {
  it('round-trips a value', async () => {
    const s = new ChunkedStore(new FakeArea());
    await s.setJSON('k', { a: 1 });
    expect(await s.getJSON('k')).toEqual({ a: 1 });
  });
  it('returns undefined for missing keys', async () => {
    const s = new ChunkedStore(new FakeArea());
    expect(await s.getJSON('missing')).toBeUndefined();
  });
  it('chunks large values into multiple items', async () => {
    const area = new FakeArea();
    const s = new ChunkedStore(area, null, 100);
    await s.setJSON('big', { text: 'x'.repeat(500) });
    expect(Object.keys(area.data).filter((k) => k.startsWith('big__')).length).toBeGreaterThan(2);
    expect(await s.getJSON('big')).toEqual({ text: 'x'.repeat(500) });
  });
  it('removes stale chunks when the value shrinks', async () => {
    const area = new FakeArea();
    const s = new ChunkedStore(area, null, 100);
    await s.setJSON('k', { text: 'x'.repeat(500) });
    await s.setJSON('k', { text: 'y' });
    expect(await s.getJSON('k')).toEqual({ text: 'y' });
    expect(area.data['k__3']).toBeUndefined();
  });
  it('falls back to the fallback area on quota errors', async () => {
    const fallback = new FakeArea();
    const s = new ChunkedStore(new QuotaArea(), fallback);
    expect(await s.setJSON('k', { a: 1 })).toBe('fallback');
    expect(await s.getJSON('k')).toEqual({ a: 1 });
  });
});

describe('repos', () => {
  it('loadProfile defaults to emptyProfile and round-trips', async () => {
    setStoreForTests(new ChunkedStore(new FakeArea()));
    expect(await loadProfile()).toEqual(emptyProfile());
    const p = emptyProfile();
    p.identity.firstName = 'Ada';
    await saveProfile(p);
    expect((await loadProfile()).identity.firstName).toBe('Ada');
  });
  it('loadSettings has safe defaults', async () => {
    setStoreForTests(new ChunkedStore(new FakeArea()));
    expect(await loadSettings()).toEqual({ disabledDomains: [], fillUncertain: true });
  });
  it('addApplication prepends', async () => {
    setStoreForTests(new ChunkedStore(new FakeArea()));
    await addApplication({ company: 'A', title: 't', url: 'u', domain: 'd', date: '2026-08-31', status: 'applied' });
    await addApplication({ company: 'B', title: 't', url: 'u', domain: 'd', date: '2026-08-31', status: 'applied' });
    expect((await loadApplications()).map((a) => a.company)).toEqual(['B', 'A']);
  });
});

describe('stored files', () => {
  it('round-trips a file through an injected area', async () => {
    const area = new FakeArea();
    const f: StoredFile = { name: 'cv.pdf', mime: 'application/pdf', data: 'AAAA' };
    await saveStoredFile('cv', f, area);
    expect(await loadStoredFile('cv', area)).toEqual(f);
  });
});
