# Scope: System Design Study App

A personal study app that sits on top of this repo. It turns the long README, the solved exercises, and the Anki decks into a guided path you can work through, with progress tracking, a practice mode for the exercises, flashcards, and search. It runs locally, it's just for you, and it reads the repo's own markdown so upstream updates show up without copying anything by hand.

**Build approach:** Skateboard (ship the smallest study app you would actually use, then make it more useful one release at a time).
**Workflow:** Alpha (after `/develop`, run `/check verify` on the real app). This is the default level of rigor for the project. `/architect` is the recommended first stop for any feature with a real decision, but you can skip it when you already know how to build it. Any feature can carry its own tag (for example `· Beta`) if you want more or less rigor for it.

_These are recommendations to keep your build orderly, not requirements. Skip anything that doesn't fit. If you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | Study content (README, solutions, Anki decks) | Existing | existing |
| 1 | Stack & architecture | Foundation | done |
| 2 | Coding standards & tooling | Foundation | done |
| 3 | Content pipeline | Foundation | done |
| 4 | Design system & UI foundation | Foundation | done |
| 5 | Guided study path | Release 1 | done |
| 6 | Progress tracking | Release 1 | done |
| 7 | Exercise practice mode | Release 2 | planned |
| 8 | Flashcards from the Anki decks | Release 3 | planned |
| 9 | Topic quizzes | Release 3 | planned |
| 10 | Search | Release 4 | planned |
| 11 | Floating study assistant | Release 5 | planned |

## Already in the repo

### A. Study content · existing
The source material the app reads: the topic sections in `README.md`, the system design and object oriented exercises in `solutions/`, and the three Anki decks. The app never edits these files. code in `README.md`, `solutions/`, `resources/flash_cards/`

## Foundations

### 1. Stack & architecture · done
Decide what the app is built with, where it lives in this repo so it stays separate from the upstream content, and how you start it locally.
**Done when:** the stack and app location are recorded in a spec, and an empty app starts locally with one command and shows a page.
spec [0001](../specs/0001-stack-and-architecture/index.md) · code in `app/`
- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Scaffold from the decision: `/develop stack & architecture`
- [x] Verify it: `/check verify stack & architecture`

### 2. Coding standards & tooling
Capture the conventions for the app code (there is no root `AGENTS.md` yet), then set up lint and format.
**Done when:** root `AGENTS.md` describes the app and the content folders, and lint and format run clean on the app code.
spec [0002](../specs/0002-coding-standards-and-tooling/index.md) · code in `app/`
- [x] Decide the conventions and tooling (spec): `/architect coding standards & tooling`
- [x] Set up lint, format and type check from the decision: `/develop coding standards & tooling`
- [x] Capture conventions in `AGENTS.md`: `/audit`
- [x] Verify it: `/check verify coding standards & tooling`

### 3. Content pipeline
Turn the repo's markdown into structured study content: topics with their sections, the suggested study order, and each exercise split into its problem statement and its solution. Everything else builds on this.
**Done when:** every README topic and every exercise in `solutions/` loads as structured content, relative images render, and a change to the markdown shows up without manual steps.
spec [0003](../specs/0003-content-pipeline/index.md) · code in `app/src/content-pipeline/`
- [x] Design it (spec): `/architect content pipeline`
- [x] Build it: `/develop content pipeline`
  - [x] Topics load as structured entries with their images served safely (AC-1, AC-2, AC-5, AC-9, AC-10, AC-11)
  - [x] All 14 exercises load split into problem and solution (AC-3, AC-4, AC-8)
  - [x] Links inside the content open the right topic or exercise (AC-6)
  - [x] Edits show up live, bad content degrades to warnings, and the build passes (AC-7, AC-8, AC-11, AC-12)
- [ ] Verify it: `/check verify content pipeline` (skipped, marked done by you)

### 4. Design system & UI foundation · done
A calm, readable look for long study sessions: type, color, spacing, layout, light and dark themes, and the base components.
**Done when:** `design.md` covers type, color, spacing and components, long articles and code blocks read comfortably, and base components work by keyboard.
spec [0004](../specs/0004-design-system-ui-foundation/index.md) · code in `app/src/styles/`, `app/src/components/ui/`, `app/src/layouts/`
- [x] Design it (spec): `/architect design system & UI foundation`
- [x] Build it: `/develop design system & UI foundation`
  - [x] Tokens, fonts, and light/dark/system theme (AC-2, AC-3, AC-10, AC-11, AC-13)
  - [x] Shell and a first readable article with Shiki code (AC-4, AC-5, AC-7)
  - [x] Figure, callout, margin note, table, and base interactive components (AC-6, AC-8, AC-9)
  - [x] `/design` page, contrast script, and `app/DESIGN.md` (AC-1, AC-3, AC-12)
- [ ] Verify it: `/check verify design system & UI foundation`

## Release 1: Guided study path with progress

The smallest app you would use instead of scrolling the README.

