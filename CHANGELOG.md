# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This covers the personal study app in `app/`. The upstream System Design Primer content is not changed.

## [Unreleased]

### Added
- A local study app in `app/`: an Astro website with React islands and a SQLite file for your own data. It runs only on your computer and starts with `pnpm dev` (see spec 0001).
- Checks for the app code: Prettier for format, ESLint for lint, and `astro check` for types, all run by `pnpm check`. Lint also enforces the import rules between server code and browser code (see spec 0002).
- A content pipeline that reads `README.md` and `solutions/` in place and turns them into 24 study topics and 14 exercises, each exercise split into a problem and a solution. Links between topics and the repo's images work inside the app, and edits to the markdown show up without a restart (see spec 0003).
- A design system called Typeset Reference: warm paper and ink colors, a book serif for articles, light, dark and system themes, and base components such as buttons, callouts, figures, tables, code blocks and dialogs. A `/design` page shows them, and a contrast script checks the colors (see spec 0004, `app/DESIGN.md`).
- A guided study path: a home page with the topics in the primer's recommended order and a Start button, a topic reader with previous and next links and an "On this page" list, an exercise list, and an exercise reader, plus a labelled sidebar on every page (see spec 0005).
- Progress tracking: a Done button on each topic and exercise page, done marks on path rows and in the sidebar, and a home page summary with counts for topics and exercises. Marks are saved in SQLite and stay after you close the app (see spec 0006).

### Changed
- Nothing in the upstream files. `README*.md`, `solutions/`, `resources/` and `images/` are read but never edited.

## Where each spec stands

| Spec | Feature | Status |
|---|---|---|
| 0001 | Stack and architecture | Accepted |
| 0002 | Coding standards and tooling | Accepted |
| 0003 | Content pipeline | Accepted |
| 0004 | Design system and UI foundation | In Progress, built, `/check verify` not run yet |
| 0005 | Guided study path | In Progress, built, `/check verify` not run yet |
| 0006 | Progress tracking | In Progress, built, `/check verify` not run yet |
| 0007 | Exercise practice mode | Proposed, designed only, nothing built |

Not started yet: flashcards, topic quizzes, search and the floating study assistant.
