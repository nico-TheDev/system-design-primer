# 0005. Guided study path: ordered home page and topic and exercise readers

**Date**: 2026-10-19
**Status**: Accepted

## Summary

The app's home page becomes a numbered list of all 24 topics in the primer's own recommended order, grouped by kind, with a Start button. Each topic opens in a clean reader with a contents sidebar, an "On this page" list, and previous and next links, and the exercises get a list page and a reader too. Nothing new is stored: the path is worked out on each request from the topics and exercises that spec 0003 already loads. It follows the Typeset Reference look from spec 0004, so there is no new visual design.

## Requirements

**User stories**:
- As a learner, I want to open the app and see the topics in a recommended order so that I do not have to decide what to read next.
- As a learner, I want to read a topic in a clean page and move to the next one in one click so that a study session flows.
- As a learner, I want the exercises listed and readable in the app so that links from the topics lead somewhere.

**Acceptance criteria**:
- **AC-1**: The home page `/` shows all topics sorted by `order`, numbered 1 to N in that order, under group headings by kind: "Start here", "Topics", "Interview approach", "Study guide", "Appendix". Each row links to `/topics/<id>/`. A primary Start button links to the first topic. A line above the list reads "Short on time? See the study guide." and links to the study guide topic. A link below the list opens `/exercises/`.
- **AC-2**: `/topics/<id>/` shows the topic title as the only `h1`, then the stored body. The running head in the header reads `<number> · <title>`. Headings inside the body are shifted so the first level below the title is `h2` (one level up for normal topics, two for appendix topics), and the topic's own anchors still work.
- **AC-3**: At the end of every topic page, previous and next links show the neighbouring topic's number and title in path order. The first topic has no previous link. The last topic's next link reads "Exercises" and goes to `/exercises/`.
- **AC-4**: "On this page" on a topic lists the topic's own `h2` and `h3` headings after the shift (from the stored headings), and each entry jumps to its heading.
- **AC-5**: The sidebar and the mobile drawer list, on every page, the topics under labelled groups (the five kinds) followed by "System design exercises" and "Object oriented exercises". Topics are numbered 1 to N, exercises 1 to M in exercise order. The current page is marked with `aria-current="page"`.
- **AC-6**: `/exercises/` lists all exercises in two groups (system design, object oriented), numbered in order, each linking to `/exercises/<id>/`.
- **AC-7**: `/exercises/<id>/` shows the exercise title as the only `h1`, then the problem. Each solution section follows under a visible `h2` with the section's title and anchor, below a "Solution" label. When `split` is false, the single whole page is shown with no extra `h2` and no "Solution" label. "On this page" lists the problem headings and each solution section with its sub headings. Previous and next links go to the neighbouring exercise in `order` (none at either end), and an "All exercises" link goes to `/exercises/`.
- **AC-8**: An unknown topic or exercise id returns a 404 page that links back to the home page. It does not throw.
- **AC-9**: If the topics collection is empty, the home page shows "No study content found. Check that README.md is in the repository root." and no Start button. The sidebar then shows only the exercise groups that have entries.
- **AC-10**: Every page title is `<page title> · System Design Study` (home: `System Design Study`). With the dev server running, an edit to `README.md` that changes a topic title or adds a topic shows on the next page load with no restart (no page is prerendered).
- **AC-11**: The pages use only existing tokens and components (no hex color, no new font, no shadow). They read correctly in light and dark, work at 360px wide and at desktop width, and every link and the drawer work with the keyboard. Previous and next sit in a `nav` landmark with an accessible label.
- **AC-12**: `pnpm check` and `pnpm build` pass.

## Decision

**Chosen option**: Option 1: Server rendered pages computed from the collections by one pure helper

Build `src/lib/study-path.ts` as a pure module over the `topics` and `exercises` collections, and render the home, topic, exercise list and exercise pages from it inside the existing Shell, with no new tool and no stored data.

**Implementation skills**: none installed (Agent Skills were declined in specs 0001 and 0002).

## Feature design

**Data model sketch**: no tables and nothing stored. The module derives, per request:

