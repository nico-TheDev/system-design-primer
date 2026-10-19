# 0005 rationale. Guided study path: ordered home page and topic and exercise readers

Decision history for [the spec](index.md): the context, the options considered, and why this one was chosen.

## Context

Premise note: this feature reads the `topics` and `exercises` collections (spec [0003](../0003-content-pipeline/index.md), In Progress) and uses the Shell layout and base components (spec [0004](../0004-design-system-ui-foundation/index.md), In Progress). Both already exist in `app/`, so the build can start now, but a change to either spec's data shape would reach this one. Spec [0001](../0001-stack-and-architecture/index.md) fixes the stack: Astro 7 with server output, React islands only where needed, Tailwind tokens, no auth, localhost only.

Today `app/src/pages/index.astro` is a scaffold page and the sidebar lists three placeholder links from `app/src/lib/site-nav.ts`. The pipeline gives each topic an `order`, a `kind` (`start-here`, `topic`, `interview-approach`, `study-guide`, `appendix`), stored `html`, and sub headings. Each exercise has an `order`, a `kind`, and either a problem plus solution sections or a single whole page when the split failed. Links inside the content already point at `/topics/<id>/`, `/exercises/` and `/exercises/<id>/`, so those routes must exist or every cross link is a dead end.

Two shape mismatches matter. Topic html starts below the heading, and its sub headings keep README levels (`h3` under a topic, `h4` under an appendix topic), so a page with its own title would skip a heading level. The Shell's "On this page" list only accepts depth 2 and 3 headings and calls the anchor `slug`, while the pipeline calls it `anchor`.

## Options considered

### Option 1: Server rendered pages computed from the collections by one pure helper

One module builds the whole path (sorted lists, numbers, groups, neighbours, nav sections, heading shifting) from the two collections. Pages call it per request and print the stored html.

**Pros**:
- No second source of truth: upstream edits and the pipeline's live reload flow straight through.
- One small pure module is easy to test and is reused by the progress feature (feature 6) and practice mode (feature 7).
- Matches the stack: output is already `server`, and `pnpm dev` is the daily path.

**Cons**:
- Work repeats on each request (sorting 24 and 14 entries, a regex pass over each page's html), which is cheap here but not free.
- No static output to host elsewhere.

### Option 2: Prerender every page with `getStaticPaths`

Mark the pages `prerender = true` and generate each topic and exercise at build time.

**Pros**:
- Fastest possible page loads and a deployable static folder.

**Cons**:
- In production a change to the markdown needs a rebuild, against the "changes show up without manual steps" goal.
- Adds `getStaticPaths` boilerplate and a second rendering mode to reason about, for an app that only runs locally.

### Option 3: A hand written path file (stages or timeline tracks)

A file in `app/` lists the stages or the short, medium and long tracks and the topic ids in each.

**Pros**:
- Can express a curated learning order that the README does not.

**Cons**:
- Drifts from upstream: a renamed or added topic silently breaks the path.
- You chose the README's own order, so there is nothing to curate yet.

## Rationale

The forces are a source of content that changes upstream, a user who wants zero manual steps, and a design system whose Shell already takes a nav list and a headings list. Option 1 adds the least: the pipeline stays the single source for order and content, and the new code is one pure function plus thin pages. Option 2 trades away live edits for speed nobody needs on localhost. Option 3 answers a question the engineer already settled ("one path in the pipeline order").

Heading levels are shifted instead of left alone because a page with an `h1` title followed by `h3` headings breaks outlines for screen readers and makes "On this page" depend on README depth. The shift is a small pure rewrite of heading tags only; ids are not touched, so the pipeline's anchor links keep working. Runner up: leave levels as written and map the Shell's depth filter instead, which is less code but leaves the broken outline.

The Study guide stays at its pipeline position with a link from the home page because moving it would add a second ordering rule. Numbers run 1 to N across all topics (the engineer's pick) so "topic 7 of 24" always holds.
