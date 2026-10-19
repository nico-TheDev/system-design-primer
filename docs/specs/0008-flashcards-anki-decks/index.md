# 0008. Flashcards: review the Anki decks with spaced repetition

**Date**: 2026-10-19
**Status**: In Progress

## Summary

The app reads the three Anki deck files in place and turns their 56 cards into a daily review screen. Each day it shows the cards that are due plus up to 10 new ones. You rate each card Again, Hard, Good or Easy, and a scheduler called FSRS (a method that predicts when you will forget a card) decides when it comes back. Your ratings are saved in two small SQLite tables, and the cards themselves are never copied. The build adds three small libraries, one content collection, two tables, two Actions and one React island (an interactive part of a page).

## Requirements

**User stories**:
- As a learner, I want to review the cards that are due each day inside the app so that recall practice happens where I already study.
- As a learner, I want to rate how well I remembered a card so that hard cards return sooner and easy cards later.
- As a learner, I want to undo a mis pressed rating so that one slip does not distort my schedule.
- As a learner, I want to see how many cards are waiting as soon as I open the app so that I know whether to review today.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: Every usable note in the three decks in `resources/flash_cards/` loads as one card with its front text and its back content intact: 42 System Design, 8 System Design Exercises, 6 OO Design, 56 in total, in deck order, no card dropped or duplicated. A note that cannot be used (not a two field Basic note, empty front or back, repeated guid) is skipped with a logged warning, never silently.
- **AC-2**: Card back HTML is cleaned when loaded. No script, event handler attribute, inline style, iframe or unsafe link scheme reaches a page. Headings, paragraphs, lists, tables, code blocks, links and images survive and read in the app's article styles in light and dark themes. Jupyter "anchor-link" pilcrow links are removed.
- **AC-3**: `/flashcards` lists the three decks, each with total cards, new cards available today, and cards due now, plus a "Review all" action and a review action per deck. With nothing due and no new cards it says so and shows when the next card is due.
- **AC-4**: A review session shows a card's front first. The back appears on "Show answer" (button, Space or Enter). Then four rating buttons appear (Again, Hard, Good, Easy, keys 1 to 4), each labelled with when the card would return (for example "Good 3d"). Rating is not possible before the back is shown.
- **AC-5**: A rating is saved at once, before the next card appears. After reload or a server restart the card keeps its schedule. For a new card, Easy returns it later than Good, and Good no earlier than Hard (for a relearning card Hard and Good can tie).
- **AC-6**: A session is ordered learning cards first, then due review cards by due time, then new cards last in deck order. New cards are capped at 10 per study day across all decks, counted from the review log. A study day runs from 4 AM to 4 AM local time.
- **AC-7**: A card rated Again comes back in the same session after a short step. When only learning cards remain and the next is due within 20 minutes, it is shown instead of ending the session. Otherwise the session ends on a "done for today" screen that shows the next due time.
- **AC-8**: "Undo last rating" (button and the Z key) restores the card's previous schedule and removes that rating from the log, and the card is shown again at the front of the session. Undoing a first rating returns the card to new and gives back its place in the daily new card cap. Only the newest rating can be undone, one step: after an undo the button is disabled until the next rating. If the undone card is no longer in the decks, the schedule is still restored and the session skips the card.
- **AC-9**: The sidebar has a Flashcards link with a badge for the cards waiting today (due now plus new available), and the home summary has a flashcards line: "N cards to review today", or at zero "Nothing due, next card <time>". Both update on the next page load after a review (not live), and the badge has an accessible text, not only a number.
- **AC-10**: Rating or undoing a card that is no longer in the loaded decks shows a clear message and the session skips it. Saved schedule rows for cards that vanished are kept and ignored, not deleted.
- **AC-11**: A whole session works by keyboard alone. Focus moves to the new card after each rating and to the answer after reveal, changes are announced to screen readers, text meets WCAG AA contrast in both themes, and the screen works at phone width.
- **AC-12**: In dev, editing or replacing a deck file shows up without restarting the server. A deck that cannot be read (missing, corrupt, newer Anki format) logs an error, keeps that deck's last good cards and does not break the other decks. Removing a deck file removes that deck. In a production build the decks are read at build time, so edits after `pnpm build` need a rebuild.
- **AC-13**: `pnpm check` and `pnpm build` pass.

## Decision

**Chosen option**: Option 1: Read the `.apkg` files in place as a content collection, schedule with FSRS, keep only schedule state in SQLite