| Derived value | Shape | Built from |
|---|---|---|
| `PathTopic` | `{ id, title, kind, number, href, prev?, next? }` | topics sorted by `order`; `number` = position + 1; `href` = `/topics/<id>/` |
| `PathExercise` | `{ id, title, kind, number, href, prev?, next? }` | exercises sorted by `order`; `number` = position + 1; `href` = `/exercises/<id>/` |
| `NavSection` | `{ label?: string, items: NavItem[] }` | one per topic kind that has entries, then one per exercise kind that has entries |

`prev` and `next` hold `{ number, title, href }` or `undefined`. The last topic's `next` is the fixed `{ title: 'Exercises', href: '/exercises/' }` (no number). A group is omitted when it has no entries.

**State transitions**: none.

**Routes** (all `GET`, all server rendered, none writes anything):

| Route | Renders | Key inputs | Auth | Key errors |
|---|---|---|---|---|
| `/` | grouped path list, Start button, study guide line, exercises link | none | none | empty collection shows the message (AC-9) |
| `/topics/[id]/` | title, shifted body, pager, "On this page" | `id` from the URL | none | unknown id: 404 |
| `/exercises/` | two grouped lists | none | none | empty group omitted |
| `/exercises/[id]/` | title, problem, solution sections, pager, "On this page" | `id` from the URL | none | unknown id: 404 |

