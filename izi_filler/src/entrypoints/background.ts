import { seedFromBundle } from '../lib/seed';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener((details) => {
    // Repopulate profile + CV from the bundled seed after a fresh install (or
    // an update that finds storage empty); seedFromBundle no-ops if data exists
    // or no seed file is bundled. Then open onboarding on first install.
    void seedFromBundle(chrome.runtime.getURL).then((seeded) => {
      if (details.reason === 'install') {
        void chrome.tabs.create({ url: chrome.runtime.getURL('/onboarding.html') });
      } else if (seeded) {
        console.info('[izifill] profile restored from bundled seed');
      }
    });
  });

  // The in-page sidebar can't open extension pages directly; it asks us to.
  chrome.runtime.onMessage.addListener((msg: { type?: string; page?: string }) => {
    if (msg?.type === 'izifill:open') {
      const page = msg.page === 'tracker' ? '/tracker.html' : '/onboarding.html';
      void chrome.tabs.create({ url: chrome.runtime.getURL(page) });
    }
  });
});
