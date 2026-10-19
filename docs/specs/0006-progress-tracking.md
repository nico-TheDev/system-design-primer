# 0006. Progress tracking: done marks for topics and exercises saved in SQLite

**Date**: 2026-10-19
**Status**: Accepted

## Summary

You can mark any topic or exercise as done with a button at the end of its page, and take the mark back with the same button. Done items show a check on every path row and sidebar row, and the home page shows two counts with a bar each (topics and exercises). Marks are saved in one small SQLite table (a single file database on your machine), so they are still there after you close and reopen the app. It adds one table, one write action and a few small components, and nothing needs JavaScript in the browser.

## Context

Premise note: this feature adds marks to pages and lists that spec [0005](0005-guided-study-path/index.md) builds (home path list, topic reader, exercise reader, labelled sidebar). 0005 is `In Progress` and its pages are not built yet. Build 0005 first; this spec assumes its `buildStudyPath` module, its `NavSection` sidebar and its pager exist. Spec [0001](0001-stack-and-architecture/index.md) already fixes the stack: Astro server pages, Astro Actions for every write, SQLite with Drizzle, localhost only and no auth. Spec [0002](0002-coding-standards-and-tooling/index.md) fixes how Actions fail.

The study content is not in the database. Topic and exercise ids come from README headings and folder names through the content pipeline (spec [0003](0003-content-pipeline/index.md)), so an id can change when a heading is renamed upstream. Saved marks therefore point at content that can disappear, and the database cannot enforce that link.

Today `app/src/db/schema.ts` holds only the `app_meta` scaffold table, whose comment says this feature replaces it, and `app/src/db/scaffold-check.ts` exists only to prove the driver works. The reading pages are script free by design (spec 0004), so the control must work without client code. Without this feature the app cannot show you how far along you are, which is the point of a guided path.

## Requirements

**User stories**:
- As a learner, I want to mark a topic done when I finish it so that I can see what I have already covered.
- As a learner, I want to take a done mark back so that a mis tap, or a topic I want to re read, does not leave a wrong record.
- As a learner, I want the path and the home page to show how far along I am so that I know what is left.
- As a learner, I want my progress kept after I close the app so that I can continue another day.

**Acceptance criteria**:
- **AC-1**: Every topic page and every exercise page has a form button at the end of the content, above the previous and next links. When the item is not done it reads "Mark topic done" or "Mark exercise done". When it is done it reads "Mark topic not done" or "Mark exercise not done", with the line "Done on 19 Oct 2026" (the saved date) beside it. Pressing the button saves the change and the same page shows the new state. The control works with JavaScript turned off.
- **AC-2**: Marking done saves one row for that item with the current time. Marking it again while it is already done changes nothing, and the first date stays. Marking not done removes the row. Marking not done for an item that has no row is a quiet success.
- **AC-3**: Done state is still there after the dev server or the app is stopped and started again, and after the browser is closed (it is read from SQLite on every page load, never from the browser).
- **AC-4**: Every path list row (home page, `/exercises/`) and every sidebar and drawer row of a done item shows a check icon plus the text "Done" that is visually hidden but read by screen readers. Not done rows show nothing. Done is never shown by color alone.
- **AC-5**: The home page, below the Start button and above the path list, shows two lines: "N of M topics done" and "N of M exercises done", each with a progress bar. Counts include only ids that exist in the current topics and exercises collections. A line is omitted when its collection is empty. With no topics, the empty message from 0005 AC-9 is unchanged and no summary shows.
- **AC-6**: A done mark whose id is no longer in the content stays in the database, is not counted, and is not shown anywhere. If the id comes back (for example a heading is renamed back), the mark counts again.
- **AC-7**: Submitting the action for an unknown kind or an id that is not in the collections does not write anything and returns an expected error ("That item is not in the study content any more.") that the page shows in a `role="alert"` message near the button. A save failure logs once and shows "Could not save your progress. Try again."
- **AC-8**: Two quick presses, or the same page open in two tabs, never create two rows and never fail: the action carries the wanted state ("done" or "not done") instead of toggling, so repeating it has the same result.
- **AC-9**: The migration creates the `progress` table and drops `app_meta`. `scaffold-check.ts` is deleted. A fresh database and an existing one both migrate cleanly on first open.
- **AC-10**: Everything uses existing tokens and components, reads correctly in light and dark at 360px and at desktop width, and the button, the rows and the bars work by keyboard. Text and check icon contrast meet WCAG AA.
- **AC-11**: `pnpm check` and `pnpm build` pass.

