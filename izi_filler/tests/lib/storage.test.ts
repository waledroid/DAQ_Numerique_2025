import { describe, it, expect, afterEach } from 'vitest';
import {
  ChunkedStore, setStoreForTests, loadProfile, saveProfile, loadSettings,
  addApplication, loadApplications, saveStoredFile, loadStoredFile,
  listProfiles, createProfile, switchProfile, deleteProfile, renameProfile,
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

class FlakyQuotaArea extends FakeArea {
  private callCount = 0;
  override async set(items: Record<string, unknown>) {
    this.callCount++;
    if (this.callCount > 1) throw new Error('QUOTA_BYTES quota exceeded');
    Object.assign(this.data, items);
  }
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
  it('clears stale chunks when falling back to avoid shadowing', async () => {
    const primary = new FlakyQuotaArea();
    const fallback = new FakeArea();
    const s = new ChunkedStore(primary, fallback);
    expect(await s.setJSON('k', { v: 'old' })).toBe('primary');
    expect(await s.setJSON('k', { v: 'new' })).toBe('fallback');
    expect(await s.getJSON('k')).toEqual({ v: 'new' });
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
    setStoreForTests(new ChunkedStore(new FakeArea()));
    const area = new FakeArea();
    const f: StoredFile = { name: 'cv.pdf', mime: 'application/pdf', data: 'AAAA' };
    await saveStoredFile('cv', f, area);
    expect(await loadStoredFile('cv', area)).toEqual(f);
  });
});

describe('profile registry', () => {
  it('migrates a legacy single profile into the registry as "Principal"', async () => {
    const store = new ChunkedStore(new FakeArea());
    setStoreForTests(store);
    const legacy = emptyProfile();
    legacy.identity.firstName = 'Ada';
    await store.setJSON('izifill_profile', legacy);
    const reg = await listProfiles();
    expect(reg.list).toHaveLength(1);
    expect(reg.list[0].name).toBe('Principal');
    expect(reg.activeId).toBe(reg.list[0].id);
    expect((await loadProfile()).identity.firstName).toBe('Ada');
  });

  it('starts with one default profile when nothing exists', async () => {
    setStoreForTests(new ChunkedStore(new FakeArea()));
    const reg = await listProfiles();
    expect(reg.list).toHaveLength(1);
    expect((await loadProfile()).identity.firstName).toBe('');
  });

  it('creates, switches between, and deletes profiles with separate data', async () => {
    setStoreForTests(new ChunkedStore(new FakeArea()));
    const first = (await listProfiles()).activeId;
    const created = await createProfile('Hotel');
    let reg = await listProfiles();
    expect(reg.list.map((p) => p.name)).toContain('Hotel');
    expect(reg.activeId).toBe(created.id);

    const prof = emptyProfile();
    prof.identity.firstName = 'Bob';
    await saveProfile(prof);
    await switchProfile(first);
    expect((await loadProfile()).identity.firstName).toBe('');
    await switchProfile(created.id);
    expect((await loadProfile()).identity.firstName).toBe('Bob');

    await deleteProfile(created.id);
    reg = await listProfiles();
    expect(reg.list.find((p) => p.id === created.id)).toBeUndefined();
    expect(reg.activeId).toBe(first);
  });

  it('renames a profile', async () => {
    setStoreForTests(new ChunkedStore(new FakeArea()));
    const reg = await listProfiles();
    await renameProfile(reg.activeId, 'Ingénieur');
    expect((await listProfiles()).list[0].name).toBe('Ingénieur');
  });

  it('refuses to delete the last remaining profile', async () => {
    setStoreForTests(new ChunkedStore(new FakeArea()));
    const reg = await listProfiles();
    await deleteProfile(reg.activeId);
    expect((await listProfiles()).list).toHaveLength(1);
  });
});

describe('per-profile stored files', () => {
  it('reads the legacy file key for the migrated default profile only', async () => {
    setStoreForTests(new ChunkedStore(new FakeArea()));
    const area = new FakeArea();
    await area.set({ izifill_file_cv: { name: 'old.pdf', mime: 'application/pdf', data: 'AA' } });
    expect((await loadStoredFile('cv', area))?.name).toBe('old.pdf');

    await saveStoredFile('cv', { name: 'new.pdf', mime: 'application/pdf', data: 'BB' }, area);
    expect((await loadStoredFile('cv', area))?.name).toBe('new.pdf');

    await createProfile('Autre');
    expect(await loadStoredFile('cv', area)).toBeUndefined();
    await saveStoredFile('cv', { name: 'autre.pdf', mime: 'application/pdf', data: 'CC' }, area);
    expect((await loadStoredFile('cv', area))?.name).toBe('autre.pdf');

    const reg = await listProfiles();
    const defaultId = reg.list[0].id;
    await switchProfile(defaultId);
    expect((await loadStoredFile('cv', area))?.name).toBe('new.pdf');
  });
});
