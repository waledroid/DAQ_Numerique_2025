# izifill — manual smoke checklist

Run before calling any milestone done.

1. `npm install && npm test && npm run build` — all green.
2. Load `.output/chrome-mv3/` unpacked at `chrome://extensions`.
3. First install opens the profile page. Fill identity, contact, one experience,
   standard answers; upload a CV and optionally a cover letter; save. Reload the page — data persists, completion % > 0.
4. Open the popup — three buttons + application count render.
5. Visit a real job application (e.g. any HelloWork / Indeed / Welcome to the Jungle posting,
   or a Greenhouse `boards.greenhouse.io/...` form). The izifill prompt appears.
6. Click "Yes, fill" — fields fill with green/orange highlights; red on unknown fields;
   summary panel shows counts. Verify no filled value is wrong.
7. Type an answer into a red field, blur — "Save this answer" chip appears; click it;
   check it appears in the profile page's learned answers.
8. Multi-step flow: click the site's Next — the new step fills automatically.
9. Submit the application (a test one!) — "Application tracked ✔" toast appears;
   the tracker page lists it; change its status; delete works.
10. Click "Never on this site" on some other site — prompt stops appearing there.
11. Check the service worker console and page console for errors — none from izifill.