**Module surface** (`src/lib/study-path.ts`, pure, no I/O):
- `buildStudyPath(topics, exercises)`: returns the derived lists, neighbours and `NavSection[]`.
- `shiftHeadings(html, by)`: rewrites `<hN` and `</hN` to `N - by` (never below 2, never above 6). Does not touch attributes or text.
- `toShellHeadings(headings, by)`: maps `{ depth, text, anchor }` to the Shell's `{ depth: depth - by, text, slug: anchor }`.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Home | the topic list, its order, and group labels | `topics` collection `order` and `kind`; labels from a constant map kind to label in `study-path.ts` |
| Home, topic, nav | the number before a title | position in the sorted list + 1 (topics across all kinds; exercises across both exercise kinds) |
| Home | Start button target | first entry of the sorted topics |
| Home | study guide link target | the topic whose `kind` is `study-guide`; the line is hidden if none exists |
| Topic and exercise pages | `<h1>` text, page `<title>`, header running head | entry `title`; running head is `<number> · <title>` |
| Topic page | body | entry `html` run through `shiftHeadings` |
| Topic page | shift amount | 2 when `kind` is `appendix`, otherwise 1 (README topics are `h2`, appendix topics are `h3`, so their sub headings start one and two levels lower) |
| Topic page | "On this page" entries | entry `headings` through `toShellHeadings` with the same shift; the Shell keeps depth 2 and 3 |
| Topic pager | last topic's next link | fixed `Exercises` to `/exercises/` (decided here) |
| Exercise page | problem body, headings | entry `problem` and `problemHeadings`, unshifted (the title is the `h1` and the problem's own headings are `h2`) |
| Exercise page | each solution section heading | section `title` and `anchor`; rendered as `h2 id=anchor`, then the section `html` |
| Exercise page | "Solution" label and section headings shown | only when `split` is true |
| Exercise page | "On this page" | `problemHeadings` plus, per section, `{ depth: 2, text: title, anchor }` and its `headings` |
| Exercise pager | neighbours | sorted exercises; none at either end |
| Nav, every page | which row is current | `Astro.url.pathname` compared to each `href` (the Shell already does this) |
| Every page | the `<title>` suffix | constant `System Design Study` |
| Empty state | message text | constant in the page |

**Key invariants**:
- Each page has exactly one `h1`, and body headings start at `h2`.
- Numbers are contiguous from 1 and match the sidebar, the home list, the pager and the running head, because all come from `buildStudyPath`.
- Ids from the URL are only used to look up an entry in the collection. They never reach the file system.
- Nothing in this feature writes to the database, the repo, or `localStorage`.

**Security model**: single user, localhost only, no auth (spec 0001). Stored html is printed with `set:html`. That is safe here because it comes from the owner's own repo through the pipeline, not from user input; a future feature that accepts outside html needs its own decision.

**Configuration required**: none.

**Critical test scenarios**:
- Happy path: open `/`, see 24 numbered rows in five groups, press Start, read the first topic, follow Next through to the last topic, then to `/exercises/`, verifies **AC-1**, **AC-2**, **AC-3**
- Heading shift: a normal topic with `h3` and `h4` in its html comes out as `h2` and `h3`, an appendix topic with `h4` comes out as `h2`, ids unchanged, and "On this page" lists those headings, verifies **AC-2**, **AC-4**
- Exercise split: an exercise with `split: true` shows the problem, a "Solution" label and one `h2` per section, and one with `split: false` shows the whole page with neither, verifies **AC-7**
- Failure case: `/topics/not-a-topic/` and `/exercises/nope/` return 404 with a link home, verifies **AC-8**
- Empty collection: with no topics, the home page shows the message and no Start button, verifies **AC-9**
- Live edit: rename a README heading while the dev server runs and see the new title in the list and sidebar on the next load, verifies **AC-10**
- Responsive and keyboard: at 360px the drawer opens and every nav and pager link is reachable with Tab, in both themes, verifies **AC-5**, **AC-11**

## Build plan

Skateboard order: the thinnest thing you would actually use first (home plus topic reader), then the exercises, then the edge pass. No schema or migration is touched.

1. Write `src/lib/study-path.ts` with `buildStudyPath`, `shiftHeadings` and `toShellHeadings` as pure functions, satisfies **AC-1**, **AC-3**, **AC-5**
2. Extend the nav types with labelled sections (`NavSection`), update `ContentsNav.astro` and the Shell's `nav` prop to render them with a `running-head` label per section, and replace the placeholder `site-nav.ts` with the real path nav on every page including `/design` and `/sample`, satisfies **AC-5**, **AC-11**
3. Build `PathPager.astro` (a labelled `nav` with the secondary Button as links) and the `/topics/[id]/` page with the shifted body, "On this page", running head, page title and 404 handling, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-8**, **AC-10**
4. Replace the scaffold `index.astro` with the grouped path list, Start button, study guide line, exercises link and the empty state; drop the scaffold database check line, satisfies **AC-1**, **AC-9**, **AC-10**
5. Build `/exercises/` and `/exercises/[id]/` with the problem, "Solution" label, solution section headings, `split: false` fallback, exercise pager and 404 handling, satisfies **AC-6**, **AC-7**, **AC-8**
6. Edge and quality pass: live edit check, 360px and keyboard check in both themes, then `pnpm check` and `pnpm build`, satisfies **AC-10**, **AC-11**, **AC-12**

## Consequences

**Positive**:
- Opening the app gives a clear next step, which is the whole point of the app.
- The pure module gives features 6, 7 and 10 one shared definition of order, numbers and neighbours.
- Cross links inside the content now land on real pages.

**Negative / tradeoffs**:
- Heading tags are rewritten with a small string pass, so it must stay limited to heading tags and be tested against code blocks that contain `<h3` text (the pipeline escapes code, so a real heading tag never appears there).
- The Shell's `nav` prop changes shape, which touches the design system code and its `/design` page.
- The sidebar lists about 38 rows with no scroll to the current row, because reading pages stay script free (spec 0004). A long list may need a manual scroll on a topic far down the path.
- The Study guide shows late in the path, with only a line on the home page pointing to it.

**Neutral**:
- Reading time, a Continue card, progress marks and hiding the solution are not in this feature (features 6 and 7).
- Pages are not prerendered, so each page load runs the helper once.
- External links open in the same tab, as written in the content.

## Follow-up

- [ ] Add Vitest and a first test file for `study-path.ts` when `/test` runs on this feature (the project has no test runner yet), covering the heading shift and the numbering
- [ ] Feature 6 (progress tracking) will add done marks to the path rows and the sidebar; keep the row markup in one component so it can add them once
- [ ] Confirm during the build that each exercise solution section's `html` does not already contain its own heading (spec 0003 builds it from the body between headings); if it does, drop the duplicate `h2` here
