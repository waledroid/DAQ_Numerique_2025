import { emptyProfile } from '../engine/profile';
import type {
  ApplicationEntry, LearnedAnswer, Profile, ProfileMeta, ProfileRegistry, Settings,
} from '../engine/types';

export interface AreaLike {
  get(keys: string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

export class ChunkedStore {
  constructor(
    private primary: AreaLike,
    private fallback: AreaLike | null = null,
    private maxItemBytes = 7000,
  ) {}

  private async clearKey(area: AreaLike, key: string): Promise<void> {
    try {
      const all = await area.get(null);
      const keysToRemove = Object.keys(all).filter((k) => {
        const m = k.match(new RegExp(`^${key}__(meta|\\d+)$`));
        return m !== null;
      });
      if (keysToRemove.length > 0) await area.remove(keysToRemove);
    } catch {
      // ignore errors
    }
  }

  private async write(area: AreaLike, key: string, json: string): Promise<void> {
    const chunkLen = Math.max(1, Math.floor(this.maxItemBytes / 4)); // utf-8 worst case
    const chunks: string[] = [];
    for (let i = 0; i < json.length; i += chunkLen) chunks.push(json.slice(i, i + chunkLen));
    const items: Record<string, unknown> = { [`${key}__meta`]: chunks.length };
    chunks.forEach((c, i) => (items[`${key}__${i}`] = c));
    await area.set(items);
    const all = await area.get(null);
    const stale = Object.keys(all).filter((k) => {
      const m = k.match(new RegExp(`^${key}__(\\d+)$`));
      return m !== null && Number(m[1]) >= chunks.length;
    });
    if (stale.length > 0) await area.remove(stale);
  }

  async setJSON(key: string, value: unknown): Promise<'primary' | 'fallback'> {
    const json = JSON.stringify(value);
    try {
      await this.write(this.primary, key, json);
      // Clear stale chunks from fallback after successful primary write
      if (this.fallback) {
        await this.clearKey(this.fallback, key);
      }
      return 'primary';
    } catch (e) {
      if (!this.fallback) throw e;
      await this.write(this.fallback, key, json);
      // Clear stale chunks from primary after fallback write
      await this.clearKey(this.primary, key);
      return 'fallback';
    }
  }

  private async read(area: AreaLike, key: string): Promise<string | undefined> {
    const all = await area.get(null);
    const meta = all[`${key}__meta`];
    if (typeof meta !== 'number') return undefined;
    const keys = Array.from({ length: meta }, (_, i) => `${key}__${i}`);
    return keys.map((k) => (all[k] as string) ?? '').join('');
  }

  async getJSON<T>(key: string): Promise<T | undefined> {
    let json = await this.read(this.primary, key);
    if (json === undefined && this.fallback) json = await this.read(this.fallback, key);
    if (json === undefined || json === '') return undefined;
    try {
      return JSON.parse(json) as T;
    } catch {
      return undefined;
    }
  }
}

const KEYS = {
  profile: 'izifill_profile', // legacy single-profile key, migrated into the registry
  registry: 'izifill_profiles',
  learned: 'izifill_learned',
  apps: 'izifill_apps',
  settings: 'izifill_settings',
};

// The migrated/first profile keeps this fixed id so legacy file keys can be
// used as a fallback for it (and only it).
const DEFAULT_PROFILE_ID = 'p_default';

function profileKey(id: string): string {
  return 'izifill_profile__' + id;
}

let store: ChunkedStore | null = null;

export function setStoreForTests(s: ChunkedStore | null): void {
  store = s;
}

function defaultStore(): ChunkedStore {
  store ??= new ChunkedStore(chrome.storage.sync, chrome.storage.local);
  return store;
}

export async function listProfiles(): Promise<ProfileRegistry> {
  const existing = await defaultStore().getJSON<ProfileRegistry>(KEYS.registry);
  if (existing && Array.isArray(existing.list) && existing.list.length > 0) return existing;
  const reg: ProfileRegistry = {
    list: [{ id: DEFAULT_PROFILE_ID, name: 'Principal' }],
    activeId: DEFAULT_PROFILE_ID,
  };
  const legacy = await defaultStore().getJSON<Profile>(KEYS.profile);
  if (legacy) await defaultStore().setJSON(profileKey(DEFAULT_PROFILE_ID), legacy);
  await defaultStore().setJSON(KEYS.registry, reg);
  return reg;
}

async function saveRegistry(reg: ProfileRegistry): Promise<void> {
  await defaultStore().setJSON(KEYS.registry, reg);
}

export async function createProfile(name: string): Promise<ProfileMeta> {
  const reg = await listProfiles();
  const meta: ProfileMeta = {
    id: 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
  };
  reg.list.push(meta);
  reg.activeId = meta.id;
  await saveRegistry(reg);
  return meta;
}

export async function switchProfile(id: string): Promise<void> {
  const reg = await listProfiles();
  if (reg.list.some((p) => p.id === id)) {
    reg.activeId = id;
    await saveRegistry(reg);
  }
}

export async function renameProfile(id: string, name: string): Promise<void> {
  const reg = await listProfiles();
  const meta = reg.list.find((p) => p.id === id);
  if (meta) {
    meta.name = name;
    await saveRegistry(reg);
  }
}

export async function deleteProfile(id: string): Promise<void> {
  const reg = await listProfiles();
  if (reg.list.length <= 1) return; // always keep at least one profile
  reg.list = reg.list.filter((p) => p.id !== id);
  if (reg.activeId === id) reg.activeId = reg.list[0].id;
  await saveRegistry(reg);
}

export async function loadProfile(): Promise<Profile> {
  const reg = await listProfiles();
  return (await defaultStore().getJSON<Profile>(profileKey(reg.activeId))) ?? emptyProfile();
}
export async function saveProfile(p: Profile): Promise<void> {
  const reg = await listProfiles();
  await defaultStore().setJSON(profileKey(reg.activeId), p);
}
export async function loadLearned(): Promise<LearnedAnswer[]> {
  return (await defaultStore().getJSON<LearnedAnswer[]>(KEYS.learned)) ?? [];
}
export async function saveLearned(l: LearnedAnswer[]): Promise<void> {
  await defaultStore().setJSON(KEYS.learned, l);
}
export async function addLearnedAnswer(entry: LearnedAnswer): Promise<void> {
  const list = await loadLearned();
  list.unshift(entry);
  await saveLearned(list);
}
export async function loadApplications(): Promise<ApplicationEntry[]> {
  return (await defaultStore().getJSON<ApplicationEntry[]>(KEYS.apps)) ?? [];
}
export async function saveApplications(a: ApplicationEntry[]): Promise<void> {
  await defaultStore().setJSON(KEYS.apps, a);
}
export async function addApplication(entry: ApplicationEntry): Promise<void> {
  const list = await loadApplications();
  list.unshift(entry);
  await saveApplications(list);
}
export async function loadSettings(): Promise<Settings> {
  return (await defaultStore().getJSON<Settings>(KEYS.settings)) ?? { disabledDomains: [], fillUncertain: true };
}
export async function saveSettings(s: Settings): Promise<void> {
  await defaultStore().setJSON(KEYS.settings, s);
}

export interface StoredFile {
  name: string;
  mime: string;
  data: string; // base64, no data-URL prefix
}

function localArea(): AreaLike {
  return chrome.storage.local as unknown as AreaLike;
}

export async function saveStoredFile(kind: 'cv' | 'coverLetter', file: StoredFile, area?: AreaLike): Promise<void> {
  const reg = await listProfiles();
  await (area ?? localArea()).set({ ['izifill_file_' + kind + '__' + reg.activeId]: file });
}
export async function loadStoredFile(kind: 'cv' | 'coverLetter', area?: AreaLike): Promise<StoredFile | undefined> {
  const reg = await listProfiles();
  const a = area ?? localArea();
  const key = 'izifill_file_' + kind + '__' + reg.activeId;
  const found = (await a.get([key]))[key] as StoredFile | undefined;
  if (found) return found;
  if (reg.activeId === DEFAULT_PROFILE_ID) {
    // Files uploaded before multi-profile support live under the legacy key.
    const legacyKey = 'izifill_file_' + kind;
    return (await a.get([legacyKey]))[legacyKey] as StoredFile | undefined;
  }
  return undefined;
}

// --- Site credentials (LOCAL ONLY — never synced) ---------------------------
// Passwords generated by pilot mode for ATS account creation. Stored on this
// device only; listed and deletable from the profile page.

export interface SiteCredential {
  domain: string;
  email: string;
  password: string;
  createdAt: string;
}

const CRED_KEY = 'izifill_credentials';

async function loadCredMap(area: AreaLike): Promise<Record<string, SiteCredential>> {
  return ((await area.get([CRED_KEY]))[CRED_KEY] as Record<string, SiteCredential> | undefined) ?? {};
}

export async function saveCredential(cred: SiteCredential, area?: AreaLike): Promise<void> {
  const a = area ?? localArea();
  const all = await loadCredMap(a);
  all[cred.domain] = cred;
  await a.set({ [CRED_KEY]: all });
}

export async function loadCredential(domain: string, area?: AreaLike): Promise<SiteCredential | undefined> {
  return (await loadCredMap(area ?? localArea()))[domain];
}

export async function listCredentials(area?: AreaLike): Promise<SiteCredential[]> {
  return Object.values(await loadCredMap(area ?? localArea()));
}

export async function deleteCredential(domain: string, area?: AreaLike): Promise<void> {
  const a = area ?? localArea();
  const all = await loadCredMap(a);
  delete all[domain];
  await a.set({ [CRED_KEY]: all });
}
