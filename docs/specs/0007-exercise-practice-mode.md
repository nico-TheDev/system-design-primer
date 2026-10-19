# 0007. Exercise practice mode: timed, step by step sessions saved in SQLite

**Date**: 2026-10-19
**Status**: Proposed

## Summary

Each of the 14 exercises gets a practice page where you see only the problem, move through four step prompts with a stopwatch running, then reveal the solution to compare and finish. A session is saved in SQLite (the app's single file database), so a reload or a restart puts you back on the same step with the right time. Finished sessions are kept as attempts, and an exercise counts as practiced once it has one. "Practiced" is its own record, separate from the "done" mark in spec 0006. The build adds one table, six small Actions and the app's first React island (an interactive part of a page).

## Context

> ⚠️ Premise note: this feature builds on pages from specs [0005](0005-guided-study-path/index.md) and [0006](0006-progress-tracking.md), both still `In Progress` (their pages and the `progress` table exist in `app/`, their build is not closed). Practice mode assumes the exercise reader, `/exercises/` list, sidebar, `loadStudyPath` and the home summary from them. Finish or stabilise those first; this spec changes none of their rules.

Workspace: single repo, app in `app/`. Spec [0001](0001-stack-and-architecture/index.md) fixes Astro server pages, Astro Actions for every write, SQLite with Drizzle, localhost only, no auth. Spec [0004](0004-design-system-ui-foundation/index.md) keeps reading pages free of client code, allows React islands where state is needed, and names practice mode as a likely first user. Spec [0003](0003-content-pipeline/index.md) already splits every exercise into `problem` and `solution`. For system design exercises `problem` includes Step 1 (use cases, constraints, usage math); there is no field that carries the step prompts.

A practice session needs three things the app has none of: a live clock, state that must survive a reload (an accidental refresh must not lose 40 minutes), and a promise that the solution is not on the page before you ask for it. Exercise ids come from folder names, so a saved session can point at an exercise that later disappears, and the database cannot enforce that link.

## Requirements

**User stories**:
- As a learner, I want to start an exercise with only the problem visible so that I practice the way an interview works.
- As a learner, I want step prompts and a stopwatch so that I keep to the four step framework and a 45 minute pace.
- As a learner, I want to reveal the solution when I am ready and then finish so that I can compare my work and record the attempt.
- As a learner, I want a session to survive a reload, a closed tab or a restart so that a slip does not cost me my progress.
- As a learner, I want to see which exercises I have practiced, and how many times, so that I know what to repeat.

**Acceptance criteria**:
- **AC-1**: The exercise reader shows a "Practice" link directly under the title, and every row of `/exercises/` has a "Practice" link. Both read "Resume practice" while that exercise has an open session. The links go to `/exercises/<id>/practice/`.
- **AC-2**: `/exercises/<id>/practice/` with no open session shows the exercise title as the only `h1`, a short line naming the four steps for that exercise kind, the list of past attempts (AC-10) and a "Start practice" button that works with JavaScript turned off. An unknown id returns the 404 page that links home (as 0005 AC-8). If the exercise did not split (`split` is false), the page shows "This exercise could not be split into problem and solution, so the answer cannot be hidden." with a link to the reader and no Start button.
- **AC-3**: "Start practice" creates one open session at step 1 with the stopwatch running, then redirects back to the same page. An exercise has at most one open session: starting while one is open changes nothing and shows the open session. Different exercises can each have an open session.
- **AC-4**: With an open session the page shows, in this order: the title; a timer bar that stays at the top while scrolling, with the elapsed time, a Pause or Resume button and the target "Target 45:00"; the step panel (AC-5); the problem; a "Reveal solution" button; a "Discard session" button. The solution HTML is not in the page source before it is revealed.
- **AC-5**: There are four steps. System design exercises use: 1 Outline use cases, constraints and assumptions; 2 Create a high level design; 3 Design core components; 4 Scale the design. Object oriented exercises use: 1 Clarify the requirements; 2 Sketch the classes and their relationships; 3 Define the key methods; 4 Test edge cases and extend. The panel shows "Step N of 4", the step title, a one sentence prompt, and Back and Next buttons. Back is disabled on step 1 and Next on step 4. Each press saves the step; after a reload the same step shows.
- **AC-6**: The elapsed time ticks every second while running, is frozen while paused, and shows as `m:ss`, or `h:mm:ss` from one hour. Pause and Resume keep the time exact across a reload. A running session keeps counting while the page is closed, but a single running stretch counts at most 3 hours: past that the session shows as paused at the capped time with the text "Paused after 3 hours", and Resume starts a new stretch. From 45:00 on, the text "Over target" shows next to the time.
- **AC-7**: "Reveal solution" saves the reveal and reloads the page, which then shows the solution sections under the problem in the same layout as the reader (a "Solution" label, one `h2` per section with its anchor). The stopwatch keeps running. The "Finish practice" button appears only after the reveal; the Reveal button is gone after it. A reload keeps the solution showing.
- **AC-8**: "Finish practice" saves the session as finished with its final elapsed time and the finish time, then reloads the page. The page then has no open session, the new attempt is first in the list (AC-10), and "Start practice" is offered again. The Finish action refuses a session that was not revealed.
- **AC-9**: "Discard session" first changes into "Discard this session? Your time is lost." with "Yes, discard" and "Cancel" buttons. Confirming deletes the open session and reloads the page. Discarding when there is no open session is a quiet success.
- **AC-10**: The attempts list on the practice page shows finished sessions newest first, each as a date (formatted like 0006's "19 Oct 2026") and a duration (`m:ss` or `h:mm:ss`), with the heading "Attempts" and a count line "Practiced N times". With no attempts the list shows "No attempts yet."
- **AC-11**: An exercise with at least one finished session is practiced. `/exercises/` rows show the text "Practiced" (and "Practiced N times" when N is above 1) with an icon. Sidebar and drawer rows show the icon plus visually hidden "Practiced". The home page summary gets a third line "N of M exercises practiced" with a progress bar, in the same pattern as 0006 AC-5, omitted when there are no exercises. Counts include only ids that exist in the current exercises collection. Practiced never depends on, and never changes, the "done" mark. Practiced is never shown by color alone.
- **AC-12**: Session state is read from SQLite on every page load, so it survives a closed browser and a restart of the dev server. Every button saves through an Action; a failed Action shows its message inline next to the controls and the page state is unchanged. If an Action says the session no longer exists (for example it was finished in a second tab), the page reloads to show the saved truth.
- **AC-13**: The practice page uses only existing tokens and components (no hex color, no new font, no shadow), reads correctly in light and dark, and works at 360px and at desktop width. Every control works by keyboard with a visible focus. The ticking time is not announced every second; pause, resume, over target and the 3 hour pause are announced once through a polite live region. Contrast meets WCAG AA.
- **AC-14**: `pnpm check` and `pnpm build` pass.

## Decision

**Chosen option**: Option 1: A separate practice page per exercise, one React island for the clock and steps, sessions saved in SQLite.

`/exercises/<id>/practice/` is a server rendered Astro page. One island (`PracticeSession.tsx`) holds the timer bar, step panel and buttons, and the Astro page renders the problem and, only when revealed, the solution. State lives in one `practice_session` table written through Astro Actions; "practiced" is derived from finished rows.

**Implementation skills**: none (the Astro, React, Tailwind and Drizzle skills were declined in `AGENTS.md`).

## Feature design

**Data model**: one new table, one migration (generated by `pnpm db:generate`).

`practice_session`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | integer | no | primary key, autoincrement |
| `exercise_id` | text | no | exercise folder id; no foreign key (content is not in the database) |
| `status` | text enum `'active'`, `'finished'` | no | |
| `step` | integer | no | 1 to 4, check constraint |
| `revealed` | integer boolean | no | default false |
| `elapsed_ms` | integer | no | default 0; time from earlier stretches |
| `running_since` | integer (epoch ms) | yes | null while paused |
| `started_at` | integer (epoch ms) | no | |
| `finished_at` | integer (epoch ms) | yes | set on finish |
| `duration_ms` | integer | yes | final elapsed, set on finish |

Constraints: a unique index on `exercise_id` where `status = 'active'` (one open session per exercise); a plain index on `exercise_id`. Drizzle: `uniqueIndex(...).on(t.exerciseId).where(sql\`${t.status} = 'active'\`)`. Timestamps are plain epoch milliseconds so the clock maths needs no date conversion. Finished rows are never deleted by the app.

**State transitions** (one session):
`active running` ⇄ `active paused` (Pause, Resume); `active` step 1 to 4 and back (Back, Next); `active` unrevealed → `active` revealed (Reveal, one way); revealed `active` → `finished` (Finish); any `active` → deleted (Discard).

**Time rule** (pure function `elapsedAt(session, now)` in `src/lib/practice.ts`): `elapsed_ms + (running_since ? min(now − running_since, 3 hours) : 0)`. A running session whose stretch is 3 hours or more is shown as paused at that capped time. Every Action that changes the clock first folds the current elapsed into `elapsed_ms` using the same function, so the cap applies the same on read and on write. Rendering a page never writes.

**API surface** (Astro Actions in `src/actions/index.ts`; localhost, no auth; every request names the wanted end state, never a toggle, so repeats and two tabs end the same way, as in 0006):

| Action | Accept | Inputs | Output | Key errors |
|---|---|---|---|---|
| `startPractice` | form | `exerciseId` string 1 to 200 (req) | `{ exerciseId }` | `NOT_FOUND` unknown id, `BAD_REQUEST` exercise not split, generic `INTERNAL_SERVER_ERROR` |
| `setPracticeStep` | json | `exerciseId`, `step` int 1 to 4 (req) | `{ step }` | `NOT_FOUND` no open session or unknown id, `BAD_REQUEST` Zod |
| `setPracticeRunning` | json | `exerciseId`, `running` boolean (req) | `{ elapsedMs, running }` | `NOT_FOUND` no open session |
| `revealSolution` | json | `exerciseId` (req) | `{ revealed: true }` | `NOT_FOUND` no open session |
| `finishPractice` | json | `exerciseId` (req) | `{ durationMs }` | `NOT_FOUND` no open session, `BAD_REQUEST` not revealed yet |
| `discardPractice` | json | `exerciseId` (req) | `{ discarded: true }` | none for a missing session (quiet success) |

Expected failures throw `ActionError` with a safe message; unexpected ones are logged once (`console.error('[practice] ...')`) and rethrown as a generic `INTERNAL_SERVER_ERROR` (spec 0002). `startPractice` is a form post so the page works with JavaScript off; it redirects with 303 as `DoneButton` does. The island calls the other five through `astro:actions` and never imports `@/db`.

**Value sourcing**:

| Action or view | Value produced or displayed | Source |
|---|---|---|
| Practice page | whether the exercise can be practiced | `split` of the `exercises` entry (spec 0003) |
| Practice page | open session | row with `status = 'active'` for the route `id` (`getActive`) |
| Timer bar | elapsed time | `elapsedAt(session, now)` from columns `elapsed_ms`, `running_since`; `now` is `Date.now()` in the island (the app runs on your machine, so server and browser share one clock) |
| Timer bar | "Over target" | elapsed greater than or equal to constant `PRACTICE_TARGET_MS` (45 minutes) in `src/lib/practice.ts` |
| Timer bar | "Paused after 3 hours" | running stretch (`now − running_since`) greater than or equal to constant `PRACTICE_STRETCH_CAP_MS` (3 hours) |
| Step panel | step title and prompt | constants `PRACTICE_STEPS[kind][step − 1]` in `src/lib/practice.ts`; `kind` is the exercise's `kind` (spec 0003) |
| Step panel | current step | column `step` |
| Problem | problem HTML | `exercise.problem` |
| Solution | solution sections, only when revealed | `exercise.solution` rendered by the page when column `revealed` is true; never sent otherwise |
| `finishPractice` | `duration_ms` | `elapsedAt(session, Date.now())` at the moment of the call (server time) |
| Attempts list | date, duration | `finished_at` and `duration_ms` of finished rows for the route `id`, date text from `formatDoneDate` (spec 0006) |
| Attempts list | "Practiced N times" | count of finished rows for the route `id` |
| Practiced marks | practiced yes or no, N | `listFinished()` grouped by `exercise_id`, matched to the row's exercise `id` |
| Home summary | N of M exercises practiced | M = length of the path's exercises; N = distinct finished `exercise_id` values that are in that list |
| Entry links | "Practice" or "Resume practice" | whether `getActive(id)` finds a row |

**Key invariants**:
- At most one `active` row per `exercise_id` (unique partial index).
- `step` is always 1 to 4. `revealed` never goes from true to false.
- `status = 'finished'` implies `revealed`, `finished_at` and `duration_ms` are set; `running_since` is null.
- The solution is rendered into the HTML only when `revealed` is true.
- `elapsedAt` never adds more than 3 hours for one running stretch.
- Practiced never reads or writes the `progress` table, and the done mark never reads `practice_session`.

**Security model**: single user, localhost only, no auth (spec 0001). Inputs are validated by Zod; ids are checked against the `exercises` collection (`getEntry`). Hiding the solution is a study aid, not an access control. No compliance scope; no personal data beyond your own practice times.

**Configuration required**: none. Constants (45 minute target, 3 hour cap) live in `src/lib/practice.ts`.

**Component and file plan**:
- `src/db/schema.ts`: add `practiceSession`. `src/db/practice.ts`: `getActive`, `listFinished`, `listFinishedFor`, `startSession`, `setStep`, `setRunning`, `markRevealed`, `finishSession`, `discardSession` (the only new code touching Drizzle).
- `src/lib/practice.ts` (pure): constants, `PRACTICE_STEPS`, `elapsedAt`, `isStretchCapped`, `formatClock`, `toPracticedIndex(rows)`, `summarizePracticed(path, rows)`.
- `src/pages/exercises/[id]/practice.astro`: the page. Because `[id].astro` exists today, move it to `[id]/index.astro` so both routes sit under one folder (same URL).
- `src/components/islands/PracticeSession.tsx`: the island (first file in `islands/`). It takes the problem as its child content, so the order in AC-4 holds. Hydrate with `client:load`, with the required one line comment: the clock must run from page load and the bar sits at the top.
- Edit `PathRow.astro`, `ContentsNav.astro`, `ProgressSummary.astro` and the exercise reader and list pages for AC-1 and AC-11, passing the practiced index the way 0006 passes the done index.

**Critical test scenarios**:
- Happy path: start, go to step 3, pause, reload, resume, reveal, finish; the attempt shows with a duration and the row shows Practiced, verifies **AC-3**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-10**, **AC-11**
- Solution hidden: view source of the practice page before Reveal; no solution text or anchors in it, verifies **AC-4**, **AC-7**
- Persistence: stop and restart `pnpm dev` mid session; same step, same time, verifies **AC-12**
- Stale clock: set `running_since` to 5 hours ago in the database, load; shows paused with "Paused after 3 hours" and 3 hours added at most, verifies **AC-6**
- Two tabs: finish in tab A, press Next in tab B; B shows the error and reloads to the saved state, verifies **AC-12**
- Finish before reveal: call the Action directly; `BAD_REQUEST`, verifies **AC-8**
- Unsplit exercise: temporarily rename `## Step 2` in one exercise; practice page shows the notice with no Start button, verifies **AC-2**
- Renamed exercise: a session for a removed id is ignored in counts and links, verifies **AC-11**
- Keyboard and small screen: all controls reachable, live region announces pause, verifies **AC-13**

## Build plan

Skateboard order: a session you can actually use first (start, steps, reveal, finish), then the marks that show it on the lists, then the edge pass. One migration, because the model is a single table.

1. Add `practiceSession` to the schema, generate the migration with `pnpm db:generate`, write `src/db/practice.ts` and the pure `src/lib/practice.ts` (constants, steps, `elapsedAt`, `formatClock`), satisfies **AC-3**, **AC-6**, **AC-12**
2. Add the six Actions with Zod input and `ActionError` handling, satisfies **AC-3**, **AC-7**, **AC-8**, **AC-9**, **AC-12**
3. Move `[id].astro` to `[id]/index.astro`, build `[id]/practice.astro` with the Start form, the 404, the unsplit notice and the open session shell (problem and static step prompt), and add the Practice or Resume links on the reader and `/exercises/`, satisfies **AC-1**, **AC-2**, **AC-3**
4. Build `PracticeSession.tsx`: timer bar with pause and resume, step panel with Back and Next, Reveal, Finish, inline Discard confirm, inline error line and live region; render the solution only when revealed, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**
5. Attempts list on the practice page, "Practiced" text on `/exercises/` rows, icon and hidden text in the sidebar and drawer, third line on the home summary, satisfies **AC-10**, **AC-11**
6. Edge pass: stale clock cap, two tab check, renamed or removed exercise id, small screen and keyboard check, `pnpm check` and `pnpm build`, satisfies **AC-6**, **AC-12**, **AC-13**, **AC-14**

## Consequences

**Positive**:
- Practice is a distinct page, so the solution cannot leak into the reader, and the reader stays script free.
- Sessions survive reloads and restarts, and the saved attempts give a history for later features (spaced repetition, a daily plan).
- No new dependency: React, Actions and Drizzle are already in the stack.
- Practiced and done stay independent, so reading an exercise does not count as practicing it.

**Negative / tradeoffs**:
- This is the first React island and the first `client:load`, so the project's island pattern is set here and needs a note in `app/AGENTS.md` later.
- Every step and pause press is a database write; a few per session at most, fine for SQLite on one machine.
- Reveal and Finish reload the page instead of updating in place. It is simpler and keeps the solution out of the page before the reveal, at the cost of a short flash.
- The 3 hour cap hides a genuinely long session; you can discard and redo, and the cap is one constant.
- Prompt wording is fixed in code; changing it is a code edit, not content.
- The home page has no exercise rows (only a link to `/exercises/`), so the entry links are on the reader and `/exercises/` only.

**Neutral**:
- One migration adds `practice_session`; the 0006 `progress` table is unchanged.
- Moving `[id].astro` into `[id]/index.astro` keeps every URL the same.
- Spec 0004's deferred Radix Tabs and Tooltip stay deferred; the stepper needs neither.

## Follow-up

- [ ] Specs 0005 and 0006 are still `In Progress`. Close their builds before or alongside this one, since the rows and summary it extends come from them.
- [ ] Review the eight step titles and prompts (AC-5) once built; they are the part you may want to reword.
- [ ] After the build, `/sync` should record the island pattern (`src/components/islands/`, `client:load` comment) and the practice files in `app/AGENTS.md`, and add this spec to its related specs.
- [ ] Not in scope here, for later: notes per step, a countdown or per step time budgets, a random exercise picker, a `/practice/` hub.

## Rationale

Reasoning and options are in the sections below (single file spec, kept inline).

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
