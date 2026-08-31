import { renderProfileForm, readProfileForm } from '../../pages/profile-form';
import { completionPercent } from '../../engine/profile';
import {
  loadLearned, loadProfile, loadStoredFile, saveLearned, saveProfile, saveStoredFile,
} from '../../lib/storage';
import { detectLang, t } from '../../lib/i18n';

const lang = detectLang();
const fr = lang === 'fr';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function toast(msg: string): void {
  const node = el<HTMLDivElement>('toast');
  node.textContent = msg;
  node.style.display = 'block';
  setTimeout(() => (node.style.display = 'none'), 3000);
}

async function refreshLearned(): Promise<void> {
  const list = await loadLearned();
  const ul = el<HTMLUListElement>('learned');
  ul.textContent = '';
  for (const [i, entry] of list.entries()) {
    const li = document.createElement('li');
    li.textContent = `${entry.questionText} → ${entry.answer} `;
    const del = document.createElement('button');
    del.textContent = fr ? 'Supprimer' : 'Delete';
    del.className = 'iz-remove';
    del.addEventListener('click', async () => {
      const current = await loadLearned();
      current.splice(i, 1);
      await saveLearned(current);
      await refreshLearned();
    });
    li.appendChild(del);
    ul.appendChild(li);
  }
  if (list.length === 0) {
    ul.innerHTML = `<li>${fr ? 'Aucune réponse apprise pour le moment.' : 'No learned answers yet.'}</li>`;
  }
}

async function main(): Promise<void> {
  el('intro').textContent = fr
    ? 'Remplissez votre profil une fois — izifill remplira vos candidatures.'
    : 'Fill your profile once — izifill will fill your applications.';
  el('progressLabel').textContent = fr ? 'Profil complété :' : 'Profile completion:';
  el('filesTitle').textContent = fr ? 'Fichiers' : 'Files';
  el('learnedTitle').textContent = fr ? 'Réponses apprises' : 'Learned answers';
  el('save').textContent = fr ? 'Enregistrer le profil' : 'Save profile';

  const profile = await loadProfile();
  el('progress').textContent = completionPercent(profile) + '%';
  renderProfileForm(el('form'), profile, lang);

  const cv = await loadStoredFile('cv');
  if (cv) el('cvName').textContent = '📎 ' + cv.name;

  el('save').addEventListener('click', async () => {
    const updated = readProfileForm(el('form'));
    await saveProfile(updated);
    el('progress').textContent = completionPercent(updated) + '%';
    toast(t('profileSaved', lang));
  });

  el<HTMLInputElement>('cvFile').addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    await saveStoredFile('cv', { name: file.name, mime: file.type, data: btoa(bin) });
    el('cvName').textContent = '📎 ' + file.name;
    toast(fr ? 'CV enregistré ✔ (local à cet ordinateur)' : 'CV saved ✔ (local to this computer)');
  });

  await refreshLearned();
}

void main();