Load the cards through an Astro loader into a third collection named `cards`, clean the HTML there, schedule reviews with `ts-fsrs`, and store only your ratings in `card_state` and `review_log`.

Libraries added: `ts-fsrs` (scheduler), `fflate` (unzip, pure JavaScript), `sanitize-html` (plus `@types/sanitize-html` as a dev dependency). Agent Skills for them were offered and declined. Versions are chosen at install time; check each is current then.

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

Cards are not stored in the database. They come from the `cards` collection (read from the decks, not edited by the app).

`cards` collection entry (schema in `src/content-pipeline/schemas.ts`):

| Field | Type | Notes |
|---|---|---|
| `id` | string | `${deck}:${guid}`, the entry key |
| `deck` | string | slug from the file name: lowercase, runs of characters that are not letters or digits become `-` (`system-design`, `system-design-exercises`, `oo-design`); two files with the same slug fail loudly |
| `deckTitle` | string | the deck's own name from the `.apkg` (`col.decks`, the entry that is not "Default"), else the file name |
| `guid` | string | Anki note guid, unique per note, the stable card identity; it can contain `:`, `/` and `#`, so the `id` is never parsed |
| `order` | number | position in the app: deck order, then note id ascending |
| `title` | string | front text: tags removed, entities decoded, `<br>` and runs of whitespace turned into single spaces, trimmed, never empty |
| `backHtml` | string | cleaned back HTML |

`card_state` (Drizzle `cardState`), one row per card rated at least once:

| Column | Type | Notes |
|---|---|---|
| `deck` | text, required | part of the primary key |
| `guid` | text, required | part of the primary key |
| `due` | integer epoch milliseconds, required | when the card is next due |
| `stability` | real, required | FSRS value |
| `difficulty` | real, required | FSRS value |
| `state` | integer, required | 1 learning, 2 review, 3 relearning (0 new never has a row) |
| `reps` | integer, required | |
| `lapses` | integer, required | |
| `learning_steps` | integer, required | position inside the short steps |
| `last_review` | integer epoch milliseconds, required | |

The columns follow the persisted fields of the pinned `ts-fsrs` `Card` type. Store every field that type carries and `next()` needs (for example `scheduled_days`; `elapsed_days` is deprecated in v5) as plain required columns. All times are plain integer epoch milliseconds (Drizzle `mode: 'number'`, not `mode: 'timestamp'`, which stores seconds), including inside `previous_state`. One pure mapper converts a row or snapshot to and from the `ts-fsrs` `Card`. Pin the `ts-fsrs` major version in `package.json`, and confirm at install that these calls exist: `fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: false }))`, `createEmptyCard(now)`, `repeat(card, now)` (a record keyed by rating) and `next(card, now, rating)` (returns `{ card, log }`).

`review_log` (Drizzle `reviewLog`), one row per rating:

| Column | Type | Notes |
|---|---|---|
| `id` | integer, primary key, auto | |
| `deck`, `guid` | text, required | points at a `card_state` row, no foreign key (the card lives in a file) |
| `rating` | integer, required | 1 Again, 2 Hard, 3 Good, 4 Easy |
| `reviewed_at` | integer epoch milliseconds, required | |
| `previous_state` | text (JSON), nullable | the `card_state` row before this rating, times as epoch milliseconds; null on a card's first rating |

Indexes: `card_state(due)` for due counts, `review_log(reviewed_at)` for the new cards today count.

Relationships: card 1 to 0..1 `card_state` (no row means new). `card_state` 1 to N `review_log`, matched by `deck` and `guid`.

