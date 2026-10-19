# 0003 rationale. Content pipeline: turn the repo markdown into topics and exercises

Decision history for [the spec](index.md): the context, the options considered, and why this one was chosen.

## Context

Spec [0001](../0001-stack-and-architecture/index.md) settled the stack: an Astro app in `app/` that reads `../README.md` and `../solutions/**` through a custom content loader, never writes outside `app/`, and serves repo images through one read only endpoint. It left the parsing rules to this spec. The scaffold has no content collections yet, and `app/src/pages/repo-images/` does not exist yet.

The source is one 1,800 line README plus 14 exercise folders written for GitHub, not for an app. The README has 24 sections worth studying (one "start here" section, 15 index topics, the interview approach, the study guide, and 6 appendix items under one `## Appendix` heading), mixed with repo marketing (Motivation, Contributing, Credits) that should not appear. Exercises come in two shapes: 8 system design folders whose `README.md` follows Step 1 to Step 4, and 6 object oriented Jupyter notebooks (`.ipynb`, JSON files) with "Constraints and assumptions" then "Solution". A `template` folder must be skipped. Content uses raw HTML (most README images and many links are `<img>` and `<a>` tags, not markdown), in page `#anchor` links (about 40 point at sections that are not topics, such as Contributing), absolute links back to the upstream GitHub README (all in the exercises), and README images by relative path. Exercise images are all remote imgur links; only 8 of their 20 ids have a local copy in `images/`.

Features 5 to 10 (reader, progress, practice mode, flashcards, quizzes, search) all consume this output, and feature 7 needs the problem and solution split. Upstream renames headings from time to time, so a rule that breaks on any change would break the study session after each `git pull`.

## Options considered

### Option 1: Custom loaders over one shared snapshot, render each file once, split the rendered HTML

Two content collections (`topics`, `exercises`) fed by loaders that share one snapshot. Each source file (the README, each exercise) is rendered to HTML once with Astro's own renderer; the HTML is then cut at heading tags, and links and images are rewritten on the finished HTML. Pages just print the stored HTML.

**Pros**:
- Reuses Astro's renderer, Shiki highlighting, and watcher support (already chosen in 0001).
- Heading ids come from one slugger per file, so they match GitHub's and never repeat on a page.
- Splitting and rewriting work on rendered HTML where code is escaped, so code blocks can never be mistaken for headings or links.
- Pages and later features read typed entries instead of parsing anything.

**Cons**:
- Entries hold HTML strings, so features cannot embed React components inside the content.
- Cutting rendered HTML depends on the renderer emitting `id` attributes on headings, which the spike must confirm.

### Option 2: Generate a copy of the content into `app/` with a script

A script converts the markdown to files inside `app/` and Astro's built in `glob()` loader reads those.

**Pros**:
- Built in loader, image optimisation, and file watching work unchanged.

**Cons**:
- A copy step that can go stale, which breaks the "changes show up without manual steps" goal.
- Generated files in the repo to ignore or commit.

### Option 3: Split the markdown source first (by lines or a remark syntax tree), then render each chunk

Same collections, but the file is cut into chunks before rendering, using a fence aware line scanner or an AST.

**Pros**:
- Each chunk is independent and simple to reason about.

**Cons**:
- Rendering chunks separately restarts heading id numbering, so ids drift from GitHub's (README repeats "Source(s) and further reading" 29 times) and one exercise page can get duplicate ids.
- A line scanner or remark packages are extra code to own just to find headings the renderer already reports.

## Rationale

The forces from Context are a source file laid out for GitHub, a rule that upstream files stay untouched, and a user who pulls upstream changes. Option 2 fails the last two directly: it adds a copy step and generated files. Option 1 keeps the source of truth in place and gives later features typed, already split data. Option 3 renders chunks on their own, and the cross check showed that breaks heading ids (about 40 README links use whole document slugs, and duplicate ids appear on pages such as `scaling_aws`). Rendering each file once fixes that and removes the need for a line scanner at all.

Stored HTML costs the ability to embed components in the content, but the app only needs to read these pages, and the interactive parts (timer, mark done) sit around the content, not inside it. The engineer chose a hand written splitter with no remark dependency; this keeps that choice, with the splitter now cutting rendered HTML instead of source lines. Rewriting on rendered HTML is safe because the renderer writes every attribute quoted and escapes code text, so only real `<a>` and `<img>` tags can match.

The engineer chose "everything is a topic except an exclude list" over an include list: a new upstream section shows up automatically, and an unwanted one costs a one line addition to the list.
