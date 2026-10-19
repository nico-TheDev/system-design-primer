# Study app (`app/`)

A local Astro website that turns the repo's markdown into a guided study path. It reads upstream content in place and keeps your own progress in a SQLite file. Runs on localhost only.

## Key files

| File | Owns |
|---|---|
| `src/db/client.ts` | Opens the SQLite file once, applies migrations on first open |
| `src/db/schema.ts` | Drizzle tables |
| `src/db/*.ts` | The only code allowed to import `better-sqlite3` or `drizzle-orm` |
| `src/actions/index.ts` | Every write the app makes (Astro Actions, Zod input) |
| `src/components/islands/` | Interactive React `.tsx` components |
| `src/content-pipeline/` | Turns `README.md` and `solutions/` into the `topics` and `exercises` collections (`src/content.config.ts`); repo images are served by `src/pages/repo-images/` |
| `src/lib/` | Pure helpers for the study path, navigation and progress counts |
| `src/styles/tokens.css` | Design tokens; every UI value reads from here |
| `eslint.config.mjs` | Lint rules, including the import boundaries |
| `prettier.config.mjs` | Format rules |

## Commands

```bash
pnpm dev           # http://localhost:4321 (port is pinned)
pnpm build
pnpm format        # prettier --write .
pnpm format:check
pnpm lint          # eslint .
pnpm lint:fix
pnpm typecheck     # astro check
pnpm check         # format:check, lint, typecheck; stops at first failure
pnpm db:generate   # drizzle-kit generate
```

Run `pnpm check` before every commit. No hooks or CI run it for you.

## Conventions

- Imports: `@/` for anything outside the current folder, `./` only inside it. Use `import type` for type only imports. Order: node built ins, packages, `@/`, relative.
- Names: components PascalCase (`.astro`, `.tsx`), every other file and folder kebab-case, Astro routes follow Astro's rules. Columns snake_case in SQL, camelCase in TypeScript.
- Default to `.astro`. Use React only for state, effects or event handlers, in `src/components/islands/`.
- Hydrate with `client:visible`. `client:load` and `client:only` need a one line comment saying why.
- Comment the why, not the what. One short line above the thing.
- Actions: expected failures throw `ActionError` with a safe message. Unexpected errors: `console.error('[area] what failed', error)` once, then throw a generic `ActionError`. Never swallow errors. No `console.log`.
- `eslint-disable` needs a reason in the same comment.
- Tooling note: type aware rules run on `.ts`, `.tsx` and `.astro` frontmatter (no fallback needed). TypeScript is pinned to 6.0 because typescript-eslint and `@astrojs/check` do not support 7 yet.
- When the first test is written, follow the Test setup section of spec 0002 (Vitest, `pnpm test` added to `pnpm check`).

## Gotchas

- Islands must not import `@/db` or any server module; they call `astro:actions`. Lint enforces this.
- Never pass `--host`, widen `allowedHosts` or Vite `fs.allow`. Localhost only.
- Paths resolve from `process.cwd()`, so run scripts from `app/`.
- Never write outside `app/`. Generated folders (`drizzle/`, `.astro/`, `dist/`) are not edited or linted.

## Related specs

- [0001 stack and architecture](../docs/specs/0001-stack-and-architecture/index.md)
- [0002 coding standards and tooling](../docs/specs/0002-coding-standards-and-tooling/index.md)
- [0003 content pipeline](../docs/specs/0003-content-pipeline/index.md)
- [0004 design system and UI foundation](../docs/specs/0004-design-system-ui-foundation/index.md)
- [0005 guided study path](../docs/specs/0005-guided-study-path/index.md)
- [0006 progress tracking](../docs/specs/0006-progress-tracking.md)
- [0007 exercise practice mode](../docs/specs/0007-exercise-practice-mode/index.md)
- Design system: build all UI to [DESIGN.md](DESIGN.md) (art direction); token values live in CSS.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
