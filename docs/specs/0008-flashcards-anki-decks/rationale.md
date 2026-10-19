# 0008. Flashcards: rationale and options

This is the decision record for [index.md](index.md). It is not needed to build.

## Context

> ⚠️ Premise note: the three decks are not short question and answer cards. Each front is a heading and each back is a whole README section or a whole solved exercise (up to about 120 KB of HTML for one card). Reviewing them means recalling a full topic from its title, and the backs repeat content already on the topic and exercise pages. That still serves the scope ("bring the cards in the decks into the app"), so this spec loads them as they are. Small question style cards are the deferred "generated cards" item. If daily review feels too heavy, that is the next thing to build, not a change to this design.

Workspace: single repo, app in `app/`. Spec [0001](../0001-stack-and-architecture/index.md) fixes Astro server pages, Astro Actions for every write, SQLite with Drizzle, localhost only and no accounts. Spec [0003](../0003-content-pipeline/index.md) shows how repo files become content collections through loaders that watch files. Spec [0006](../0006-progress-tracking.md) sets the rule that saved rows point at content by id with no foreign key and survive content changes. Spec [0007](../0007-exercise-practice-mode/index.md) added the app's first React island, which this feature follows. `AGENTS.md` allows no module level variables except constants (and the DB connection), and only `src/db/*.ts` may import `better-sqlite3`.

The cards live in three `.apkg` files. An `.apkg` is a zip file holding a SQLite database. All 56 notes use one plain Front and Back note type, have a unique guid, and carry no review history, so every card starts as new. The decks hold no media files; images are remote links.

The app needs three things it does not have: a way to read a foreign file format as content, a scheduler that decides when each card returns, and a place to keep a schedule per card that survives edits to the decks. Without it, daily review stays in Anki, away from the topics it quizzes.

## Options considered

### Option 1: Read the `.apkg` files in place as a content collection, schedule with FSRS, keep only schedule state in SQLite

An Astro loader unzips each deck in memory, reads the notes, cleans the HTML and stores them in a `cards` collection. SQLite holds `card_state` and `review_log` only.

**Pros**:
- Matches how topics and exercises load: same watching, same last good load behaviour, no new mutable state.
- Deck files stay the source of truth and are never copied or edited.
- Schedule rows survive deck edits because they are keyed by guid.

**Cons**:
- Needs a zip library and a sanitizer, plus the scheduler library.
- Parsing a foreign format at load time adds a failure surface (handled by keeping the last good load).

### Option 2: One time import command that copies the cards into SQLite

A script reads the decks once and writes cards into tables. Reviews query one database.

**Pros**:
- Simple queries, one place for everything.
- No parsing at runtime.

**Cons**:
- A changed deck needs a manual re import and a merge rule for edited cards.
- Copies upstream content into the database, against the rule that the app reads it in place.

### Option 3: Convert the decks to JSON or markdown files by hand and commit them

Export once, commit generated files, load them like other content.

**Pros**:
- No zip or SQLite parsing in the app.
- Easy to read and diff.

**Cons**:
- Generated files must be kept in sync by hand, and the repo's upstream folders must stay untouched, so they would live somewhere new.
- Loses the guid link unless the converter keeps it.

### Option 4: Do not build it; use Anki itself for review

Import the three decks into Anki and review there.

**Pros**:
- Anki is mature: statistics, add ons, mobile apps, sync.
- No code to build or keep.

**Cons**:
- Review happens away from the topics and exercises, which is the point of this app.
- The done condition in the scope (decks load, a daily session, answers change when cards return) would not be met in the app.

## Rationale

Option 1 follows forces already in Context: the repo rule that upstream content is read in place, the content layer that already watches files and survives a bad read, and the rule that saved rows point at content by id and outlive it. Option 2 breaks the first, Option 3 breaks the second by adding generated files to keep in sync, and Option 4 does not deliver the feature the scope asks for, though it stays a fine fallback.

Keying state by deck and guid, with a row only after a first rating, means a deck edit cannot corrupt the schedule and "new" needs no bookkeeping. Keeping `ts-fsrs` out of the island by splitting the pure queue code from the scheduler wrapper keeps the browser bundle small and the logic testable without a database.

The engineer first picked an in memory cache keyed by file modified time. A content collection gives the same speed and live refresh without adding a second module level mutable variable, so the pick was changed with their agreement.

### Sub decisions

- **Scheduler**: FSRS via `ts-fsrs` (recommended and chosen), runner up SM-2 written by hand. FSRS adapts better for hard cards and is what Anki uses now. The cost is one dependency with an API that may shift between major versions. A Leitner box scheme was the simplest option and adapts least.
- **Rating scale**: four buttons, because FSRS expects four grades; two buttons would waste its signal.
- **Daily cap**: 10 new cards per study day, because each card is a long read. Reviews have no cap; only 56 cards exist.
- **Study day**: 4 AM local, so a late session counts for the day it started.
- **Sanitizer**: `sanitize-html` (server side, pure JavaScript). Runner ups were `rehype-sanitize` (more packages for the same result) and `isomorphic-dompurify` (pulls in jsdom, heavy for a local app).
- **Zip library**: `fflate` (small, no native build). Runner ups `adm-zip` and `yauzl`.
- **Opening the deck database**: `better-sqlite3` accepts the bytes directly; this was tried against the System Design deck (42 notes read, two fields per note) before writing the spec.
- **Images**: keep remote links with lazy loading and alt text, the engineer's choice over removing them.
- **Queue order**: learning first, then due reviews, then new, so fresh material never pushes out cards about to be forgotten.
- **Learn ahead**: 20 minutes, Anki's default, so a card rated Again is asked again before the session ends.
- **Island data**: the page passes the whole session's cleaned cards as props, so the island needs no read Action and works while an Action is in flight. This costs payload size on a heavy day, accepted for a single local user.
- **Retention**: 0.9 fixed, fuzz off, no setting, to keep the screen small.
- **Undo**: by `logId`, only for the newest rating, so a stale tab cannot undo an older rating by accident.

## Evidence: what the decks contain

Inspected on 2026-10-19 in a scratch folder, nothing in the repo changed.

| Deck file | Notes | Largest raw card | Notes with images | Media files | Review history |
|---|---|---|---|---|---|
| `System Design.apkg` | 42 | about 24 KB | 24 (remote links) | none | none |
| `System Design Exercises.apkg` | 8 | about 121 KB | 8 (remote links) | none | none |
| `OO Design.apkg` | 6 | about 51 KB | 0 | none | none |

All notes share one Basic note type with two fields, Front and Back. The decks are in the legacy `.anki2` format (2017). Fronts are one heading each, 276 to 441 characters of raw HTML including inline styles. Guids are unique within each deck.