## Options considered

### Option 1: One `progress` table, plain form posting to one Astro Action

A single table with one row per done item (kind plus id as the key). A server rendered form sends the wanted state to an Action, and pages read the whole table once per request.

**Pros**:
- Fits spec 0001 exactly: writes through an Action, reads through `src/db`, no client code on reading pages.
- Idempotent by design (the request says what the end state should be), so repeats and two tabs are safe.
- One table that features 7 to 9 do not need to change.

**Cons**:
- Each press reloads the page, which is slower than an instant toggle.
- Reading the whole table on every page (sidebar needs it) is one small query per request, not free.

### Option 2: React island with an instant toggle

An interactive component calls the Action and flips its own state, with rollback if the save fails.

**Pros**:
- No page reload, and a nicer feel.

**Cons**:
- Adds a client component, loading and failure states, and keeps the sidebar and home counts stale until a reload.
- Breaks the script free reading pages decided in spec 0004, for one tap per topic.

### Option 3: Store progress in the browser (`localStorage`)

Marks live in the browser and the server knows nothing.

**Pros**:
- No schema, no Action.

**Cons**:
- Server rendered pages cannot show done marks in the sidebar or home page without client script.
- Tied to one browser profile, and lost on cleared site data. Spec 0001 chose SQLite so history survives a browser reset.

## Decision

**Chosen option**: Option 1: One `progress` table, plain form posting to one Astro Action

Add a `progress` table keyed by (kind, item id), one idempotent `setProgress` Action, a small `src/db/progress.ts` for the only queries, a pure `src/lib/progress.ts` for counts, and three small Astro components (done mark, done button, summary), with no new dependency.

**Implementation skills**: none installed (Agent Skills were declined in specs 0001 and 0002).

## Rationale

The forces are a store that already exists (SQLite with Actions, spec 0001), reading pages that must stay script free (spec 0004), and ids that can change under saved data. Option 1 adds the least that satisfies all three, and the explicit state in the request (`done=true|false`) removes the need for locking or toggle logic. Option 2 buys a nicer feel at the cost of a second source of truth in the browser; one tap per finished topic does not justify it. Option 3 fails the sidebar and home counts, which are server rendered.

Keeping the row when the content id disappears (rather than cleaning it up) was your choice, and it is cheap: the table has no foreign key to the content, and counts only look at ids that exist now. Storing `completed_at` costs one column and makes the quiet "Done on" line and later features (history, streaks) possible without losing the past. A row that means "done" and is deleted on undo keeps reads to a plain count and avoids a second state to filter. Runner up: a nullable `completed_at` on a kept row, which preserves a first completion date but forces every read to filter it.

## Feature design

**Data model sketch**:

Table `progress` (one row means done):

| Column | Type | Null | Notes |
|---|---|---|---|
| `kind` | text, `'topic'` or `'exercise'` | no | part of the primary key |
| `item_id` | text | no | content pipeline id (topic or exercise), part of the primary key |
| `completed_at` | integer, mode `timestamp` (seconds) | no | set by the server on first mark |

Primary key (`kind`, `item_id`). No foreign key (content is not in the database). Drizzle: `primaryKey({ columns: [t.kind, t.itemId] })`, `kind` typed with `text('kind', { enum: ['topic', 'exercise'] })`. Migration: generated by `pnpm db:generate`, creates `progress` and drops `app_meta`.

**State transitions**: per item, `not done` and `done`. `setProgress(done=true)` moves not done to done (row inserted with the current time); done stays done (no change, first date kept). `setProgress(done=false)` removes the row from either state.

