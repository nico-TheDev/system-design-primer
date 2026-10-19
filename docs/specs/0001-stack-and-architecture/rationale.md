# 0001. Stack and architecture: rationale

Decision record for [index.md](index.md). `/develop` does not need this file.

## Context

This repo is the upstream System Design Primer: a 108 KB `README.md`, solved exercises in `solutions/` (markdown with relative images, plus 26 Python files for the object oriented ones), about 8.5 MB of diagrams in `images/`, and three Anki decks in `resources/flash_cards/`. The scope (`docs/scope/scope.md`) plans a personal study app on top of it: a guided path, progress tracking, timed exercise practice, spaced repetition flashcards, quizzes, and search.

Forces that shape the stack:

- **One user, one machine.** No accounts, no hosting, no scale target. The app runs on demand while you study. Nothing outside your computer should be able to reach it.
- **The content is upstream's, and it moves.** The app must read the markdown where it lives, never copy or edit it, so `git pull` from upstream just works. App code has to sit apart from upstream files so merges never conflict.
- **Content heavy, with interactive islands.** Most pages are long articles with diagrams and code blocks. A few features (flashcard review, a practice timer, mark done controls) need real component state.
- **State must last.** Progress and spaced repetition history (every review, with its timing) are the only data you create, and losing them would undo weeks of study. Browser storage can vanish with a site data reset.
- **Learning and maintenance budget.** One person builds and runs this in study time, so the stack has to be boring, well documented, and quick to restart after weeks away.

Without a decision, every later feature (content pipeline, design system, progress) would pick its own tools and storage, and they would not fit together.

## Options considered

Full stacks, compared as a whole.

### Option 1: Astro server app with React islands and SQLite

Astro 7 with server output and the Node adapter, React 19 islands for interactive parts, Astro Actions for writes, better-sqlite3 with Drizzle ORM, Tailwind CSS 4. Started with `pnpm dev` in `app/`.

**Pros**:
- The content layer (a typed store with a loader API and file watching) and Shiki code highlighting come built in, which covers most of the app (basis: Astro content layer)
- Real server, so state lives in a SQLite file you can back up, and writes are typed and validated by Actions
- Pages ship almost no JavaScript; only islands hydrate (basis: islands architecture)

**Cons**:
- Content and images sit outside the project root, so the built in `glob()` loader and markdown image optimisation don't apply; you write a custom loader that watches the files, plus an endpoint that serves the images
- Two component models to learn (`.astro` files and React)
- better-sqlite3 is a native addon, so a Node major upgrade can need a rebuild

### Option 2: React Router 8 framework mode with SQLite

Full stack React with loaders and actions, server rendering, the same SQLite and Drizzle layer.

**Pros**:
- One component model (React) everywhere, strong for the interactive features
- Loaders and actions are a clean, proven data flow

**Cons**:
- No content layer: markdown loading, heading extraction, image paths, and highlighting are all built by hand
- Every page ships React, which is heavier for long reading pages
- v8 shipped in June 2026 and now has yearly major releases, so expect churn (basis: React Router v8 announcement)

### Option 3: Vite + React single page app with IndexedDB

No server. A Vite plugin reads markdown at build or dev time; Dexie stores progress in the browser.

**Pros**:
- Fewest moving parts, no native addons, no server code
- Very fast dev loop

**Cons**:
- Progress and review history live in browser storage, which a site data reset or a browser switch wipes; backups become a manual export feature you must build
- Markdown pipeline is still hand built

### Option 4: SvelteKit 3 with SQLite

Server routes and form actions, Svelte components, the same database layer.

**Pros**:
- Small bundles and concise components
- Form actions handle writes well

**Cons**:
- Markdown pipeline hand built, like Option 2
- Smaller ecosystem for ready made accessible components, and a major version that just bumped to 3

## Rationale

The app is mostly reading, so the deciding force is how much of the content pipeline comes for free. Astro gives you the content layer (typed entries, a loader API with file watching, rendered headings) and Shiki, while Options 2 and 4 make you build those before the first useful page. To be honest about the limit: because the content lives outside the project, Astro's image optimisation doesn't reach `../images`, so a small image endpoint is needed whichever framework you pick. That matters most under the Skateboard approach: the smallest useful app (feature 5, a guided path with a clean reader) is nearly all content rendering.

The durability force rules out Option 3. Spaced repetition history is the one thing you can't regenerate, so it belongs in a file on disk you can copy, not in browser storage. A SQLite file needs a server, which Astro's server output provides with no extra service to run (basis: relational database as the default primary store). better-sqlite3 is preferred over the built in `node:sqlite` because the built in module is still a release candidate on Node 26 (basis: Node.js sqlite docs). Drizzle on its stable 0.45 line gives typed schema and generated migrations without Prisma's generate step and current release candidate churn (basis: ORM for CRUD, SQL for complexity). A simpler option exists: plain better-sqlite3 with a handful of hand written SQL statements, since the app may need only a few tables. Drizzle earns its place once progress, review history, and quiz results add up, because typed rows and generated migrations stop schema drift between features.

React for islands is the boring choice with the largest pool of examples and accessible components. Tailwind CSS 4 was your pick over plain CSS tokens. It works well here as long as theme values are defined as CSS variables through Tailwind's `@theme`, so feature 4 can drive light and dark themes from one place. Long markdown articles need a prose style layer (the typography plugin or a hand written `prose` stylesheet); feature 4 owns that choice.

The main risk in the chosen stack is content outside the project root. It is contained: a custom loader using `node:fs` and the loader's `watcher` does the job within the content layer API, and a read only image endpoint keeps Vite's file serving locked to `app/`, so no other decision changes.

## References

**Project sources** (verifiable, in this repo):
- `docs/scope/scope.md`: feature 1 intent, the Skateboard approach, the localhost and "reads the repo's own markdown" constraints
- Repo layout: `README.md`, `solutions/`, `images/`, `resources/flash_cards/`
- `docs/.agent-cache/research/stack-and-architecture.md`: landscape check of 2026-10-19 (versions, release candidate status)

**Practices & standards**:
- Monolith first for a single team and small scale
- Relational database as the default primary store
- ORM for CRUD, SQL for complexity
- Islands architecture (server rendered pages with isolated interactive components)
- Bind development servers to localhost unless remote access is required; keep host checks on against DNS rebinding
- Least exposure file serving (serve only allowed folders, never widen the dev server's file allowlist)
- SQLite WAL mode backups through `.backup` or `VACUUM INTO`, not a raw file copy

**Links** (web verified 2026-10-19):
- Astro content loader reference: https://docs.astro.build/en/reference/content-loader-reference/
- Node.js sqlite module (release candidate status): https://nodejs.org/api/sqlite.html
- React Router v8 announcement: https://remix.run/blog/react-router-v8
- Shiki guide: https://shiki.style/guide/
