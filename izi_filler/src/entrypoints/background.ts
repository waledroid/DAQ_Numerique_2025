export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      void chrome.tabs.create({ url: chrome.runtime.getURL('/onboarding.html') });
    }
  });

  // The in-page sidebar can't open extension pages directly; it asks us to.
  chrome.runtime.onMessage.addListener((msg: { type?: string; page?: string }) => {
    if (msg?.type === 'izifill:open') {
      const page = msg.page === 'tracker' ? '/tracker.html' : '/onboarding.html';
      void chrome.tabs.create({ url: chrome.runtime.getURL(page) });
    }
  });
});
