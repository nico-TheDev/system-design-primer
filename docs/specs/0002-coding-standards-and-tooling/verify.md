# Verify: coding standards & tooling · spec 0002 · updated 2026-10-19
_Steps derived from spec 0002. The spec has no numbered acceptance criteria, so steps map to its Standard definition and Enforcement sections. `/check verify` runs these; `/test` locks the durable ones._
## UI / manual
- [x] Open `app/prettier.config.mjs`, `app/eslint.config.mjs`, `app/.prettierignore` → all exist, Tailwind plugin is last in `plugins`   → Tooling
- [x] `pnpm dev` in `app/`, open http://localhost:4321 → page still shows "Database check: ok"   → Rollout (cleanup did not break the app)
## Commands (run from `app/`)
- [x] `pnpm check` → exits 0 (format, lint, typecheck all clean)   → Commands
- [x] `pnpm format:check`, `pnpm lint`, `pnpm typecheck` each run alone → each exits 0   → Commands
- [x] `pnpm build` → completes   → Rollout
- [x] Add `import { eq } from 'drizzle-orm';` to a file under `src/pages/` then `pnpm lint` → error "Only src/db/ may touch the database"; remove it   → Boundary rules
- [x] Add `import { getDb } from '@/db/client';` to a `.tsx` file in `src/components/islands/` then `pnpm lint` → error "Islands reach the server only through astro:actions"; remove it   → Boundary rules
- [x] Add `console.log('x')` to a `.ts` file then `pnpm lint` → warning; add an unawaited promise in `.astro` frontmatter → error `no-floating-promises`; remove both   → ESLint settings
- [x] Add `<img src="/x.png" />` to a page then `pnpm lint` → alt text error; remove it   → Accessibility rules
- [x] `grep noUncheckedIndexedAccess app/tsconfig.json` and `grep '@/\*' app/tsconfig.json` → both present   → TypeScript settings
## Coverage
- Tooling table · Commands table · Prettier settings · ESLint settings · TypeScript settings · Boundary rules · Rollout cleanup · Agent context files are covered by `/audit`, not this build
