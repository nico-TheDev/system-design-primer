# Design system: Typeset Reference

The study app looks like a well set technical book: warm paper, deep ink, one ink blue accent. Spec: [0004](../docs/specs/0004-design-system-ui-foundation/index.md). Token values live in `src/styles/tokens.css`, never here. See them all on the `/design` page.

## Character

Calm and quiet. Long reading sessions in daylight or evening. Separation comes from hairline rules and a raised paper tone. No shadows (except dialog), gradients, glass, or rounded pills.

## Build mandate

- Every color, font, radius and layout size comes from a token. No hex or raw font name outside `tokens.css`, `global.css` (and the Shiki patch table in `src/lib/shiki.ts`).
- Dark values come only from `light-dark()` in `tokens.css`. Tailwind's `dark:` variant and default palette are not used.
- Three fonts only: Literata (reading), Hanken Grotesk (interface), JetBrains Mono (code).
- Accent is for links, focus, current location, figure numbers, the Note callout, and primary buttons.
- Color is never the only signal. Callouts show a label word, done shows a mark and text.
- Native HTML does the interactive work (`dialog`, `details`, `button`). A custom widget needs a spec decision.
- Motion is fades and color changes of 120ms, removed under `prefers-reduced-motion`.

## Tokens

| Group | Names |
|---|---|
| Surfaces | `paper`, `paper-raised`, `plate` (light in both themes, for diagrams) |
| Text | `ink`, `ink-soft`, `ink-faint` |
| Lines | `rule` (decorative), `rule-strong` (control borders, at least 3:1) |
| Meaning | `accent`, `accent-wash`, `caution`, `done`, `on-accent` (primary button text) |
| Overlay | `scrim`, `shadow-color` |
| Layout | `--measure` 66ch, `--sidebar-w`, `--margin-w`, `--gutter`, `--header-h`, `--control-h` (40px) |
| Motion | `--duration-fast`, `--ease` |
| Radius | 2px controls and code, 4px dialog and figure plate |

Tailwind utilities exist for colors (`bg-paper`, `text-ink`) and fonts (`font-serif`, `font-sans`, `font-mono`).

## Type

Reading body Literata 18px on 1.65, measure 66ch. Headings Literata 600 (h1 36px, h2 26px, h3 21px, h4 18px). Interface text Hanken Grotesk 15px. Running head and table headers: 13px, 600, uppercase, tracked 0.08em (the only tracked small caps). Code JetBrains Mono 14px on 1.55, highlighted by Shiki through `src/lib/shiki.ts` (light and dark themes, per scope colors patched to pass contrast).

## Layout

`Shell.astro`: sticky header (running head, theme control, drawer button), contents sidebar from 1024px, margin column from 1280px holding "On this page" and margin notes. Below 1024px the contents open in a native `dialog` drawer (Esc, backdrop, link choice and growing the window close it; focus returns to the button). Below 1280px "On this page" is a disclosure and margin notes sit inline. Skip link is the first focusable element. Pages pass `nav`, `headings`, `runningHead`.

## Components (`src/components/ui/`)

Button (primary, secondary, ghost), IconButton, Icon, Checkbox, Callout (note, caution), Figure (plate, numbered caption, CSS counter), TableWrap, CodeBlock, Disclosure, Dialog (invoker `commandfor`, no script), MarginNote, ThemeControl (System, Light, Dark; stored in `localStorage` key `theme`). Reading styles for markdown live in `src/styles/prose.css` under `.prose-ref`.

## Do's and don'ts

- Do use `/design` to check any new component in both themes.
- Do keep reading pages script free. Interactive pieces are small scripts or React islands with `client:visible`.
- Don't add shadows, gradients, pills, or a fourth font.
- Don't use the accent as decoration.
- Don't hard code a color, even once.