**API surface** (one write, reads happen while rendering):

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `actions.setProgress` (form POST) | POST | `kind` enum `topic` or `exercise` (req), `id` string 1 to 200 chars (req), `done` string `"true"` or `"false"` (req) | `{ kind, id, done }` | none (localhost, spec 0001) | `NOT_FOUND` unknown id, `BAD_REQUEST` invalid input (Zod), generic `INTERNAL_SERVER_ERROR` on save failure |
| `listDone()` in `src/db/progress.ts` | read | none | `readonly { kind, itemId, completedAt }[]` | none | none expected; a failure is unexpected and propagates |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Button | wanted state sent with the form | the button's own `value`: `"true"` when the item is not done, `"false"` when done (decided at render from `listDone()`) |
| Button | `kind` and `id` | hidden inputs filled from the page's entry (`topic` or `exercise`, entry `id`) |
| `setProgress` | `completed_at` | the server's current time when the row is inserted; never from the client |
| `setProgress` | whether the id exists | lookup of `id` in the `topics` or `exercises` collection by `kind` (`getEntry`) |
| Button label | "topic" or "exercise" wording | `kind` |
| Page | done or not done, and the date | the row for (`kind`, `id`) in `listDone()` |
| Page | "19 Oct 2026" text | `completed_at` formatted with `Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })` in the server's local timezone (the app runs on your machine, so that is your timezone; decided here) |
| Rows (home, `/exercises/`, sidebar) | check shown or not | the `kind` and `id` of the row's entry against `listDone()` |
| Home summary | N and M for topics and exercises | M = length of the path's topics (or exercises) from `buildStudyPath`; N = number of `listDone()` rows of that kind whose `item_id` is in that list |
| Home summary | bar fill | `<progress value={N} max={M}>`, not drawn when M is 0 |
| After the press | where you land | the same page (Astro redirects form posts back to the current URL; confirm the exact mechanism during the build, see Follow up) |
| Error message | text | constants in the Action ("That item is not in the study content any more.", "Could not save your progress. Try again."); shown from `Astro.getActionResult(actions.setProgress)?.error` |

**Key invariants**:
- At most one row per (kind, id), enforced by the primary key; insert uses `onConflictDoNothing` so a repeat keeps the first date.
- A row only ever says "done"; there is no "not done" row.
- `completed_at` is set by the server, never taken from the request.
- Only `src/db/progress.ts` imports Drizzle for this table; pages and the Action call its functions. Components never import `@/db`.
- Counts include only ids present in the current collections, so an old mark cannot push N above M.
- Nothing here uses `localStorage` or client script.

**Module surface**:
- `src/db/progress.ts`: `listDone()`, `setDone(kind, id)` (insert with `onConflictDoNothing`), `unsetDone(kind, id)` (delete). Pure data access, no content knowledge.
- `src/lib/progress.ts` (pure): `toDoneIndex(rows)` builds a lookup by kind and id, `isDone(index, kind, id)`, `summarize(path, rows)` returns `{ topics: { done, total }, exercises: { done, total } }`, `formatDoneDate(date)`.
- `src/actions/index.ts`: `setProgress` with `accept: 'form'`, Zod input from `astro:schema`, the existence check, then `setDone` or `unsetDone`.
- `src/components/ui/DoneMark.astro` (check icon with visually hidden "Done"), `DoneButton.astro` (the form and the quiet date line), `ProgressSummary.astro` (two lines with `<progress>`).

**Security model**: single user, localhost only, no auth (spec 0001). `checkOrigin` stays on, which blocks cross site form posts. The Action only ever writes `progress`, trusts nothing but the `kind` and `id` after checking them against the collections, and takes the time on the server. Nothing sensitive is stored, so no compliance scope applies.

**Configuration required**: none (`STUDY_DB_PATH` already exists, spec 0001).

**Critical test scenarios**:
- Happy path: open a topic, press "Mark topic done", see "Mark topic not done" and "Done on <today>", see a check on the sidebar row and the home row, and the home count goes up by one, verifies **AC-1**, **AC-2**, **AC-4**, **AC-5**
- Persistence: mark one topic and one exercise, stop and restart `pnpm dev`, reload, and both are still done, verifies **AC-3**
- Undo and repeat: press "not done" and the row and check disappear; replay the same "done" request twice and there is one row with the first date, verifies **AC-2**, **AC-8**
- Two tabs: mark done in tab A, then press the old "Mark done" button in tab B, and it still ends done with no error, verifies **AC-8**
- Orphan: mark a topic, rename its README heading so the id changes, then confirm the count drops and nothing shows for the old id; rename back and the mark counts again, verifies **AC-6**
- Failure case: post `setProgress` with an unknown id or kind and see the alert text with no new row; simulate a write failure and see the generic message plus one log line, verifies **AC-7**
- Migration: delete the db file and start (fresh), and also start on a database that has `app_meta` from the scaffold, and both end with `progress` and no `app_meta`, verifies **AC-9**
- Accessibility: tab to the button and the rows at 360px in both themes, check shows a name to a screen reader, verifies **AC-4**, **AC-10**

