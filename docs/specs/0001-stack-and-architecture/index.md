# 0001. Astro server app with React islands and SQLite for the study app

**Date**: 2026-10-19
**Status**: Accepted

## Summary

The study app is a small Astro website that runs only on your computer, lives in its own `app/` folder, and reads the repo's markdown in place without ever changing it. Interactive parts (flashcards, the practice timer, mark done buttons) are small React components, and everything you create (progress, review history) is saved to one SQLite file (a single file database) on disk. You start it with `pnpm dev` inside `app/`. This was chosen because most of the app is reading long articles, which Astro handles out of the box, and because your study history needs to survive a browser reset.

## Decision

**Chosen option**: Option 1: Astro server app with React islands and SQLite

Build the app as one Astro 7 project in `app/`, server rendered with the Node adapter, React 19 for interactive islands, Astro Actions for every write, and better-sqlite3 with Drizzle ORM storing state in a gitignored SQLite file, styled with Tailwind CSS 4, run locally with pnpm on Node 26.

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Architecture pattern | Single Astro app (a monolith), no separate API service | One user and one process; a second service would only add moving parts. |
| Language | TypeScript, strict (`astro/tsconfigs/strict`) | Catches content shape bugs (topics, exercises, cards) at build time. |
| Framework | Astro 7, `output: 'server'`, `@astrojs/node` adapter (standalone mode) | Built in content collections and Shiki highlighting cover most of the app; server output enables saving to disk. The adapter stays so `pnpm build` keeps working, even though `pnpm dev` is the daily path. |
| Interactive UI | React 19 islands via `@astrojs/react` | Largest ecosystem for stateful components such as flashcard review and timers; only islands ship JavaScript. |
| Content source | Astro content layer with a custom loader that reads `../README.md` and `../solutions/**` in place (read only) and registers them with the loader's `watcher` | Upstream updates and edits reload without a copy step. Files outside the project are not watched unless the loader adds them. Parsing details belong to the content pipeline spec (feature 3). |
| Repo images | One read only Astro endpoint that serves files from `../images/` and image files under `../solutions/` | Vite's `fs.allow` stays at its default so the dev server can never serve `.git`, `docs/`, or other repo files. Feature 3 rewrites markdown image paths to this endpoint. |
| Writes | Astro Actions (`src/actions/`), inputs validated with Zod imported from `astro:schema` (no separate zod dependency) | Typed server functions callable from islands and plain forms; no hand rolled fetch layer. |
| Primary DB | SQLite file via better-sqlite3 | Durable, one file you can copy or back up, synchronous and fast for one user. Built in `node:sqlite` is still a release candidate on Node 26. |
| Data access | Drizzle ORM 0.45.x + drizzle-kit migrations | Typed schema in TypeScript, generated SQL migrations, light. Stay on the stable 0.45 line, not the 1.0 release candidate. |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite` | Your pick. Theme values live as CSS variables in `@theme` so feature 4 can drive light and dark themes from one place. |
| Runtime and packages | Node 26 (`.nvmrc`), pnpm (`packageManager` field) | Both already installed; Node is the runtime every tool here is tested on first. |
| Start command | `pnpm dev` inside `app/` (Astro dev server), port pinned to 4321 with `vite.server.strictPort: true` | Hot reload and live content. A second copy fails loudly instead of quietly moving to 4322. For a personal app the dev server is the app. |
| Network reach | localhost only: `server.host: 'localhost'` set explicitly, Vite's default `allowedHosts` left in place | No login needed because nothing outside your machine can reach it; the host check also blocks DNS rebinding (a trick where a web page aims your browser at localhost). |
| Auth | None | Single user, localhost only. Revisit only if network reach changes. |
| Observability | Console logging from the dev server | Nothing to monitor for one local user; errors show in the terminal. |
| Hosting | None | Runs on your machine only. |

Not decided here (each belongs to its feature's spec): the content loader and image handling (feature 3), the visual design and prose styles (feature 4), the progress schema (feature 6), the spaced repetition and Anki libraries (feature 8), and the search library (feature 10).

## Architecture

**Folder layout** (everything new lives under `app/`; upstream files stay untouched):

```
app/
  package.json          packageManager: pnpm, engines.node >= 26
  .nvmrc                26
  .gitignore            node_modules, dist, .astro, data/*.db*
  astro.config.mjs      output: 'server', node adapter, react, tailwind vite plugin,
                        server { host: 'localhost', port: 4321 }, vite.server.strictPort,
                        vite.ssr.external: ['better-sqlite3']
  drizzle.config.ts     dialect sqlite, schema src/db/schema.ts, out drizzle/
  tsconfig.json         extends astro/tsconfigs/strict
  drizzle/              generated migrations (committed)
  data/                 study.db lives here (gitignored)
  src/
    content.config.ts   collections that read ../README.md and ../solutions/**
    pages/              routes (.astro)
    layouts/            page shells (.astro)
    components/         static components (.astro)
    components/islands/ interactive React components (.tsx)
    actions/index.ts    every write the app makes
    db/schema.ts        Drizzle tables
    db/client.ts        opens the SQLite file once, applies migrations on first open
    pages/repo-images/[...path].ts   read only image endpoint (allowed folders only)
    styles/global.css   @import "tailwindcss" + @theme tokens
```

**Layers and data flow**:
- *Content* (read only): repo markdown → custom content loader → pages; repo images → the `repo-images` endpoint. No code path writes outside `app/`.
- *State*: React island or form → Astro Action → `src/db` → SQLite. Pages read state through `src/db` on the server while rendering.
- Only `src/db/` imports better-sqlite3 or Drizzle. Islands never import server modules.

**Key invariants**:
- The app never creates, edits, or deletes a file outside `app/` (upstream content is read only).
- Nothing is added at the repo root or in upstream folders, so upstream merges never conflict. The only shared folder is `docs/`.
- The server listens on localhost only: `server.host: 'localhost'` stays in config, never pass `--host`, never widen `allowedHosts`.
- Vite's `server.fs.allow` is never widened to the repo root. Repo files reach the browser only through the `repo-images` endpoint, which rejects any path outside `../images/` and the image files under `../solutions/`, and any path containing `..` after normalising.
- Astro's `security.checkOrigin` stays on (its default), which blocks cross site form posts to Actions.
- Every state change goes through an Astro Action with a Zod schema. No other write path.
- Paths are resolved from the app root, `process.cwd()` (pnpm runs every script with `app/` as its working directory): the DB at `STUDY_DB_PATH` or `data/study.db`, migrations at `drizzle/`. `db/client.ts` creates `data/` if it is missing.
- The DB connection opens lazily on first use and is kept as one shared instance on `globalThis`, so hot reload never opens a second connection or runs migrations twice.
- Migrations are generated with `drizzle-kit generate`, committed, and applied on that first open (single user, so no migration race). SQLite runs in WAL mode (write ahead logging, safer under concurrent reads).
- Theme colors, spacing, and fonts are CSS variables under Tailwind's `@theme`, never hard coded per component.

**Security model**: no accounts and no roles. Protection comes from network reach (localhost only) plus the origin check. If you ever want access from a phone or tablet, that is a new decision, and it needs at least a passcode first.

**Configuration required**:
- `STUDY_DB_PATH` (optional): path to the SQLite file. Defaults to `app/data/study.db`.

**Setup notes for the scaffold**:
- `app/` is a standalone pnpm project: no `pnpm-workspace.yaml` or `package.json` at the repo root.
- pnpm blocks dependency install scripts by default, so allow better-sqlite3 (and esbuild) to build, through `onlyBuiltDependencies` or `pnpm approve-builds`, or the native binding will be missing at runtime. If no prebuilt binary exists for Node 26, it compiles from source, which needs the Xcode command line tools.
- After a Node major upgrade, run `pnpm rebuild better-sqlite3`.
- The scaffold's one page runs a trivial query through `db/client.ts` (which applies an initial migration), so "shows a page" proves Astro, the native driver, and migrations together. `pnpm build` must also succeed.
- First spike: a minimal custom loader that reads `../README.md` with `node:fs`, calls `watcher.add()` on it, and reloads on edit (feature 3 builds the real one).

**Run it**: `cd app && pnpm install && pnpm dev`, then open http://localhost:4321.

## Consequences

**Positive**:
- Long reading pages ship almost no JavaScript, so they stay fast and calm.
- Your study history is a single SQLite database you can back up or inspect with any SQLite tool.
- Upstream pulls stay conflict free, and content updates show up without manual steps.
- Every later feature inherits one storage layer and one write path instead of inventing its own.

**Negative / tradeoffs**:
- Two component models to learn: `.astro` for pages and React for islands, with a clear rule for which goes where.
- better-sqlite3 is a native addon: it needs install scripts allowed and a rebuild after Node major upgrades.
- Content and images live outside the project root, so Astro's built in `glob()` loader and markdown image optimisation don't apply. A custom loader with its own file watching and an image endpoint are extra code to own.
- Running the dev server as the app means slightly slower first page loads and dev only overlays; fine for one user, wrong if this is ever hosted.
- Tailwind utility classes make markdown prose styling a separate concern (typography plugin or a hand written `prose` stylesheet) that feature 4 has to settle.

**Neutral**:
- No tests, lint, or format tooling are chosen here; feature 2 (`/audit`) owns them.
- `app/data/study.db` is gitignored, so backups are your call. In WAL mode the database is three files (`.db`, `-wal`, `-shm`), so never copy just the `.db` while the server runs; use SQLite's `.backup` command or `VACUUM INTO`.

## Follow-up

- [ ] Spike the custom content loader and file watching early in the scaffold (see Setup notes); record the outcome in the content pipeline spec (feature 3).
- [ ] Root `AGENTS.md` does not exist yet. Feature 2 (`/audit`) should capture this stack, the `app/` boundary, and the invariants above as project wide rules.
- [ ] Landscape notes for later specs (as of 2026-10-19, verify then): ts-fsrs 5.4 for spaced repetition; `anki-apkg-parser` 2.0 or reading the `.apkg` zip's SQLite file directly for the decks (`anki-reader` is unmaintained); MiniSearch 7 or Pagefind 1.5 for search. Avoid Prisma while its `latest` tag is a release candidate.
- [ ] Consider a `pnpm db:backup` script (using `VACUUM INTO`) once progress tracking ships (feature 6).
- [ ] Agent Skills for this stack were offered on 2026-10-19 and declined (Astro, Tailwind 4, Drizzle, React, pnpm, TypeScript candidates). Record this on the root `AGENTS.md` `## Agent skills` `Declined:` line so they are not offered again.
- [ ] MCP servers skipped for now. Two could help later: the official Astro Docs MCP (`claude mcp add --transport http astro-docs https://mcp.docs.astro.build/mcp`) for live Astro 7 docs during the content loader spike, and a SQLite server to inspect `study.db` once it exists (verify the package in the official MCP servers repo first).

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