**State transitions** (the schedule math belongs to `ts-fsrs`, with its default learning steps):
new (no row) → learning → review → relearning → review. Again on a review card moves it to relearning. Easy can graduate a new card straight to review. Undo moves a card back to exactly its `previous_state`, or to new when that is null.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/flashcards` | GET page | none | decks with total, new available, due now | none (localhost) | none |
| `/flashcards/review` | GET page | `deck` query, optional | session queue passed to the island | none | 404 for an unknown deck |
| `rateCard` | Action (JSON) | `deck`:string max 100 (req), `guid`:string 1 to 64 chars (req), `rating`:int 1 to 4 (req) | `logId`, `state`, `dueAt`, `previews` for the new state | none | NOT_FOUND card no longer in the decks, generic INTERNAL_SERVER_ERROR on save failure |
| `undoRating` | Action (JSON) | `logId`:int (req) | `deck`, `guid`, `state` (undefined when back to new), `dueAt`, `previews`, `missing`:boolean (true when the card is no longer in the decks) | none | NOT_FOUND when that rating is not the newest or no longer exists, generic INTERNAL_SERVER_ERROR |

No guid ever goes into a URL. Actions take `deck` and `guid` as separate fields and look up the `cards` entry whose id is the deck, a colon and the guid (`cardKey(deck, guid)`).

**Value sourcing** (every value an action produces or a page displays, and where it comes from):

| Action | Value produced / displayed | Source |
|---|---|---|
| all | current time (`now`) | server clock `new Date()` in the page or Action; the island uses a `serverNow` prop for its first render, then the browser clock only to choose which card to show next, never for writes |
| pages, `rateCard` | study day start and end | derived from `now`, the 4 AM constant and the machine's local timezone (`new Date()` local methods) |
| `/flashcards`, review page | new cards still allowed today (`remaining`) | max(0, 10 minus the count of `review_log` rows with null `previous_state` and `reviewed_at` at or after study day start) |
| `/flashcards`, review page | which cards are new | cards in the `cards` collection that have no `card_state` row |
| `/flashcards` deck row | new available | min(`remaining`, that deck's new card count); deck rows need not add up to the total |
| `/flashcards`, badge, home line | due now | `card_state` rows: state 2 with `due` before study day end, plus states 1 and 3 with `due` within 20 minutes of `now` (two clocks on purpose: a learning card due at 23:00 is not counted at 14:00) |
| badge, home line | cards waiting today | due now plus min(`remaining`, all new cards); computed in `loadStudyPath` from the `cards` collection and all `card_state` rows (at most 56, a full read is fine) with the pure queue module |
| session queue at page load | which cards go in | state 1 or 3 with `due` within 20 minutes of `now`, state 2 with `due` before study day end, then new cards up to `remaining` in deck order (all decks, or the one named in `deck`) |
| island, choosing the next card | the next card to show | pure `pickNext` from `flashcards-queue.ts`: learning cards whose `due` has passed first, then review cards by `due`, then new cards; a learning card not yet due is shown only when nothing else remains and it is due within 20 minutes |
| pages | deck order and card order | `DECK_ORDER` constant (`system-design`, `system-design-exercises`, `oo-design`, unknown decks after, by name), then the Anki note id ascending |
| review page | card front, back, deck title | the `cards` collection entry (`title`, `backHtml`, `deckTitle`) |
| review page, `rateCard`, `undoRating` | interval labels on the rating buttons ("10m", "3d") | `ts-fsrs` `repeat()` for the card's state at `now`, difference between `now` and each `due`, formatted by `formatInterval` (`<1m`, `Nm`, `Nh`, `Nd`, `Nmo`, `Ny`, rounded down). A learning card that comes back minutes later shows labels computed at rating time, so they can be a little stale; accepted |
| `rateCard` | the new schedule | `ts-fsrs` `next()` with the stored `card_state` row (or an empty card for new), the rating, `now`, retention 0.9, fuzz off |
| `rateCard` | `logId` | the `review_log` insert result |
| `undoRating` | the restored schedule | `review_log.previous_state` of the row with id `logId` |
| done screen, `/flashcards`, home line | next due time | earliest `due` across `card_state` rows not in the session, and the island's own re queued cards; shown as a local time such as "today 18:40" or "Tue 09:00", formatted on the server (the island receives the string and the epoch value) |
| `undoRating` | whether the card still exists | lookup of `cardKey(deck, guid)` in the `cards` collection, returned as `missing` |
| deck row | total cards | count of `cards` entries for the deck |

**Key invariants**:
- A card has at most one `card_state` row, and only states 1 to 3 are stored.
- `rateCard` reads the row, computes, writes the new `card_state` and inserts the `review_log` row in one synchronous SQLite transaction with no await in between.
- `undoRating` succeeds only when `logId` is the newest `review_log` row. It restores `previous_state` (or deletes the `card_state` row when null) and deletes that log row in one transaction.
- "New cards today" is always derived from the log, never stored.
- `deck:guid` is unique in the `cards` collection. A repeated guid keeps the first note and logs a warning. The `id` is never parsed; `deck` and `guid` always travel as separate fields.
- A note is usable when its note type (`col.models`) has exactly two fields and its `flds` splits on `\x1f` into two parts. The deck database handle opened from memory is closed in a `finally`.
- The cards loader replaces only the entries of decks that read successfully. A deck that fails to read keeps its existing entries (copied forward from the store); a deck file that is gone loses its entries. It watches `resources/flash_cards/` for add, change and unlink (a save that replaces the file shows up as unlink then add), with its own listener and generation counter like the content loaders.
- Card HTML reaches the island only from the cleaned `backHtml`. Raw `.apkg` HTML is never rendered.
- `src/lib/flashcards-queue.ts` is pure and imports no `ts-fsrs`, database or Node module, so the island can use it. Only the scheduler file imports `ts-fsrs`. The queue and preview types live in the queue file, so the island imports nothing from the scheduler or `@/db`.
- The island keeps the full set of the session's cards in memory, so an undone or re queued card can be shown again without a read Action. Its undo state is one `logId` (the last rating made in this session), cleared by an undo and not kept across a reload.
- Only `src/db/*.ts` imports `better-sqlite3`, so the `.apkg` reader lives at `src/db/apkg.ts` (the lint boundary stays unchanged).
- Constants: `NEW_PER_DAY = 10`, `ROLLOVER_HOUR = 4`, `LEARN_AHEAD_MINUTES = 20`, `REQUEST_RETENTION = 0.9`, fuzz off.

**Security model**: localhost only, one user, no accounts, so there are no roles. Actions validate input with Zod and check that the card exists in the collection before writing. Card HTML is untrusted input from files: `sanitize-html` runs at load with an allowlist, so `dangerouslySetInnerHTML` in the island only ever receives cleaned markup. Allowed tags: `h1` to `h6`, `p`, `br`, `hr`, `ul`, `ol`, `li`, `blockquote`, `pre`, `code`, `em`, `strong`, `b`, `i`, `sub`, `sup`, `a`, `img`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `div`, `span`. Before the allowlist runs, `a.anchor-link` elements (Jupyter pilcrows) are removed in an explicit step that does not rely on filter ordering. Only absolute http, https and mailto links stay; any other `<a>` (relative, `#anchor`, other schemes) is unwrapped to its text, since ids are stripped and those links would go nowhere. Allowed attributes: `href` (http, https, mailto) on `a`, with `rel="noopener noreferrer"` and `target="_blank"` added; `src` (http, https), `alt`, `width`, `height` on `img`, with `loading="lazy"`, `decoding="async"` and `referrerpolicy="no-referrer"` added and a default `alt` of "Image" when missing. No `style`, no `class`, no ids. No personal or regulated data is involved, so no compliance scope.

**Configuration required**: none. No new environment variables. The deck folder comes from `REPO_ROOT`, and the database uses the existing `STUDY_DB_PATH`.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: open `/flashcards`, start Review all, reveal, rate Good, reload, the card is no longer in the queue and has a future due time, verifies **AC-3**, **AC-4**, **AC-5**
- Happy path: a fresh database offers exactly 10 new cards in deck order, then none until the next 4 AM, verifies **AC-6**
- Happy path: Again returns the card in the same session; with only a 10 minute learning card left it is shown, verifies **AC-7**
- Failure case: undo a first rating, the card is new again and the new card count goes back down; undo with a stale `logId` is refused, verifies **AC-8**
- Failure case: a deck file with a script tag, an inline style, a `javascript:` link and an `onerror` image produces none of them in the page, verifies **AC-2**
- Failure case: remove a note from a deck while a session is open, rating it shows the message and moves on, its saved row stays, verifies **AC-10**
- Failure case: corrupt one `.apkg`; the other decks still load and the error is logged, verifies **AC-12**
- Load check: card counts are 42, 8 and 6 and every `title` is non empty, verifies **AC-1**
- Accessibility: complete a session using only the keyboard at phone width in both themes, verifies **AC-11**
- Edge: badge and home line change after a review without a restart, verifies **AC-9**

## Build plan

Skateboard order: the thinnest usable whole first (cards load, you can review and your ratings stick), then undo, learn ahead and the badge, then the edge pass. Two tables arrive in one migration because they are used together from the first rating.

1. Add `ts-fsrs`, `fflate`, `sanitize-html` and `@types/sanitize-html`. Write `src/db/apkg.ts` (unzip with `fflate`, open the deck's SQLite bytes with `better-sqlite3`, return raw notes, deck name and guids; prefer `collection.anki21` over `collection.anki2` when both exist; report `collection.anki21b` as unsupported), `src/content-pipeline/cards.ts` (shape notes into cards, skip unusable notes with warnings, clean HTML, deck order, `title`), a cards loader that watches `resources/flash_cards/` and keeps the last good load, the `cardSchema`, and the `cards` collection in `content.config.ts`, satisfies **AC-1**, **AC-2**, **AC-12**
2. Add `cardState` and `reviewLog` to `src/db/schema.ts` with the two indexes and generate the migration with `pnpm db:generate`. Write `src/lib/flashcards-queue.ts` (constants, study day start and end, new and due counts, queue building, next card choice, `formatInterval`), `src/lib/flashcards-scheduler.ts` (the `ts-fsrs` wrapper: rate, previews) and `src/db/flashcards.ts` (load states, apply a rating, undo the newest, count new cards since a time), satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**
3. Add the `rateCard` and `undoRating` Actions with Zod input, a card existence check, `ActionError` for expected failures and one logged generic error for the rest, satisfies **AC-5**, **AC-8**, **AC-10**
4. Build `/flashcards` with the deck rows, counts, Review all and per deck links, the empty state with next due time, satisfies **AC-3**
5. Build `/flashcards/review` and `src/components/islands/ReviewSession.tsx` (hydrated with `client:load` and a one line comment, like the practice page): front, Show answer, four rating buttons with interval labels and keys 1 to 4, the queue order, Again coming back, the 20 minute learn ahead, undo with Z, the done screen, inline error line and live region, focus handling, satisfies **AC-4**, **AC-6**, **AC-7**, **AC-8**, **AC-11**
6. Add the Flashcards sidebar link and the home summary line: `loadStudyPath` also reads the `cards` collection and all `card_state` rows and computes the counts with the pure queue module, `NavItem` gets `badge?: { count, label }` (visible number plus visually hidden "N cards to review today"), satisfies **AC-9**
7. Edge pass: a vanished card mid session, a corrupt deck, two tabs, a sanitizer check against a crafted note, phone width and keyboard check in both themes, live edit of a deck in dev, `pnpm check` and `pnpm build`, satisfies **AC-1**, **AC-2**, **AC-10**, **AC-11**, **AC-12**, **AC-13**

## Consequences

**Positive**:
- Daily review happens in the same place as studying, with no export or import step.
- Deck files stay untouched and upstream changes show up on their own, and your schedule survives deck edits because it is keyed by guid.
- No new mutable module state: caching and watching come from the content layer, like topics and exercises.
- Two small tables and two Actions; specs 0009 (quizzes) and 0010 (search) can read the same `cards` collection.

**Negative / tradeoffs**:
- The cards are whole README sections and whole solved exercises, not short questions. Each review is a long read and mostly repeats content that already exists on the topic and exercise pages.
- Images on the backs are remote links (imgur, camo). Offline or with dead links you see alt text, and your browser contacts those sites when a card opens.
- Three new dependencies, and `ts-fsrs` may change its API between versions.
- Only the legacy `.anki2` and `.anki21` formats are read; a newer Anki export (`.anki21b`) is reported as unsupported.
- No reset, no statistics and no per card edit in this version.
- The new card cap is shared across decks, so reviewing one deck still uses the same 10 per day.
- Learning cards due later than 20 minutes after you start are not part of that session.
- Study days use the computer's local timezone, so travelling shifts the 4 AM boundary.
- The queue's card HTML travels as island props (a few hundred KB on a full day).
- Interval labels on a card that returns minutes later can be slightly stale.
- The sidebar badge and home line update on the next page load, not live.
- In a production build the decks are read at build time; a deck edit after `pnpm build` needs a rebuild. Dev reloads live.

**Neutral**:
- One new migration. The island follows the pattern of `PracticeSession.tsx`.
- Two ratings on the same card from two tabs end with the last write; undo only ever touches the newest rating.

## Follow-up

- [ ] After build step 5, review for a few real days before polishing. Ten whole topics a day may feel heavy; if so, lower `NEW_PER_DAY` or start the deferred small generated cards.
- [ ] Specs 0009 (topic quizzes) and 0010 (search) should build on the `cards` collection. Card titles equal README headings, which is the likely way to match cards to topics.
- [ ] `/sync` or `/audit`: add `src/db/apkg.ts`, the cards loader and spec 0008 to `app/AGENTS.md` (Key files and Related specs), and record Agent Skills for `ts-fsrs`, `fflate` and `sanitize-html` as declined in the root `AGENTS.md`.
- [ ] After install, check that the remote image links in the decks still resolve. If many are dead, decide separately whether to map them to the repo's `images/` folder.
- [ ] Optional later: a per deck reset, review statistics, and small generated cards (already listed under Deferred in the scope).

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