## Build plan

Skateboard order: the thinnest thing you would actually use first (mark a topic, see it stay), then show it on the lists, then the summary and exercises, then the edge pass. Requires spec 0005's pages to exist first. One migration, because the model is a single table.

1. Change `src/db/schema.ts` to the `progress` table (drop `app_meta`), run `pnpm db:generate`, delete `src/db/scaffold-check.ts` (0005 build plan step 4 already removes its use on the home page), and write `src/db/progress.ts` with `listDone`, `setDone`, `unsetDone`; check a fresh and an existing database migrate, satisfies **AC-3**, **AC-9**
2. Write `src/lib/progress.ts` (`toDoneIndex`, `isDone`, `summarize`, `formatDoneDate`) as pure functions, satisfies **AC-4**, **AC-5**, **AC-6**
3. Add the `setProgress` Action with Zod input, the collection existence check, idempotent write or delete, `ActionError` for expected failures and one `console.error('[progress] ...')` then a generic error for unexpected ones, satisfies **AC-2**, **AC-7**, **AC-8**
4. Build `DoneButton.astro` and place it at the end of the topic page (above the pager); show the quiet date line and the action error; check the loop end to end on one topic, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-7**
5. Build `DoneMark.astro`, extend `NavItem` with `done?: boolean`, show the mark in `ContentsNav.astro` (sidebar and drawer) and in one shared path row component used by the home list and `/exercises/` (0005 Follow up asks for this single row), and load `listDone()` once per request where the nav and lists are built, satisfies **AC-4**, **AC-6**
6. Build `ProgressSummary.astro` with `<progress>` bars and place it on the home page, with the empty collection and zero total cases, satisfies **AC-5**
7. Place `DoneButton.astro` on the exercise page (end of content, above the pager, also for `split: false`), satisfies **AC-1**, **AC-2**
8. Edge and quality pass: two tab and repeat checks, orphan rename check, 360px and keyboard check in both themes, contrast on the check and bars, then `pnpm check` and `pnpm build`, satisfies **AC-8**, **AC-6**, **AC-10**, **AC-11**

## Consequences

**Positive**:
- The app answers "where am I?" at a glance: checks on every list and two counts on the home page.
- Progress survives restarts and browser resets, and sits in the same SQLite file as later review history (feature 8).
- The write is idempotent, so retries and double presses need no special handling.
- `completed_at` is there for later features (history, a continue button, streaks) without a migration.

**Negative / tradeoffs**:
- Each press reloads the page. That is fine for one tap per topic, and it keeps the reading pages script free.
- A renamed heading orphans its mark. The mark is kept but invisible, so you will not see the old record unless you open the database.
- Marks are not in git, so they are not backed up with the repo. In WAL mode (spec 0001) copy the database with SQLite's `.backup`, not the single `.db` file.
- `listDone()` runs on every page load because the sidebar needs it. It is one small query for a few dozen rows at most.
- The Shell nav type and `ContentsNav.astro` change shape again (after 0005), which touches the design system code.

**Neutral**:
- No reset all, no per section marks, no Continue button and no per group counts (left out by choice, available later).
- "Done" means "I decided it is done". Nothing tracks reading time or scroll depth.
- Dates use the machine's own timezone and the `en-GB` format.

## Follow-up

- [x] Before step 4, confirm how an Astro Action form POST returns to the same page in the installed Astro 7 (redirect back versus re rendering the POST response), and make sure a browser refresh does not offer to resubmit the form
- [x] Decide whether `<progress>` can be styled with the existing tokens at WCAG AA contrast in both themes, or whether the bar needs a small token addition (a design system change that goes through spec 0004)
- [ ] Add Vitest tests for `src/lib/progress.ts` and the Action when `/test` runs on this feature (spec 0002 Test setup), covering the repeat, undo and orphan cases
- [ ] Future ideas parked: a Continue button that opens the first topic not done, per group counts in the sidebar, and a way to see or clear orphaned marks
