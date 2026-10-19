# Rationale: 0002. Coding standards and tooling for the study app

Decision record for spec 0002. The build spec is in [index.md](index.md).

## Context

Spec 0001 scaffolded `app/` and deliberately left tests, lint and format open for this feature. The app has only a handful of files today, so choices made now cost almost nothing to apply, and each later feature (content pipeline, progress, flashcards) will copy whatever patterns exist.

Forces that shaped the choices:
- One developer, one local machine, Alpha workflow tier (`/check verify` after `/develop`, no automated test run yet).
- A mix of file types: `.ts`, `.tsx` islands and `.astro` pages. A tool that cannot read `.astro` templates leaves the pages unchecked.
- Spec 0001 invariants (only `src/db/` touches the database, islands never import server code, every write is an Astro Action) are easy to break by accident and currently rely on memory.
- `app/` sits inside a fork of an upstream repo, and 0001 says upstream merges must never conflict, so no root level config files or hooks.
- There is no root `AGENTS.md`, so the agent has no written conventions to follow.

## Options considered

### Option 1: ESLint, Prettier and astro check behind one `pnpm check` script

Three standard tools, each doing one job, run by hand through a single script.

**Pros**:
- Full `.astro` template support for linting and formatting.
- Type aware rules catch real server bugs such as unawaited promises in Actions and DB calls.
- Can enforce the 0001 import invariants with a built in rule.

**Cons**:
- More dev dependencies and three config files.
- Slower than Rust based tools, though irrelevant at this size.
- Nothing stops you from committing without running it.

### Option 2: Biome for lint and format, plus astro check

One fast tool with one config.

**Pros**:
- Fewer packages, very fast, one config file.

**Cons**:
- As of my knowledge its `.astro` support covers only the script block, not the template, so pages are partly unchecked. Verify current status before relying on this.
- Smaller rule set: no accessibility rules for `.astro` and no type aware rules.

### Option 3: Option 1 plus a git pre commit hook and GitHub Actions CI

Same tools, run automatically.

**Pros**:
- Checks cannot be forgotten.

**Cons**:
- Hook setup and `.github/` workflows live at the repo root, which risks upstream merge conflicts and breaks the 0001 rule.
- CI has little value for one local user.

### Option 4: Document the conventions only

Write the rules in `AGENTS.md` and rely on review.

**Pros**:
- Zero tooling.

**Cons**:
- Style and bug classes drift silently, and the only reviewer is the person who wrote the code.

## Rationale

Spec 0001's biggest risk is the invariants and the `.astro` heavy codebase. ESLint is the only option that lints `.astro` templates and can turn the 0001 import boundaries into errors instead of memory. Prettier formats `.astro` properly and sorts Tailwind classes, which keeps the many utility class strings in feature 4 readable. `astro check` is the official way to type check `.astro` files; plain `tsc` skips them.

Biome was the runner up: faster and simpler, but the template gap is exactly where most of the app lives. Hooks and CI were rejected because both need root level files, which 0001 forbids, and one person running `pnpm check` gets nearly the same safety. The tradeoff accepted is that enforcement depends on you running the command; `/check verify` and `/develop` should run it as part of finishing a feature.

