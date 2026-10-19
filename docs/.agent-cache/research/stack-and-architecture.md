# Stack research: local markdown study app (as of 2026-10-19)

Versions below are from the npm registry (checked 2026-10-19) unless noted. "Confirmed" means the official page was fetched and loaded.

## 1. Web framework

| Option | Latest (npm) | Status / note | Link |
|---|---|---|---|
| Astro | 7.4.0 | Content-heavy default. Content layer `glob()` loader works, but the docs do not say whether `base` may point outside the project (no `../` or absolute example). Needs a quick spike. | [content loader ref](https://docs.astro.build/en/reference/content-loader-reference/) (confirmed) |
| React Router (framework mode) | 8.4.0 | v8 shipped 2026-06-17. Framework mode continues. ESM-only, Node 22.22+, React 19.2.7+, Vite 7+. `react-router-dom` removed. v6 and Remix v2 are EOL. Yearly major releases from now on. | [v8 post](https://remix.run/blog/react-router-v8) (confirmed) |
| Next.js | 16.4.2 | Mature. App Router and RSC, Vercel-oriented. Heavier than needed for a local app. Markdown loading from outside the project is DIY. | npm only, not fetched |
| SvelteKit | 3.1.0 | Major bumped. Not researched beyond the version. | npm only, not fetched |
| TanStack Start | 1.169.3 | Built on TanStack Router, Vite and Nitro. Younger and moving fast. No built-in markdown collections, so DIY loading. | npm only, not fetched |
| Vite + React SPA | vite 8.3.4 | Simplest for a local-only app. Markdown read at build time through a Vite plugin or a prebuild script. No SSR needed. | npm only, not fetched |

Suggested lean: Astro if the content pipeline matters most (loader, Shiki, images). Vite + React SPA if the interactive pages dominate. Check the Astro `base` outside-project behavior with a spike before committing.

## 2. Markdown pipeline

- unified 11.0.5, remark-parse 11.0.0, rehype-parse 9.0.1. Stable, ESM-only. Current.
- @mdx-js/mdx 3.1.1. Stable. Only needed if you want components inside prose.
- Shiki 4.5.0 (`@shikijs/rehype` 4.5.0). The Shiki site labels v4.5.0 as current. ESM-only. Runtime-agnostic, no Node APIs needed. [Shiki guide](https://shiki.style/guide/) (confirmed)
- Astro content layer: `glob({ base, pattern })` loader. See the caveat under Astro above.

## 3. Local persistence

- **node:sqlite (built in)**: still a release candidate in the Node 26 docs (`Stability: 1.2 - Release candidate`). Confirmed on the docs page labeled v26.12.0. [Node sqlite docs](https://nodejs.org/api/sqlite.html) (confirmed). Note: the Node docs say `DatabaseSync` is a deprecated alias for `Database` (DEP0210). Local Node is v26.8.2.
- A secondary source reports a TEXT decoder bug that truncates at embedded NUL in several Node 22/24/25/26.0 releases, fixed in 24.16.0 and 26.1.0. Not verified against the official changelog.
- **better-sqlite3** 13.0.3. Mature, native addon, synchronous API. Stable choice.
- **@libsql/client** 0.18.0. Turso/libSQL. Fine if you want a future sync story.
- **Drizzle ORM**: `latest` tag is 0.45.4 (stable). A 1.0 release candidate line exists (1.0.0-rc.5 tag). Lightweight, SQL-first.
- **Prisma**: `latest` tag is 8.0.0-rc.23 (release candidate). Last stable is 7.10.1 (`prev` tag). Heavier, with a generator step. Major version in flux. Avoid for this app unless you want the RC.
- **Dexie** 4.4.6 (IndexedDB). Mature. Good if state must live in the browser only, with no file-system DB.

Suggested lean: better-sqlite3 (or node:sqlite once it leaves RC) plus Drizzle 0.45.x. Pick Dexie only if you do not want a server-side or file DB.

## 4. Spaced repetition and Anki

- **ts-fsrs** 5.4.2. FSRS-6 (per the README badge). Node 20+. Has `repeat()` and `next()`. Repo is active (289 commits, changesets). Latest release date not visible on the GitHub page. [ts-fsrs repo](https://github.com/open-spaced-repetition/ts-fsrs) (confirmed)
- **.apkg readers (npm)**:
  - `anki-apkg-parser` 2.0.0, published 2026-10-15, MIT. Reads .apkg and .colpkg: notes, cards, note types and media. Deps: fzstd, yauzl, protobufjs. Most recent. Best first candidate.
  - `ankipack` 0.3.1, published 2026-09-08, MIT. Reads and writes .apkg with FSRS support. Works in browser and Node. Also a candidate.
  - `anki-reader` 0.3.0, last published 2023-11-05. Stale. Uses sql.js. Avoid.
  - Fallback: .apkg is a zip containing a SQLite collection (`collection.anki2` or `.anki21`). Unzip and read with better-sqlite3 directly. Works regardless of library state.

## 5. Search

- **Pagefind** 1.5.2 (npm), docs reference 1.5.0. Indexes built HTML after the build (CLI, `--site`). Smallest client payload, chunked. Index is static, so it needs a rebuild on content change. [Pagefind docs](https://pagefind.app/docs/) (confirmed). No documented Node API for build-time use, only the CLI or binary.
- **MiniSearch** 7.2.0. In-browser, loads the full index. Fine for a few hundred docs. Full control over ranking.
- **Orama** 3.1.18. Apache 2.0 library. Full-text, vector and hybrid search. Heavier than needed for this size.
- **FlexSearch** 0.8.212 (npm). Still on 0.8.x. Lower priority.

Suggested lean: MiniSearch if you index in-app and want control. Pagefind if you already have a build step over HTML output.

## Deprecated or in turmoil

- Node `node:sqlite`: still RC on Node 26 (not stable yet).
- Prisma: `latest` is an 8.0 RC, not stable.
- React Router v6 and Remix v2: EOL. v7 gets security updates only.
- Drizzle 1.0: RC line, not yet `latest`.
- anki-reader: unmaintained since 2023.
- react-router-dom: removed in v8.

## Unverified

- Astro glob loader with `base` outside the project root.
- Next.js 16 and SvelteKit 3 details beyond the npm version.
- Node NUL-truncation bug fix versions (from a secondary source).
