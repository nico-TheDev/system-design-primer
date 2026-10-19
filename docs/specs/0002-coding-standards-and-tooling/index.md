# 0002. Coding standards and tooling for the study app

**Date**: 2026-10-19
**Status**: Accepted

## Summary

This sets the one way code is written and checked inside `app/`. ESLint checks for bugs, Prettier owns formatting, and `astro check` finds type errors, all run together by a single `pnpm check` command. A few naming and structure rules (an `@/` import shortcut, PascalCase components, plain `.astro` first and React only when needed) keep every later feature consistent. Nothing runs automatically on commit, so you run `pnpm check` yourself before committing.

## Decision

**Chosen option**: Option 1: ESLint, Prettier and astro check behind one `pnpm check` script

Format with Prettier, lint with ESLint (typescript-eslint type aware rules plus accessibility and React hooks rules), type check with `astro check`, enforce the 0001 import boundaries with lint rules, and run all three through `pnpm check` with no hooks or CI.

## Standard definition

### Tooling

| Concern | Choice | Notes |
|---|---|---|
| Formatter | Prettier plus `prettier-plugin-astro` and `prettier-plugin-tailwindcss` | Tailwind plugin must be last in `plugins`, and needs `tailwindStylesheet: './src/styles/global.css'` for Tailwind 4. |
| Linter | ESLint (flat config, `eslint.config.mjs`) with `typescript-eslint`, `eslint-plugin-astro`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react-hooks`, `eslint-config-prettier` | `eslint-config-prettier` switches off style rules so ESLint and Prettier never fight. Prettier is not run through ESLint. |
| Type check | `astro check` (`@astrojs/check` and `typescript` as dev dependencies) | Covers `.ts`, `.tsx` and `.astro`. |
| Test runner | Vitest, **recorded now, installed with the first test** | See Test setup below. |
| Scope of all tools | `app/` only | Never the repo's upstream files or `docs/`. Markdown is not formatted. |

Install versions at setup time (verify current; this space moves fast). Allow native builds through the existing `allowBuilds` in `pnpm-workspace.yaml` only for packages that need them.

### Commands (in `app/package.json`)

| Script | Runs |
|---|---|
| `pnpm format` | `prettier --write .` |
| `pnpm format:check` | `prettier --check .` |
| `pnpm lint` | `eslint .` |
| `pnpm lint:fix` | `eslint . --fix` |
| `pnpm typecheck` | `astro check` |
| `pnpm check` | `format:check`, then `lint`, then `typecheck`; stops at the first failure |

### Prettier settings (`app/prettier.config.mjs`)

Matches the style the scaffold already uses, so existing files change little: `singleQuote: true`, `semi: true`, `trailingComma: 'all'`, `printWidth: 100`, `tabWidth: 2`, plus an override giving `*.astro` the `astro` parser. `.prettierignore`: `dist/`, `.astro/`, `drizzle/` (generated migrations), `data/`, `pnpm-lock.yaml`, `public/`.

### ESLint settings (`app/eslint.config.mjs`)

- Global ignores: `dist/`, `.astro/`, `node_modules/`, `drizzle/`, `data/`, `public/`.
- Base: `@eslint/js` recommended plus `typescript-eslint` `recommendedTypeChecked`, with `parserOptions.projectService: true` and `extraFileExtensions: ['.astro']`.
- `.astro` files: `eslint-plugin-astro` recommended plus its `jsx-a11y` flat config.
- `.tsx` files: `eslint-plugin-jsx-a11y` recommended and `eslint-plugin-react-hooks` recommended.
- Extra rules: `@typescript-eslint/consistent-type-imports` (error), `no-console` set to `warn` with `allow: ['error', 'warn']`.
- Boundary rules via `no-restricted-imports`:
  - Everywhere except `src/db/`: ban `better-sqlite3` and `drizzle-orm` (and `drizzle-orm/*`). Queries live in `src/db/`, callers import functions from there.
  - Inside `src/components/islands/`: also ban `@/db`, `@/db/*` and relative paths into `db/`. Islands reach the server only through `astro:actions`.
- Config files (`*.config.*`) are exempt from the type aware rules.
- Fallback to try during setup: if type aware rules misbehave in `.astro` frontmatter, apply `recommendedTypeChecked` to `.ts` and `.tsx` only and plain `recommended` to `.astro`. Record which one shipped in `app/AGENTS.md`.

### TypeScript settings (`app/tsconfig.json`)

Keep `extends: astro/tsconfigs/strict` and add:
- `compilerOptions.noUncheckedIndexedAccess: true` (array and object lookups are typed as possibly missing, which suits markdown and deck parsing).
- `compilerOptions.paths: { "@/*": ["./src/*"] }` for the import alias.

### Code conventions

**Imports.** Use `@/` for anything outside the current folder (`@/db/progress`, `@/components/TopicCard.astro`). Relative imports only inside the same folder (`./schema`). Use `import type` for type only imports. No import sorting rule; keep the order node built ins, packages, `@/`, relative.

**Names.**
- Components (`.astro` and `.tsx`): PascalCase (`StudyCard.astro`, `FlashcardReview.tsx`).
- Every other file and folder: kebab-case (`content-loader.ts`, `repo-images/`).
- Astro route files follow Astro's rules (`[slug].astro`, `index.astro`).
- Variables and functions camelCase, types and components PascalCase, true constants SCREAMING_SNAKE_CASE only for fixed config values.
- Database columns snake_case in SQL, camelCase in TypeScript, mapped in the Drizzle schema.

**Exports.** Named exports for all modules. Default export only where a framework requires it (`.astro` components, Astro pages, tool config files).

**Astro versus React.**
- Default to `.astro`. Use React only when the component needs state, effects or event handlers.
- React islands live in `src/components/islands/` as `.tsx`.
- Hydrate with `client:visible` by default. Use `client:load` only when it must work on first paint, and `client:only="react"` only when it cannot render on the server. Every `client:load` or `client:only` needs a one line comment saying why.
- Islands never import server modules (enforced by the lint boundary above) and write only by calling an Action.

**Comments.** Comment the why, not the what. Short, plain. One line above the thing it explains. Remove comments when the reason goes away.

**Errors and logging.**

Canonical pattern for an Action (illustrative names):

```ts
import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro:schema';
import { markTopicDone } from '@/db/progress';

export const server = {
  markDone: defineAction({
    input: z.object({ topicId: z.string().min(1) }),
    handler: ({ topicId }) => {
      try {
        return markTopicDone(topicId);
      } catch (error) {
        console.error('[actions] markDone failed', error);
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not save progress.' });
      }
    },
  }),
};
```

- Expected failures (not found, bad state) throw `ActionError` with the matching code and a message safe to show you.
- Unexpected errors are logged once with `console.error('[area] what failed', error)` and rethrown as `ActionError` with a generic message. Never swallow an error silently, and never log and rethrow the same error twice.
- Islands call `actions.name(...)`, check `error`, and show `error.message`.
- No logging library. Remove stray `console.log` (the lint rule warns on it).

**Commits.** Conventional Commits: `type(scope): summary`, for example `feat(app): add topic list`. Types `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`. Scope `app` for app code, `docs` for specs and scope. Not enforced by tooling.

### Test setup (applies when the first test is written)

Install `vitest`. Add `vitest.config.ts` using `getViteConfig` from `astro/config` so tests share the Astro and Vite setup. Name test files `*.test.ts` or `*.test.tsx`, placed next to the code they test. Add `pnpm test` (`vitest run`) and add it to `pnpm check`. No other lint or format change is needed, since tests are already covered by `eslint .` and `prettier --check .`.

### Agent context files

- Root `AGENTS.md`: what the repo is, that upstream content (`README.md`, `solutions/`, `resources/`) is read only and never edited by the app, where the app lives, and pointers to `app/AGENTS.md` and `docs/`. Plus a thin root `CLAUDE.md` pointer.
- `app/AGENTS.md`: the commands above, the stack from 0001, the conventions in this spec, and the 0001 invariants.
- Clarification of 0001: its rule "nothing is added at the repo root" means no edits to upstream files and no tool config there. New, uniquely named agent files (`AGENTS.md`, `CLAUDE.md`) at the root are allowed because upstream has neither.
- `/audit` writes these files; this spec is its input.

**Replaces**:
- Unwritten, per feature style choices.
- Nothing is removed from the code; there is no competing lint or format setup today.

**Enforcement**:
- Formatting: `prettier --check` (fails `pnpm check`).
- Bugs, accessibility, hooks rules, type only imports, `console` use and the 0001 import boundaries: ESLint rules in `app/eslint.config.mjs` (fails `pnpm check`).
- Type errors: `astro check` (fails `pnpm check`).
- File naming, comment style, the Astro versus React rule and commit messages: review convention only. No plugin is worth adding for a one person project.
- `/develop` and `/check verify` should run `pnpm check` before calling a feature done.

**Rollout**: New code immediately. One time cleanup as part of this feature: run `pnpm format` and `pnpm lint:fix` over the existing scaffold files and fix whatever remains by hand in the same commit (a handful of files, so no tracked debt).

**Exceptions**: Config files (`astro.config.mjs`, `drizzle.config.ts`, `eslint.config.mjs`, `prettier.config.mjs`) may use default exports and skip the type aware rules. Generated files (`drizzle/`, `.astro/`, `dist/`) are never edited or linted. Otherwise none. Any inline `eslint-disable` needs a reason in the same comment.

## Consequences

**Positive**:
- One command tells you whether the app is clean, including `.astro` templates.
- The 0001 invariants fail the build instead of depending on memory.
- A consistent look and naming from the first feature onward, and the agent follows written rules.

**Negative / tradeoffs**:
- Roughly ten extra dev dependencies and three config files to keep current.
- Type aware linting adds a few seconds per run and needs the `.astro` fallback if it misbehaves.
- No automation: forgetting `pnpm check` lets problems into a commit.
- `noUncheckedIndexedAccess` adds small guards around array lookups.

**Neutral**:
- Prettier will rewrite a few existing scaffold files once.
- Tests are not installed yet; Alpha tier runs none, so the first feature that adds a test also installs Vitest.
- Git hooks and CI stay available later but would need a decision about the root level files.

## Follow-up

- [ ] Run `/audit` to write root `AGENTS.md`, `CLAUDE.md` and `app/AGENTS.md` from this spec. Record on the `## Agent skills` `Declined:` line that skills for ESLint, Prettier, typescript-eslint and Vitest were offered on 2026-10-19 and declined, so they are not offered again.
- [ ] During setup, confirm type aware linting works inside `.astro` frontmatter; if not, use the fallback and note it in `app/AGENTS.md`.
- [ ] Check current versions and peer requirements (ESLint major, typescript-eslint, Prettier plugins, Node 26, pnpm 11) at install time.
- [ ] Spec 0001 says nothing is added at the repo root; `/sync` should note the clarification above next to that invariant.
- [ ] If forgetting `pnpm check` becomes a problem, revisit a pre commit hook and accept a root level exception deliberately.
- [ ] When the first test is written, follow the Test setup section and add `pnpm test` to `pnpm check`.
