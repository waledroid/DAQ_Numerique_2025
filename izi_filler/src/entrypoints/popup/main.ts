import { loadApplications } from '../../lib/storage';
import { detectLang } from '../../lib/i18n';

const fr = detectLang() === 'fr';
const el = (id: string) => document.getElementById(id)!;

el('fill').textContent = fr ? 'Remplir cette page' : 'Fill this page';
el('profile').textContent = fr ? 'Mon profil' : 'My profile';
el('tracker').textContent = fr ? 'Mes candidatures' : 'My applications';

el('fill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id !== undefined) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'izifill:fill' });
    } catch {
      // content script not available on this page (e.g. chrome:// URLs)
    }
  }
  window.close();
});
el('profile').addEventListener('click', () => {
  void chrome.tabs.create({ url: chrome.runtime.getURL('/onboarding.html') });
});
el('tracker').addEventListener('click', () => {
  void chrome.tabs.create({ url: chrome.runtime.getURL('/tracker.html') });
});

void loadApplications().then((apps) => {
  el('count').textContent = fr ? `${apps.length} candidature(s) suivie(s)` : `${apps.length} tracked application(s)`;
});
