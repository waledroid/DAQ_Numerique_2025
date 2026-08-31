# izifill

Chrome extension that fills job applications from a profile you save once.
FR + EN. No server, no account, zero network calls — everything stays in your browser
(`chrome.storage.sync` for data, local storage for files).

## Develop

```bash
npm install
npm test          # unit + DOM tests (Vitest, happy-dom)
npm run dev       # WXT dev mode with hot reload
npm run build     # production build → .output/chrome-mv3/
```

## Install in Chrome

1. `npm run build`
2. Open `chrome://extensions`, enable Developer mode
3. "Load unpacked" → select `.output/chrome-mv3/`
4. The profile page opens on first install — fill it once.

## Use

Visit a job application page → izifill offers to fill it. It fills each step as you
click Next (it never clicks anything itself), highlights what it filled (green),
what it guessed (orange) and what it left for you (red), offers to remember your
answers to custom questions, and records the application in the tracker when you submit.

## Known limitations

- Files (CV / cover letter) are stored locally and do not sync across devices.
- Some sites block automatic CV attachment for security reasons — attach the file
  manually on those sites.
- Submit tracking needs a visible confirmation (a "thank you" page, or the form
  disappearing) to record an application; a URL change alone is not treated as proof.
- Single-page apps are detected by watching for URL changes (checked every second).
  If the fill prompt doesn't appear on a new step, use the popup's "Fill this page".