### 5. Guided study path · done
A home page that lays out the topics in a recommended order (from the README's study guide and "start here" section), plus a clean reader for each topic with next and previous links.
**Done when:** you can open the app, see the ordered path, read any topic with its diagrams, and move to the next topic in one click.
spec [0005](../specs/0005-guided-study-path/index.md) · code in `app/src/pages/`, `app/src/lib/`, `app/src/components/`
- [x] Design it (spec): `/architect guided study path`
- [x] Build it: `/develop guided study path`
  - [x] Path helper and labelled sidebar on every page (AC-1, AC-3, AC-5, AC-11)
  - [x] Topic reader with previous and next, and the home page path list (AC-1 to AC-4, AC-8, AC-9, AC-10)
  - [x] Exercise list and exercise reader (AC-6, AC-7, AC-8)
  - [x] Live edit, small screen and keyboard check, and the build passes (AC-10, AC-11, AC-12)
- [ ] Verify it: `/check verify guided study path`

### 6. Progress tracking · done
Mark topics and exercises as done and see how far along you are. Progress stays saved between sessions on your machine.
**Done when:** you can mark a topic done, the path and home page show overall progress, and progress is still there after closing and reopening the app.
spec [0006](../specs/0006-progress-tracking.md) · code in `app/src/db/`, `app/src/lib/`, `app/src/actions/`, `app/src/components/`
- [x] Design it (spec): `/architect progress tracking`
- [x] Build it: `/develop progress tracking`
  - [x] Progress table, migration, data access, counts helper and the save action (AC-2, AC-3, AC-7, AC-8, AC-9)
  - [x] Done button on the topic page, working end to end (AC-1, AC-2, AC-3, AC-7)
  - [x] Done marks on path rows and sidebar, and the home summary (AC-4, AC-5, AC-6)
  - [x] Exercise page button, two tab and renamed topic checks, small screen and keyboard check, and the build passes (AC-1, AC-6, AC-8, AC-10, AC-11)
- [ ] Verify it: `/check verify progress tracking`

## Release 2: Practice the exercises

### 7. Exercise practice mode · needs a decision
Interview style practice for each exercise: you see only the problem, work through the 4 step framework with prompts and a timer, then reveal the solution and diagrams to compare.
**Done when:** you can start any exercise with the solution hidden, run a timed session with step prompts, reveal the solution, and the exercise is marked practiced.
- [ ] Design it (spec): `/architect exercise practice mode`

## Release 3: Review and recall

### 8. Flashcards from the Anki decks · needs a decision
Bring the cards in the three `.apkg` decks into the app and review them with spaced repetition, so daily review happens in the same place as studying.
**Done when:** all three decks load with their cards intact, a daily review session shows the cards that are due, and your answers change when each card comes back.
- [ ] Design it (spec): `/architect flashcards from the Anki decks`

### 9. Topic quizzes · needs a decision
A short quiz at the end of a topic, using the deck cards that match it, to check you understood it before moving on.
**Done when:** a finished topic offers a quiz drawn from its matching cards, you see a score, and topics with no matching cards just skip the quiz.
- [ ] Design it (spec): `/architect topic quizzes`

## Release 4: Find anything

### 10. Search · needs a decision
One search box across topics, exercises, and cards so you can jump to any term (for example "consistent hashing") quickly.
**Done when:** typing a term shows matching topics, exercises, and cards ranked sensibly, and choosing one opens it at the right section.
- [ ] Design it (spec): `/architect search`

## Release 5: Ask for help

### 11. Floating study assistant · needs a decision
A chat bubble that floats on every page. It knows which topic, exercise, or card you have open, guides you through it, and answers your questions using that material first.
**Done when:** the bubble opens from any page, answers about the open topic or exercise stay grounded in its text, it can explain what to study next, and it says so plainly when the material does not cover a question.
- [ ] Design it (spec): `/architect floating study assistant`

## Deferred
Out of scope for this build pass, kept here so the plan stays honest.
- **Generated cards**: extra flashcards built from README sections, beyond the Anki decks · needs a decision
- **Runnable OO exercises**: run and edit the Python object oriented solutions in the browser · needs a decision
- **Study schedule**: a day by day plan built from your timeline (short, medium, long) · needs a decision
- **Practice notes**: save your own design attempts next to each exercise to review later

## Legend

**The decision box.** Every feature carries exactly one, the step whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack (spec)` on Stack & architecture), so skills find it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves. Each row shows what the feature looks like and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` plus **2 to 5 milestones**; the tier's closing boxes (`Verify it` for Alpha and up); any surfaced follow up enrolled |
| `in-progress` (building) | `/develop` | milestone boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` and milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is** (any skill sets it when you say so); `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; for Alpha, after `/check verify` is the suggested point to call it done |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise go straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here.** The scope only carries the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (there before this workflow) and `dropped` (taken out of scope, kept for history).
- **Approach tag** beside a heading (for example `· Facade`) overrides the project default for that feature; no tag means it inherits.
- **Workflow tier tag** beside a heading (for example `· Beta`) sets that one feature's rigor above or below the project default; no tag inherits it.
- **Workflow** (header line) is the project default, what runs after `/develop`: **Prototype** = nothing; **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`. A feature built on an unratified decision (an `Assumed` spec) stays flagged, but that never blocks `done`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link is added by `/architect`, the code path by `/develop`.
