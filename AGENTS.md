# AGENTS.md

Monorepo for the **DAQ Numérique 2025** coursework (IRFA Chalon-sur-Saône). One git repo,
**no root `package.json`, no root build/test/lint** — each subproject is self-contained and
must be worked on from its own directory. Deploys to Netlify (`master`/`main` → portfolio site).

## Project map

| Dir | What | Commands (run in the dir) |
|---|---|---|
| `portfolio/` | Main static portfolio (Atanda Abdullahi) — 6 pages + 3 standalone case-study/editor pages, no build step | `node server.js` → http://localhost:46323 (static preview + CV save API + letter AI). `python3 -m http.server 46323` = read-only fallback (CV editor uses localStorage). Verify by browser console, not tests. |
| `izi_filler/` | Chrome MV3 extension "izifill" (WXT + TypeScript, zero network) | `npm install` then `npm test` (Vitest + happy-dom), `npm run typecheck`, `npm run dev`, `npm run build` → `.output/chrome-mv3/`. Single test: `npx vitest run tests/engine/matcher.test.ts`. Manual smoke list: `docs/SMOKE.md`. |
| `hivegames-frontend/` | React 19 + Vite 6 + Tailwind 4 SPA | `npm install`, `npm run dev`, `npm run build`, `npm run lint` (ESLint). No tests. |
| `Calculatrice/` | Vanilla HTML/CSS/JS calculator | static, no tooling |
| `Site_Web_CodaQ/` | Vanilla static formation site | static, no tooling |

## Portfolio — read these first

- **`portfolio/CLAUDE.md`** is the authoritative guide for the portfolio (page skeleton, shared
  design system, conventions). **`portfolio/DESIGN_BRIEF.md`** is the authoritative spec for
  facts, tokens and components. Read both before editing any `portfolio/` page.
- Nav/footer are injected by `portfolio/assets/js/main.js` from its `PAGES` array — never
  hand-write them. Adding a page = create the HTML **and** add it to `PAGES`.
- Nav pages: `index/about/experience/projects/lab/contact.html`. Standalone (NOT in `PAGES`):
  `cv.html` (engineer CV editor), `cv_blue/cv.html` (hospitality CV editor), `isimonitor3d.html`,
  `isidetector.html` (immersive case studies).
- **Facts only.** Never invent employers, dates, or metrics; copy comes from
  `DESIGN_BRIEF.md` §1 / `data/cv.json`. Never name the Isitec/IsiMonitor client (Celio).
- CV data files: `portfolio/data/cv.json` (engineer, public) and `portfolio/cv_blue/cv.json`
  (hospitality variants). Write them via a Python load→mutate→`json.dump(..., ensure_ascii=False,
  indent=2)` + trailing newline so diffs stay byte-clean. `.claude/agents/cv.md` defines a `cv`
  agent that tailors a CV + cover letter from a pasted job offer.

## Gotchas

- **Design-token naming is inconsistent**: `CLAUDE.md`/`tw-config.js` say "EDGE VISION",
  `site.css`/`DESIGN_BRIEF.md` say "LIQUID OPTICS". The live tokens are `accent:#A3E635`,
  `volt:#B4FF39`, `emerald:#34D399` in `portfolio/assets/js/tw-config.js` — trust the code.
- **`portfolio/CLAUDE.md` is stale on one point**: it claims `cv_blue/` is gitignored/private,
  but `cv_blue/cv.html|cv.js|cv.json` are tracked and the Netlify `cv.js` function can commit
  them (`?doc=cv_blue`). Treat `cv_blue/` as committed.
- CV editor saves are **auto-committed to `main` by the Netlify function** (messages
  `CV:` / `CV Blue: mise à jour via l'éditeur`) — pull before editing the CV JSON locally.
- `portfolio/server.js` header comments say port 8000; the actual default is **46323**
  (`PORT` env overrides). `/api/letter` needs `OPENROUTER_API_KEY` in the shell env.
- Root `netlify.toml`: `base = "portfolio"`, so `publish = "."` is intentional (NOT
  `"portfolio"`). Netlify function env vars: `GITHUB_TOKEN`, `EDITOR_PASSWORD`,
  `OPENROUTER_API_KEY` (see `portfolio/netlify/functions/cv.js` and `letter.js`).
- Root `.gitignore` ignores `/*.mp4` — raw source videos live at the repo root and must stay
  uncommitted; web-compressed copies belong in `portfolio/assets/`.
- `izi_filler` imports use **relative paths only** (no `@/` alias) so Vitest needs no alias
  config; all sync writes go through `ChunkedStore`. Work from `izi_filler/` when committing.
- Never use `?v=N` cache-bust changes on portfolio logos without bumping `N`.
