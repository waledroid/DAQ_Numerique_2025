import { renderProfileForm, readProfileForm, TABS } from '../../pages/profile-form';
import { completionPercent, mergeImportedProfile } from '../../engine/profile';
import { mergeLearnedAnswers } from '../../engine/learned';
import {
  createProfile, deleteCredential, deleteProfile, listCredentials, listProfiles, loadLearned,
  loadProfile, loadStoredFile, renameProfile, saveLearned, saveProfile, saveStoredFile,
  switchProfile,
} from '../../lib/storage';
import { detectLang, t } from '../../lib/i18n';

const lang = detectLang();
const fr = lang === 'fr';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let activeTab = TABS[0].id;

function toast(msg: string): void {
  const node = el<HTMLDivElement>('toast');
  node.textContent = msg;
  node.style.display = 'block';
  setTimeout(() => (node.style.display = 'none'), 3000);
}

async function fileToStoredFile(file: File): Promise<{ name: string; mime: string; data: string }> {
  const buf = await file.arrayBuffer();
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return { name: file.name, mime: file.type, data: btoa(bin) };
}

function applyTabVisibility(): void {
  const tab = TABS.find((tb) => tb.id === activeTab) ?? TABS[0];
  document.querySelectorAll<HTMLElement>('#form section.iz-group').forEach((s) => {
    s.hidden = !tab.groupIds.includes(s.getAttribute('data-group') ?? '');
  });
  document.querySelectorAll<HTMLElement>('#tabs button').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tab.id);
  });
  // Files belong with the personal info; learned answers too.
  el('filesSection').hidden = tab.id !== 'personal';
}

function renderTabs(): void {
  const bar = el('tabs');
  bar.textContent = '';
  for (const tab of TABS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.tab = tab.id;
    b.textContent = fr ? tab.fr : tab.en;
    b.addEventListener('click', () => {
      activeTab = tab.id;
      applyTabVisibility();
    });
    bar.appendChild(b);
  }
}

async function renderProfilesBar(): Promise<void> {
  const reg = await listProfiles();
  const bar = el('profilesBar');
  bar.textContent = '';
  for (const p of reg.list) {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'pill' + (p.id === reg.activeId ? ' active' : '');
    pill.textContent = p.name;
    pill.addEventListener('click', async () => {
      await switchProfile(p.id);
      await reloadAll();
    });
    bar.appendChild(pill);
  }

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'pill add';
  add.textContent = '+';
  add.title = fr ? 'Nouveau profil' : 'New profile';
  add.addEventListener('click', async () => {
    const name = prompt(fr ? 'Nom du nouveau profil :' : 'New profile name:');
    if (!name?.trim()) return;
    await createProfile(name.trim());
    await reloadAll();
  });

  const ren = document.createElement('button');
  ren.type = 'button';
  ren.className = 'pill tool';
  ren.textContent = '✏️';
  ren.title = fr ? 'Renommer le profil actif' : 'Rename active profile';
  ren.addEventListener('click', async () => {
    const current = await listProfiles();
    const active = current.list.find((p) => p.id === current.activeId);
    if (!active) return;
    const name = prompt(fr ? 'Nouveau nom :' : 'New name:', active.name);
    if (!name?.trim()) return;
    await renameProfile(active.id, name.trim());
    await reloadAll();
  });

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'pill tool';
  del.textContent = '🗑';
  del.title = fr ? 'Supprimer le profil actif' : 'Delete active profile';
  del.addEventListener('click', async () => {
    const current = await listProfiles();
    if (current.list.length <= 1) {
      toast(fr ? 'Impossible de supprimer le dernier profil.' : 'Cannot delete the last profile.');
      return;
    }
    const active = current.list.find((p) => p.id === current.activeId);
    if (!active) return;
    if (!confirm((fr ? 'Supprimer le profil « ' : 'Delete profile "') + active.name + (fr ? ' » ?' : '"?'))) return;
    await deleteProfile(active.id);
    await reloadAll();
  });

  bar.append(add, ren, del);
}

async function reloadAll(): Promise<void> {
  await renderProfilesBar();
  const profile = await loadProfile();
  el('progress').textContent = completionPercent(profile) + '%';
  renderProfileForm(el('form'), profile, lang);
  applyTabVisibility();
  const cv = await loadStoredFile('cv');
  el('cvName').textContent = cv ? '📎 ' + cv.name : '';
  const cl = await loadStoredFile('coverLetter');
  el('clName').textContent = cl ? '📎 ' + cl.name : '';
  await refreshLearned();
  await refreshCreds();
}

