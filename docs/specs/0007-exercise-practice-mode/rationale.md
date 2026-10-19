# 0007 rationale. Exercise practice mode: timed, step by step sessions saved in SQLite

**Date**: 2026-10-19
**Status**: In Progress


Decision record for [spec 0007](index.md): the context, the options and the reasoning.

## Context

> ⚠️ Premise note: this feature builds on pages from specs [0005](../0005-guided-study-path/index.md) and [0006](../0006-progress-tracking.md), both still `In Progress` (their pages and the `progress` table exist in `app/`, their build is not closed). Practice mode assumes the exercise reader, `/exercises/` list, sidebar, `loadStudyPath` and the home summary from them. Finish or stabilise those first; this spec changes none of their rules.

Workspace: single repo, app in `app/`. Spec [0001](../0001-stack-and-architecture/index.md) fixes Astro server pages, Astro Actions for every write, SQLite with Drizzle, localhost only, no auth. Spec [0004](../0004-design-system-ui-foundation/index.md) keeps reading pages free of client code, allows React islands where state is needed, and names practice mode as a likely first user. Spec [0003](../0003-content-pipeline/index.md) already splits every exercise into `problem` and `solution`. For system design exercises `problem` includes Step 1 (use cases, constraints, usage math); there is no field that carries the step prompts.

A practice session needs three things the app has none of: a live clock, state that must survive a reload (an accidental refresh must not lose 40 minutes), and a promise that the solution is not on the page before you ask for it. Exercise ids come from folder names, so a saved session can point at an exercise that later disappears, and the database cannot enforce that link.



### Options considered

**Option 1: Separate practice page, one island, sessions in SQLite.** A server page per exercise, a React island for the clock and steps, a table for sessions and attempts.
- Pros: the reader stays untouched and script free; the solution is absent from the HTML until revealed; state survives reloads and restarts; attempts become data.
- Cons: first island and `client:load`; one table and six Actions to write and test.

**Option 2: A practice mode toggle on the existing exercise page.** One URL, a query flag or cookie hides the solution.
- Pros: no new route; fewer files.
- Cons: the reader must hide the solution conditionally, so a flag mistake shows the answer; the page that is meant to be script free would need the clock; a refresh or a shared link can change the mode.

**Option 3: Browser only state (localStorage) with a client rendered page.** No database change.
- Pros: no migration or Actions; fastest to build.
- Cons: the server cannot tell whether the solution was revealed, so it must ship the solution in the page or fetch it later; state is lost when browser data is cleared; "practiced" cannot appear in server rendered lists or the home summary without more client code.

### Rationale

Option 1 fits the forces in Context. The solution must be absent until requested, which only a server decision can guarantee (Option 3 cannot, Option 2 risks it). The session must survive a reload and a restart, and lists and the home summary are server rendered from SQLite, so saved state belongs in the same place as 0006's marks. The clock needs client code, and spec 0004 already allows an island where state is needed, so the cost is one island on one page, with the reading pages still script free.

Practiced is its own record because reading an exercise and practicing it are different acts, and because attempts with a duration are the useful data for a later review feature. Reusing the 0006 done mark would lose both and force you to un mark to retake a practice. The time model of saved elapsed plus a start stamp is the standard way to keep a pausable clock correct across reloads without writing every second; the 3 hour cap and "Finish only after Reveal" keep the history honest with two small rules. Boring tools only: no new library.

Decisions the build must not reopen (all settled with you): scope of all 14 exercises with adapted prompts; stopwatch with a soft 45 minute target; saved sessions; one open session per exercise; fixed prompts in code; Finish only after Reveal; unsplit exercises cannot start; practiced shown on list rows, sidebar and a third home summary line.
