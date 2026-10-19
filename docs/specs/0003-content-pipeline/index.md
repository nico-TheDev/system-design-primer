# 0003. Content pipeline: turn the repo markdown into topics and exercises

**Date**: 2026-10-19
**Status**: Accepted

## Summary

The app reads the repo's `README.md` and `solutions/` folder in place and turns them into two lists of structured content: 24 study topics and 14 exercises, each exercise split into a problem and a solution. Nothing is copied or edited, so an upstream pull or a change you make to the markdown shows up on its own. Links between topics and the repo's diagrams are rewritten so they work inside the app. This is the base every reading, practice, and search feature builds on.

## Requirements

**User stories**:
- As a learner, I want every README topic and every exercise available as structured content so that the app can show a guided path instead of one long page.
- As a learner, I want each exercise split into problem and solution so that I can practice without seeing the answer.
- As a learner, I want edits and upstream pulls to appear without extra steps and without breaking the app.

**Acceptance criteria**:
- **AC-1**: Every `##` section of `README.md` that is not on the exclude list loads as a topic, and so does every `###` under `## Appendix`. Today that is 24 topics. The exclude list is: Motivation, Anki flashcards, Contributing, Index of system design topics, System design interview questions with solutions, Object-oriented design interview questions with solutions, Under development, Credits, Contact info, License.
- **AC-2**: Each topic has an `id` (the GitHub style slug of its heading, unique), `title`, `kind`, `order`, `html` and `headings`. The order is: "System design topics: start here" first, then the index topics in README order, then the interview approach, the study guide, and the appendix items.
- **AC-3**: All 8 system design exercises and all 6 object oriented exercises load, and the `template` folder is skipped. Each has `id` (folder name), `title`, `kind`, `order`, `problem` and `solution`. Order follows the two tables in the README, system design first.
- **AC-4**: For system design exercises, `problem` is everything between the `#` title and the `## Step 2` heading (this deliberately keeps Step 1's constraints and usage math, which are part of the question), and `solution` is the list of `##` sections from Step 2 on (Step 2, Step 3, Step 4, Additional talking points). For notebooks, `problem` is the content after the title and before the `## Solution` heading, and `solution` is one section holding everything after it, with code cells shown as highlighted Python blocks and outputs dropped. The markers match on heading text only: depth 2 and `^Step\s*2\b` (ignore case), or depth 2 and `^Solution$` (ignore case). Headings inside code blocks never count.
- **AC-5**: Images in topics and exercises load in the browser: README images (markdown or raw `<img>` tags) through the `repo-images` endpoint. An imgur URL whose id matches a file in `images/` uses the local file; every other remote URL stays as written (so exercise images without a local copy still need a network connection).
- **AC-6**: Links inside the content work in the app, in markdown and in raw `<a>` tags: `#anchor` links, absolute `https://github.com/donnemartin/system-design-primer#anchor` links, and relative links to an exercise (resolved against the source file's folder first, `#fragment` kept) open the matching topic or exercise page. Anchors that point into sections that are not topics go to the upstream GitHub URL with the same anchor and no warning, except the two exercise table anchors, which go to `/exercises/`, and `#appendix`, which goes to the first appendix topic. The bare upstream URL and all other outside links are untouched. Any other internal link that matches nothing is left as written and logged as one warning per distinct target per sync.
- **AC-7**: With the dev server running, editing `README.md` or any file under `solutions/` updates the content within a few seconds with no restart, including a newly added `##` section or exercise folder.
- **AC-8**: If the expected structure is missing (no `## Step 2`, no `## Solution` cell, a renamed marker heading), the item still loads as one whole page (`split: false`, empty `problem`, a single solution section holding everything) and a warning is logged. An unreadable notebook is skipped with an error log. Nothing crashes the dev server or the build.
- **AC-9**: The `repo-images` endpoint serves only image files (`png`, `jpg`, `jpeg`, `gif`, `svg`, `webp`, matched ignoring case) under `../images/` and `../solutions/`. After URL decoding it rejects any path that contains `..` or resolves outside those folders (including through symlinks), and returns 404 for everything else. Every image response carries `Content-Security-Policy: sandbox; default-src 'none'`.
- **AC-10**: Each content sync logs one line (for example `content: 24 topics, 14 exercises, 2 warnings`) and one warning line per problem.
- **AC-11**: The pipeline never creates, edits, or deletes a file outside `app/`: after a full run, `git status` shows no change outside `app/` and `docs/`.
- **AC-12**: `pnpm build` succeeds with both collections.

## Decision

**Chosen option**: Option 1: Custom loaders over one shared snapshot, render each file once, split the rendered HTML

Build two Astro content collections, `topics` and `exercises`, from `../README.md` and `../solutions/**`. One shared snapshot renders each source file once with Astro's `renderMarkdown`, takes heading depth, text and id from the renderer's `headings`, cuts the HTML at heading tags with a small hand written splitter, and rewrites links and images on the finished HTML. No new dependency.

**Implementation skills**: none installed (Agent Skills were declined in spec 0001).

## Feature design

**Data model sketch** (two content collections; no database tables, nothing is stored between runs):

`topics` (24 entries today)

| Field | Type | Notes |
|---|---|---|
| id (primary key) | string | the heading's `id` from the renderer (GitHub style slug, unique across the whole README because one slugger renders the whole file) |
| title | string | the renderer's plain text for the heading |
| kind | `start-here` · `topic` · `interview-approach` · `study-guide` · `appendix` | `start-here`, `interview-approach`, `study-guide` are matched by their heading slugs (`system-design-topics-start-here`, `how-to-approach-a-system-design-interview-question`, `study-guide`); `appendix` is any `###` under `## Appendix`; everything else is `topic` |
| order | integer, unique | sort by kind rank (start-here 0, topic 1, interview-approach 2, study-guide 3, appendix 4), then README position; renumbered 0..n |
| html | string | rendered body (everything under the heading, sub headings kept with their `id` anchors). The first appendix topic also starts with the text between `## Appendix` and its first `###` |
| headings | list of {depth, text, anchor} | the renderer's headings that fall inside the chunk (sub headings only), for a table of contents |

`exercises` (14 entries today)

| Field | Type | Notes |
|---|---|---|
| id (primary key) | string | folder name, for example `pastebin`, `lru_cache` |
| title | string | the first `h1` of the rendered file; if there is none, the folder name, with a warning |
| kind | `system-design` · `object-oriented` | folder under `solutions/` |
| order | integer, unique | position in the README tables, system design first; folders missing from the tables follow alphabetically with a warning |
| split | boolean | true when the problem and solution split succeeded; false for the whole page fallback |
| problem | string (html) | empty when `split` is false |
| problemHeadings | list of {depth, text, anchor} | renderer headings inside `problem` |
| solution | ordered list of {title, anchor, html, headings} | system design: one item per `##` from Step 2, `anchor` is that heading's `id`; notebook: one item titled "Solution", anchor `solution`; fallback: one item titled "Full page", anchor `full-page` |

Relationships: none between the collections. A link map (README heading `id` → the topic that contains it) is built in a first pass over the README and used only while rewriting links; it is not stored. It covers the README only; a `#slug` inside an exercise resolves within that exercise first, and exercise to exercise links are path based.

**Parsing rules** (three passes over one snapshot):
- **Pass 1, render.** Read each source file as UTF-8, normalise CRLF to LF, and render it once with `renderMarkdown`. Keep the HTML and the renderer's `headings` (depth, text, id). Heading depth, text, and id always come from the renderer, so headings inside code blocks never count. Every heading in the HTML is located by its opening tag `<hN ... id="<id>"`, matched in order with the `headings` list.
- **Pass 2, split.** Cut the HTML of each file at those heading tags.
  - Topics (README): a chunk starts at an `h2` and ends before the next `h2`, and includes its `h3` and deeper. Skip excluded headings (compared by id). `## Appendix` is not a topic; each `h3` under it starts a chunk ending at the next `h3` or `h2`, and the text between the Appendix `h2` and its first `h3` is placed at the top of the first appendix topic. Text before the first `h2` is ignored.
  - System design exercises: every folder in `solutions/system_design/` with a `README.md` (the `template` folder has none, and is also skipped by name). `title` is the first `h1`. `problem` is the HTML between the `h1` and the first `h2` whose text matches `^Step\s*2\b` (ignore case). Each `h2` from there to the end of the file is one solution section.
  - Object oriented exercises: for every `solutions/object_oriented_design/<folder>/` take the first `.ipynb` alphabetically (warn if there are more; skip dot folders such as `.ipynb_checkpoints`). Parse as JSON and build one markdown text first: each cell's source lines joined as is, cells separated by a blank line, a code cell turned into a fenced `python` block after dropping a leading `%%writefile ...` line, empty cells and all outputs dropped, the attribution cell (the one before the `#` title cell) dropped. Code cells are kept wherever they fall. Never execute notebook code. Render that text once; `problem` is the HTML between the `h1` and the `h2` whose text matches `^Solution$` (ignore case), and the single solution section is everything after it.
  - If the cut points are not found, apply the fallback in AC-8.
  - If two folders produce the same exercise id (the same folder name under both kinds), the system design one wins and a warning is logged.
- **Exercise order.** From the rendered README, read only the links in the two excluded exercise sections (found by their ids), in order, and take the folder from each `solutions/<dir>/<folder>/...` href. Use the first appearance of each folder. Warn on a table row whose folder does not exist. Links elsewhere in the README to exercises (such as in the "View exercise and solution" lines) do not affect order.
- **Pass 3, rewrite.** Rewrite link and image attributes on the HTML as described below, then store.
- README translations (`README-zh-Hans.md` and similar) and all other files are ignored.

**Rewrite rules** (pass 3; applied only to real `<a href>` and `<img src>` start tags in the HTML, never to code text, because the renderer escapes code and writes every attribute quoted, including attributes that were unquoted in raw HTML):

| Found | Rewritten to |
|---|---|
| `#slug` (or the absolute upstream URL ending in `#slug`) where `slug` is a heading id inside a topic | `/topics/<topic id>/#<slug>`, or `/topics/<slug>/` when the heading is the topic itself |
| `#slug` inside an exercise that matches a heading of that same exercise | `#<slug>` (stays on the page) |
| `#slug` of a heading inside an excluded README section | `https://github.com/donnemartin/system-design-primer#<slug>`, no warning |
| `#system-design-interview-questions-with-solutions` and `#object-oriented-design-interview-questions-with-solutions` | `/exercises/` |
| `#appendix` | `/topics/<id of the first appendix topic>/` |
| relative link to `solutions/<dir>/<folder>/...` or `../<folder>/...` (resolved against the source file's folder first), README or `.ipynb`, with any `#fragment` kept | `/exercises/<folder>/` plus the fragment |
| relative image path (resolved from the source file's folder to the repo root) | `/repo-images/<path from repo root>`; a warning if the file does not exist |
| `http(s)://i.imgur.com/<ID>.<ext>` when a file named `<ID>.*` exists in `images/` (8 of the 20 ids today) | `/repo-images/images/<ID>.<ext of the local file>` |
| the bare upstream URL with no `#fragment`, and any other `http(s)` URL | unchanged |
| any other relative or `#` link that matches nothing | unchanged; one warning per distinct target per sync |

**API surface**:

| Endpoint or module | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `getCollection('topics')` | read | none | entries per the model above, sorted by `order` by the caller | none | none |
| `getCollection('exercises')` | read | none | entries per the model above | none | none |
| `/repo-images/[...path]` (`app/src/pages/repo-images/[...path].ts`) | GET | path relative to the repo root | image bytes, `Content-Type` from the extension, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'` | none (localhost only) | 404 for any rejected or missing path |
| `/dev/content` (`app/src/pages/dev/content.astro`) | GET | none | counts plus every entry rendered inside a `<details>`, for verifying this spec | none | 404 unless `import.meta.env.DEV` |

Routes `/topics/<id>/`, `/exercises/<id>/`, and `/exercises/` (the exercise list) are the URL contract the rewritten links use. The pages themselves belong to feature 5; this spec only fixes the URLs.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Load a topic | `id` | the renderer's heading `id` for the whole README |
| Load a topic | `title` | the renderer's heading text |
| Load a topic | `kind` | id match against the three marker ids, or parent is `## Appendix`, decided here |
| Load a topic | `order` | kind rank (start here, topics, interview approach, study guide, appendix) then README position, decided here. This puts the interview approach before the study guide, which is not README order, on purpose |
| Load a topic | `headings`, heading `id`s | the renderer's output for the file, filtered to the chunk |
| Load an exercise | `id` | the folder name |
| Load an exercise | `order` | position of its folder in the README tables |
| Load an exercise | `title` | first `h1` of the rendered file, else the folder name |
| Load an exercise | `problem` / `solution` split point | the first `h2` whose text matches `^Step\s*2\b` (system design) or `^Solution$` (notebook), case ignored |
| Load an exercise | solution section `anchor` | the section heading's `id` from the renderer (`solution` for notebooks, `full-page` for the fallback) |
| Load an exercise | `problemHeadings`, section `headings` | the renderer's headings filtered to that part |
| Rewrite a relative link or image | repo root path | resolved from the source file's folder; the repo root is `path.resolve(process.cwd(), '..')` (the app root rule from 0001) |
| Rewrite an imgur URL | local file | the id in the URL matched against a file name listing of `../images/` built once per sync |
| Rewrite `#slug` | target route and anchor | the README link map (heading id to containing topic) from pass 1, or the exercise's own heading ids |
| Rewrite a link into an excluded section | the upstream URL | the fixed string `https://github.com/donnemartin/system-design-primer` plus the same `#slug` |
| Serve an image | file bytes and content type | file under the allowed folders; type from the extension |
| Log the summary | counts | the loader's own entry counts and warning counter |

**Key invariants**:
- The pipeline only reads outside `app/`. It never writes, renames, or deletes repo files (extends the invariant in 0001).
- Topic ids and exercise ids are unique. Ids do not change while the heading text or folder name stays the same.
- Headings are found only through the renderer's `headings` and the rendered heading tags, never by scanning source text, so code blocks cannot create or hide a heading. Link and image rewriting touches only real `<a>` and `<img>` start tags.
- A parse problem in one file never removes or breaks other entries; it produces a warning and a fallback (AC-8).
- Both loaders await the same in flight snapshot (one read and render per sync). The snapshot is discarded on any watcher event for `README.md` or anything under `solutions/` (add, change, or remove), because exercise order depends on the README and the link map depends on the folder list. Both loaders watch both locations. On each sync the store is cleared and refilled so removed or skipped items disappear. If `README.md` or the `solutions/` folder listing cannot be read at all, the store is left untouched and an error is logged; a single unreadable exercise is skipped with a warning.
- `repo-images` allows only the folders and extensions in AC-9, decodes the URL, resolves the real path (symlinks followed) before checking, and never serves `docs/`, `.git/`, `app/`, or any other repo folder. `server.fs.allow` stays at its default.
- Source files stay the single source of truth: no cached or generated copy of the markdown is committed.

**Security model**: no accounts. The app is localhost only (0001), content is the engineer's own repo, so raw HTML in the markdown is rendered as written. The only path based input is the image endpoint, protected by the allow list, extension list, `..` rejection, and real path check. Notebook code is read as text and never run. No compliance scope.

**Configuration required**: none. The repo root is derived from the app working directory.

**Folder layout** (new files under `app/src/`):

```
content.config.ts            defines the topics and exercises collections (Zod schemas from astro:content)
content-pipeline/
  split-html.ts              finds heading tags in rendered HTML and cuts it at them (pure)
  topics.ts                  README chunks to topics, kinds, order (pure)
  exercises.ts               solutions/ to exercises, table order, split rules (pure)
  notebook.ts                .ipynb to markdown text (pure)
  links.ts                   link map and the rewrite rules
  read-repo.ts               reads the files, normalises text, shares one snapshot per sync
  loaders.ts                 the two Astro loaders: render, rewrite, store, watch, log
pages/repo-images/[...path].ts
pages/dev/content.astro
```

**Critical test scenarios** (each maps to an acceptance criterion):
- Happy path: sync reports `24 topics, 14 exercises`; `/dev/content` lists them in the AC-2 and AC-3 order and renders each, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**
- Happy path: a README image written as a raw `<img src="images/...">` tag appears in `/dev/content`; an imgur image whose id exists in `images/` loads from `/repo-images/images/...` (works offline); an imgur image with no local copy keeps its remote URL, verifies **AC-5**
- Happy path: a `#cache` link opens the Cache topic; a link to a sub heading such as `#cache-aside` opens Cache at that anchor; an absolute GitHub anchor link inside an exercise behaves the same; `#contributing` goes to the upstream URL with no warning; `../scaling_aws/README.md` from another exercise opens `/exercises/scaling_aws/`, verifies **AC-6**
- Failure case: a `## ` line inside a code block (such as a bash example) does not start a new topic or section, verifies **AC-1**, **AC-4**
- Failure case: `scaling_aws` repeats "Assumptions" and "Goals" in its solution; the rendered ids stay unique and the section anchors work, verifies **AC-4**
- Failure case: temporarily rename `## Step 2` in one exercise: it loads as a whole page with a warning and the other exercises are unchanged, verifies **AC-8**
- Failure case: a notebook with invalid JSON is skipped with an error log and the rest load, verifies **AC-8**
- Failure case: edit `README.md` while the dev server runs, add a new `##` section: it appears as a topic within seconds without restart, verifies **AC-7**
- Auth/permission: `/repo-images/../README.md`, `/repo-images/%2e%2e/README.md`, `/repo-images/docs/specs/...`, `/repo-images/images/x.md`, and a symlink pointing outside `images/` all return 404; an upper case `.PNG` under `images/` is served; image responses carry the sandbox CSP header, verifies **AC-9**
- Failure case: after a full run, `git status` shows changes only under `app/` and `docs/`, verifies **AC-11**

## Build plan

Approach: Skateboard (thinnest usable whole first, then grow). The thinnest usable whole is "every README topic as clean HTML you can read"; exercises, notebooks, and link polish are added one at a time after that. No database migration: the collections hold nothing between runs.

1. Spike and foundation: write `split-html.ts` and, in a minimal loader, prove on the real README that (a) `renderMarkdown` returns `headings` and puts an `id` on every heading tag, including repeated titles such as "Source(s) and further reading", (b) the HTML can be cut at those tags, (c) raw `<img>` and `<a>` tags (including ones that were unquoted in the source) come out as quoted attributes that a pass over `<a>` and `<img>` start tags can rewrite, while a code sample containing `href="x"` is not touched, and (d) `watcher` events reload when `../README.md` changes. If (a) or (c) fails, fall back to a render per source file with a hast plugin scoped by a module level context, and record it in this spec, satisfies **AC-7**, **AC-12**
2. Topics slice: `read-repo.ts` (shared in flight snapshot), `topics.ts`, the `topics` collection and loader with kinds, ids, order, headings, the appendix intro, the exclude list; `content.config.ts` schema; sync summary line and warnings, satisfies **AC-1**, **AC-2**, **AC-10**
3. Images slice: the `repo-images` endpoint with the allow list, decoding, real path check, and CSP header, plus relative image rewriting and the imgur to local rule, satisfies **AC-5**, **AC-9**, **AC-11**
4. Dev check page: `/dev/content` listing counts and rendered entries, DEV only; used from here on to see each slice working, satisfies **AC-1**, **AC-2**, **AC-5**
5. System design exercises slice: `exercises.ts` for the 8 `README.md` files, table order from the rendered README, the Step 2 split, headings per part, the whole page fallback, the `exercises` collection and loader, satisfies **AC-3**, **AC-4**, **AC-8**
6. Notebook slice: `notebook.ts` and the 6 `.ipynb` exercises with the Solution split, first notebook per folder, and the invalid JSON skip, satisfies **AC-3**, **AC-4**, **AC-8**
7. Links slice: `links.ts` with the README link map and the full rewrite table (anchors, upstream absolute links, excluded section links, exercise links, relative resolution, unresolved warning once per target), satisfies **AC-6**
8. Live reload and hardening: both loaders watch `README.md` and `solutions/**` (add, change, remove), the snapshot resets on any event, the store is cleared and refilled, an unreadable README leaves the store untouched; run the full test scenario list above and confirm `pnpm build` passes, satisfies **AC-7**, **AC-8**, **AC-11**, **AC-12**

## Consequences

**Positive**:
- Every later feature gets typed topics and exercises and never parses markdown itself.
- Upstream pulls and local edits show up without a copy step, and structure changes degrade to warnings.
- The split of exercises into problem and solution sections is ready for practice mode.
- Parsing is pure TypeScript, so tests can be added by feature 2 without running Astro.

**Negative / tradeoffs**:
- The exclude list and marker headings encode today's README structure. A renamed marker heading (start here, Step 2, Solution) moves an item to the fallback until the constant is updated.
- Stored HTML cannot hold components, and the splitter depends on Astro's renderer putting an `id` on every heading, so a renderer upgrade can break it (the spike checks this today; build verification should recheck after Astro upgrades).
- Each sync re-reads and re-renders 15 files when any one changes, which is cheap at this size.
- Exercise images without a local copy (12 of 20 imgur ids) still need a network connection.

**Neutral**:
- Anki decks are out of scope here (feature 8), and so are routes and page layout (feature 5), progress (feature 6), and search (feature 10).
- `/dev/content` stays as a dev only page; feature 5 may keep or remove it.
- Counts (24 topics, 14 exercises) are today's values and will change with upstream.

## Follow-up

- [ ] Record the spike outcome (heading ids, splitting, raw HTML attributes, watcher behaviour) in this spec after build task 1.
- [ ] Feature 5 owns the `/exercises/` list page that the two exercise table anchors point to.
- [ ] Optional later: copy the 12 missing imgur images into a local, gitignored cache so exercise pages work fully offline (not decided here).
- [ ] Feature 5 should use the `/topics/<id>/` and `/exercises/<id>/` URLs fixed here, or update the rewrite table if it changes them.
- [ ] Feature 2 (`/audit`) should capture the rule that only `src/content-pipeline/` reads repo markdown, and add tests for the pure parser modules once a test setup exists.
- [ ] Feature 8 will need the three `.apkg` decks; that parsing is not part of this pipeline.
- [ ] If upstream adds a README section that should not be a topic, add its slug to the exclude list in `topics.ts`.