async function refreshCreds(): Promise<void> {
  const creds = await listCredentials();
  const ul = el<HTMLUListElement>('creds');
  ul.textContent = '';
  for (const c of creds) {
    const li = document.createElement('li');
    li.textContent = `${c.domain} — ${c.email} `;
    const del = document.createElement('button');
    del.textContent = fr ? 'Supprimer' : 'Delete';
    del.className = 'iz-remove';
    del.addEventListener('click', async () => {
      await deleteCredential(c.domain);
      await refreshCreds();
    });
    li.appendChild(del);
    ul.appendChild(li);
  }
  if (creds.length === 0) {
    const li = document.createElement('li');
    li.textContent = fr ? 'Aucun compte enregistré.' : 'No saved accounts.';
    ul.appendChild(li);
  }
}

async function refreshLearned(): Promise<void> {
  const list = await loadLearned();
  const ul = el<HTMLUListElement>('learned');
  ul.textContent = '';
  for (const entry of list) {
    const li = document.createElement('li');
    li.textContent = `${entry.questionText} → ${entry.answer} `;
    const del = document.createElement('button');
    del.textContent = fr ? 'Supprimer' : 'Delete';
    del.className = 'iz-remove';
    del.addEventListener('click', async () => {
      const current = await loadLearned();
      const idx = current.findIndex((e) => e.questionText === entry.questionText && e.answer === entry.answer);
      if (idx >= 0) {
        current.splice(idx, 1);
        await saveLearned(current);
        await refreshLearned();
      }
    });
    li.appendChild(del);
    ul.appendChild(li);
  }
  if (list.length === 0) {
    const li = document.createElement('li');
    li.textContent = fr ? 'Aucune réponse apprise pour le moment.' : 'No learned answers yet.';
    ul.appendChild(li);
  }
}

async function exportProfile(): Promise<void> {
  const reg = await listProfiles();
  const active = reg.list.find((p) => p.id === reg.activeId);
  const profile = await loadProfile();
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (active?.name ?? 'profil') + '.izifill.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProfileFile(file: File): Promise<void> {
  try {
    const parsed: unknown = JSON.parse(await file.text());
    await saveProfile(mergeImportedProfile(parsed));
    const importedLearned = (parsed as Record<string, unknown> | null)?.learnedAnswers;
    const existing = await loadLearned();
    const merged = mergeLearnedAnswers(existing, importedLearned, lang);
    if (merged.length !== existing.length) await saveLearned(merged);
    await reloadAll();
    toast(fr ? 'Profil importé ✔' : 'Profile imported ✔');
  } catch {
    toast(fr ? 'Fichier JSON invalide.' : 'Invalid JSON file.');
  }
}

async function main(): Promise<void> {
  el('intro').textContent = fr
    ? 'Créez vos profils de candidature — izifill remplira avec le profil actif.'
    : 'Create your job profiles — izifill fills with the active one.';
  el('progressLabel').textContent = fr ? 'Profil complété :' : 'Profile completion:';
  el('filesTitle').textContent = fr ? 'Fichiers' : 'Files';
  el('clLabel').textContent = fr ? 'Lettre de motivation (fichier)' : 'Cover letter (file)';
  el('learnedTitle').textContent = fr ? 'Réponses apprises' : 'Learned answers';
  el('credsTitle').textContent = fr ? 'Comptes créés (pilote)' : 'Created accounts (pilot)';
  el('credsHint').textContent = fr
    ? 'Mots de passe générés, stockés uniquement sur cet ordinateur.'
    : 'Generated passwords, stored on this computer only.';
  el('save').textContent = fr ? 'Enregistrer cette section' : 'Save this section';
  el('exportBtn').textContent = fr ? 'Exporter (JSON)' : 'Export (JSON)';
  el('importBtn').textContent = fr ? 'Importer (JSON)' : 'Import (JSON)';

  renderTabs();
  await reloadAll();

  el('save').addEventListener('click', async () => {
    const updated = readProfileForm(el('form'));
    await saveProfile(updated);
    el('progress').textContent = completionPercent(updated) + '%';
    toast(t('profileSaved', lang));
  });

  el('exportBtn').addEventListener('click', () => void exportProfile());
  el('importBtn').addEventListener('click', () => el<HTMLInputElement>('importFile').click());
  el<HTMLInputElement>('importFile').addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) await importProfileFile(file);
    (e.target as HTMLInputElement).value = '';
  });

  el<HTMLInputElement>('cvFile').addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const stored = await fileToStoredFile(file);
    await saveStoredFile('cv', stored);
    el('cvName').textContent = '📎 ' + file.name;
    toast(fr ? 'CV enregistré ✔ (local à cet ordinateur)' : 'CV saved ✔ (local to this computer)');
  });

  el<HTMLInputElement>('clFile').addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const stored = await fileToStoredFile(file);
    await saveStoredFile('coverLetter', stored);
    el('clName').textContent = '📎 ' + file.name;
    toast(fr ? 'Lettre enregistrée ✔ (locale à cet ordinateur)' : 'Cover letter saved ✔ (local to this computer)');
  });
}

void main();
