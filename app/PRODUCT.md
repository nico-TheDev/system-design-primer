# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing: Astro 7 (server output, Node adapter), React 19 islands, Tailwind CSS 4 via `@tailwindcss/vite`, SQLite with Drizzle. See `docs/specs/0001-stack-and-architecture/index.md`.

## Users

One person, the owner of this repo, studying system design for interviews and for craft. Sessions are long: reading multi page articles, working exercises against a timer, reviewing flashcards. It runs on their own machine at localhost. They use it both in daylight and in the evening, so the theme follows the operating system.

## Product Purpose

Turn the long README, the solved exercises, and the Anki decks of the System Design Primer into a guided path with progress tracking, practice mode, flashcards, and search. Success is that the owner opens this instead of scrolling the README, and keeps coming back daily.

## Positioning

A private study companion built on the primer's own markdown. It reads the repo in place, so upstream updates show up with no copying, and it keeps your progress, which the README cannot.

## Operating Context

Content is markdown with long prose, tables, code blocks, and many diagrams (images in `images/` and `solutions/`). Study modes are reading, timed exercise practice with the solution hidden, and spaced repetition review. A floating study assistant is planned for a later release.

## Capabilities and Constraints

- The app never edits upstream content; it only reads it.
- Interactive parts are small React islands; most pages are static Astro and ship almost no JavaScript.
- Theme values must live as CSS variables under Tailwind's `@theme` (spec 0001 invariant), never hard coded per component.
- Light and dark themes are both required and follow the system setting.
- Undecided: visual identity (decided in spec 0004).

## Brand Commitments

None. No name, logo, or voice has been set. "System Design Primer" belongs to the upstream project.

## Evidence on Hand

Real content: `README.md`, `solutions/`, `images/`, `resources/flash_cards/`. No screenshots, mockups, or design tool files exist. There is no user research; the only user is the owner.

## Product Principles

1. Reading comes first: long articles, diagrams, tables, and code must be comfortable for an hour.
2. Quiet over loud: no gamification, no celebration noise, no dashboards that compete with the material.
3. The material is the hero: the interface frames the primer's content and never competes with it.
4. Same on every visit: predictable structure, so the owner stops noticing the tool.

## Accessibility & Inclusion

Keyboard operable base components, visible focus, readable contrast in both themes, and respect for the system reduced motion setting. No further product specific requirement was stated.
