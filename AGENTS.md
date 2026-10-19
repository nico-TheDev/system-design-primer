# System Design Primer + Study App

A fork of the upstream System Design Primer, with a personal local study app added in `app/`. The upstream content is read only for the app and for agents.

## Stack

- **Language / Runtime**: TypeScript (strict), Node 26
- **Framework**: Astro 7 (server output, Node adapter), React 19 islands
- **Key dependencies**: Tailwind CSS 4, better-sqlite3, Drizzle ORM 0.45
- **Package manager**: pnpm 11 (run inside `app/`)

Source of truth: [docs/specs/0001-stack-and-architecture/index.md](docs/specs/0001-stack-and-architecture/index.md).

## Build approach

Skateboard: ship the smallest study app you would actually use, then make it more useful one release at a time.

## Commands

All run inside `app/`. Full list in [app/AGENTS.md](app/AGENTS.md).

```bash
pnpm install   # install
pnpm dev       # dev server on http://localhost:4321
pnpm build     # production build
pnpm check     # format check + lint + typecheck, run before every commit
# Test: no runner yet. Vitest is added with the first test (spec 0002).
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`, or a folder `NNNN-title/` with `index.md`. The feature plan is in `docs/scope/`.

## Rules

- Never edit upstream files: `README*.md`, `solutions/`, `resources/`, `images/`, `CONTRIBUTING.md`. The app reads them in place. Add no tool config at the repo root.
- Functional style: pure functions by default, plain functions over classes, side effects (database, files, network) at the edges.
- Data is immutable: `const`, `readonly`, no mutation in place. Module level variables are constants only (the shared DB connection in `app/src/db/client.ts` is the one documented exception).
- Prefer explicit `undefined` in union types over `null`.
- Expected failures follow spec 0002: Actions throw `ActionError`, unexpected errors are logged once and rethrown generically.
- Named exports only, default exports only where a framework requires them. Keep naming consistent (PascalCase components, kebab-case other files).
- Accessibility baseline on UI: WCAG AA.
- Conventional Commits: `type(scope): summary`, scope `app` or `docs`.
- Tests: none yet. Verify with `/check verify` against the real app.

## Git

- integration: on
- branch prefix: feat/
- commit: per-milestone

## Agent skills

Declined: Astro, Tailwind 4, Drizzle, React, pnpm, TypeScript (offered 2026-10-19, spec 0001), ESLint, Prettier, typescript-eslint, Vitest (offered 2026-10-19, spec 0002)

## Context files

- [app/AGENTS.md](app/AGENTS.md) (the study app: commands, conventions, lint and format setup, invariants)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
