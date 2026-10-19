# 0004. Typeset Reference design system and UI foundation

**Date**: 2026-10-19
**Status**: Accepted

## Summary

The study app will look and feel like a well set technical book: warm paper, deep ink, one ink blue accent, a book serif for articles, and a quiet sans for buttons and labels. Light and dark themes both ship, follow your computer's setting by default, and can be switched by hand. This spec fixes the colors, fonts, spacing, page layout, reading styles, and the base components (buttons, callouts, figures, tables, code blocks, tabs, dialogs) so every later feature looks consistent and nobody has to invent a style mid build.

## Requirements

**User stories**:
- As the owner studying for an hour, I want long articles, diagrams, tables, and code to be comfortable to read so that I can focus on the material and not the tool.
- As the owner, I want the app to match my computer's light or dark setting, with a manual override, so that it suits daylight and evenings.
- As the builder of later features, I want named tokens and ready base components so that new screens look consistent without new design decisions.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: `app/DESIGN.md` exists and documents the type, color, spacing, layout, motion, and base components defined in this spec, matching the built tokens.
- **AC-2**: The app follows the operating system theme by default. A three state control (System, Light, Dark) overrides it, the choice survives reload and restart, and no flash of the wrong theme appears on first paint.
- **AC-3**: In both themes, all text meets WCAG 2.2 AA contrast (4.5:1 for body text, 3:1 for large text, borders of controls, and focus rings), checked by the contrast script (build step 11) over a fixed list of token pairs (ink, soft ink, faint ink, accent, caution, done on paper and paper raised; strong rule on paper raised; ink on accent wash; primary button text on accent; focus ring on both papers) and over Shiki code colors against the paper raised code background.
- **AC-4**: A long sample article (at least 3,000 words with headings, lists, a blockquote, a table, inline code, and images) renders with a 66ch measure, 18px Literata at 1.65 line height, one h1 and no skipped heading levels sized as in the type table, and no horizontal page scroll from 360px to 1920px wide.
- **AC-5**: Code blocks use JetBrains Mono, highlight through Shiki with a light and a dark theme that switch with the app theme (no extra JavaScript), and a long line scrolls inside the block, which is reachable and scrollable by keyboard.
- **AC-6**: A figure shows its image on a light plate with a numbered caption in both themes. The image never exceeds the column width.
- **AC-7**: The shell shows contents sidebar, article, and margin column at 1280px and wider; sidebar and article between 1024px and 1279px with margin notes inline; and a contents drawer below 1024px that opens by button, closes with Esc and on link choice, and returns focus to the button. A skip to content link is the first focusable element.
- **AC-8**: Every base component (button, link, icon button, checkbox, callout, figure, table, code block, disclosure, dialog, margin note) works with keyboard alone and shows a visible focus ring. Dialog traps focus, closes on Esc, and returns focus to its trigger.
- **AC-9**: Motion is limited to fades and focus transitions of 150ms or less, including the drawer and dialog, and all of it is removed under `prefers-reduced-motion: reduce`.
- **AC-10**: Every color, font, radius, and layout size used by components comes from a token; a search of `app/src` outside `styles/tokens.css` and `styles/global.css` finds no hex color or raw font name, Tailwind's default palette is disabled, and inline icons use `currentColor`.
- **AC-11**: After one successful build, the app shows the correct fonts with the network off, and on a production build (`pnpm build` then `pnpm preview`, cache off) the cumulative layout shift on the sample article is below 0.01.
- **AC-12**: A `/design` page shows every token and every base component in light and dark side by side, and doubles as the visual check for the rest of the build.
- **AC-13**: On a production build, a page that only reads content ships no React code; the only scripts on it are the theme boot script, the theme control, and the drawer handler.

## Decision

**Chosen option**: Option 2: The Typeset Reference

Build one hand written token and component layer on Astro, Tailwind 4, and native HTML, in the Typeset Reference direction: warm neutral paper, deep ink, one ink blue accent, Literata for reading, Hanken Grotesk for interface text, JetBrains Mono for code, with light and dark themes driven by CSS variables.

**Impeccable direction**: seed key `b6c8341e`, kind `pick`, mode Read, code led build path (no image generation on this machine). `app/PRODUCT.md` holds the product record. At build time `/develop` records the direction contract in the surface brief and `app/DESIGN.md` is written by Impeccable's documenter at finish.

**Distinguishing details** (the look must not collapse into generic warm paper plus serif; these are the parts that make it this app):
- Chapter and section numbers (1, 1.3) set as the book does, in tabular figures, in the contents sidebar and running head.
- Contents page with dotted leaders and a resume line, not a card grid.
- Figures numbered with a CSS counter in the accent color, captions below a hairline.
- Margin notes marked by a short hairline tick, set in the sans.
- Tracked small caps only for the running head and table headers, nowhere else.
- No shadows, gradients, glass, or rounded pills; separation is by hairline rules and a raised paper tone.

## Design system

**Data model**: none. No database change. The theme choice is a per device display preference stored in `localStorage` under the key `theme` with the values `system`, `light`, or `dark` (absent means `system`). This is the one named exception to spec 0001's rule that every state change goes through an Astro Action, because it is not study data and must apply before the page paints.

**Token architecture** (Tailwind 4 and CSS only, no JavaScript framework):
- `app/src/styles/tokens.css`: semantic variables on `:root` using `light-dark()`, with `:root { color-scheme: light dark; }`, `:root[data-theme="light"] { color-scheme: light; }`, `:root[data-theme="dark"] { color-scheme: dark; }`. This is how the manual override works with no duplicated values.
- `app/src/styles/global.css`: imports Tailwind, imports `tokens.css`, sets `--color-*: initial;` inside `@theme` so Tailwind's default palette is removed, maps variables into `@theme inline { --color-paper: var(--paper); ... }` so utilities like `bg-paper` and `text-ink` exist, then imports `prose.css`.
- Tailwind's `dark:` variant follows the OS and ignores `data-theme`, so it is banned. Dark values come only from `light-dark()` in the tokens.
- `Base.astro` also sets `<meta name="color-scheme" content="light dark">` so the first paint is correct.
- `app/src/styles/prose.css`: the article stylesheet, scoped to the `.prose-ref` class, written on tokens.
- The scaffold tokens `--color-surface` and `--color-ink` are replaced by the names below; `Base.astro` is updated to match.

**Color tokens** (hex values below are the tuned pair `light / dark`; contrast ratios are against the paper of the same theme and must be checked again at build, AC-3):

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#f5f2ea` | `#1b1a18` | Page background |
| `paper-raised` | `#fbf9f4` | `#242320` | Sidebar, code background, callouts, dialog |
| `plate` | `#fdfcf8` | `#f7f5ee` | Diagram frame, light in both themes |
| `ink` | `#1f1d1a` | `#e9e5da` | Body text and headings (about 15:1 / 13:1) |
| `ink-soft` | `#4a463f` | `#bdb8aa` | Secondary text (about 8:1 / 9:1) |
| `ink-faint` | `#6b665c` | `#9a9588` | Captions, meta (at least 4.5:1, also on paper raised) |
| `rule` | `#d9d3c6` | `#34322e` | Hairlines and dividers (decorative only) |
| `rule-strong` | `#8f897b` | `#7a7569` | Control borders (at least 3:1, also on paper raised) |
| `scrim` | `rgb(20 18 16 / 0.5)` | `rgb(0 0 0 / 0.6)` | Dialog and drawer backdrop, dark in both themes |
| `accent` | `#2d4a8a` | `#8fa9e6` | Links, focus ring, current location, figure numbers, Note callout (about 7.7:1 / 7:1) |
| `accent-wash` | `#e3e8f3` | `#262c3d` | Hover, current row, selected tab |
| `caution` | `#8a4b12` | `#d9a05b` | Caution callout, warnings (about 6:1) |
| `done` | `#2f6b4a` | `#7fbf9a` | Completed marks (about 5.7:1) |

Rules: color is never the only carrier of meaning (done shows a check mark and text, callouts show a label word). The accent is used only for links, focus, current location, figure numbers, the Note callout, and primary buttons.

**Type tokens** (loaded by the Astro Fonts API, see Fonts below):

| Role | Face | Size / line height | Weight | Notes |
|---|---|---|---|---|
| Reading body | Literata | 1.125rem / 1.65 | 400 | Measure `66ch`, optical sizing auto |
| h1 | Literata | 2.25rem / 1.15 | 600 | Letter spacing -0.01em |
| h2 | Literata | 1.625rem / 1.25 | 600 | 2.25em space above, 0.6em below |
| h3 | Literata | 1.3125rem / 1.3 | 600 | 1.75em above |
| h4 | Literata | 1.125rem / 1.4 | 600 | |
| Interface text | Hanken Grotesk | 0.9375rem / 1.4 | 400, 500, 600 | Nav, buttons, labels, captions |
| Running head, table header | Hanken Grotesk | 0.8125rem / 1.3 | 600 | Uppercase, tracking 0.08em, tabular figures |
| Code block | JetBrains Mono | 0.875rem / 1.55 | 400 | |
| Inline code | JetBrains Mono | 0.9em | 400 | `paper-raised` background, 1px `rule`, 2px radius |

Fallback stacks (each ends in a generic family so Astro can generate metric matched fallbacks): Literata falls back to `Georgia, serif`, Hanken Grotesk to `system-ui, sans-serif`, JetBrains Mono to `ui-monospace, monospace`.

**Fonts** (Astro built in Fonts API, configured in `astro.config.mjs`): provider `fontProviders.fontsource()`, subset `latin`, variable weight ranges (Literata 400 to 700 in normal and italic, since prose uses emphasis; Hanken Grotesk 400 to 600 normal; JetBrains Mono 400 normal). Name the Astro variables `--font-literata`, `--font-hanken`, `--font-jetbrains`, render `<Font>` for each in `Base.astro` (preload Literata and Hanken Grotesk only), and map them in `global.css` to Tailwind's `--font-serif`, `--font-sans`, `--font-mono`. The names differ on purpose; reusing the same name would make a variable point at itself. The API downloads and self hosts the files at build and generates the size matched fallbacks (AC-11). Check the exact option names against the Astro 7 docs during the build, since this API is newer than most of this stack. The first build needs network; later builds use the cache.

**Spacing, radius, motion, layout tokens**:
- Spacing: keep Tailwind's 4px scale (`--spacing: 0.25rem`). No custom scale.
- Radius: `--radius-sm: 2px` (controls, code, inline code), `--radius-md: 4px` (dialog, figure plate). Nothing larger, no pills.
- Elevation: none, except a single `0 8px 24px` low opacity shadow on dialog and tooltip.
- Motion: `--duration-fast: 120ms` with `ease-out`, used for fades and color changes only. Under `prefers-reduced-motion: reduce` durations are set to `0.01ms`.
- Focus ring: `outline: 2px solid var(--color-accent); outline-offset: 2px` on `:focus-visible`, for every focusable element.
- Touch and click targets: at least `2.5rem` (40px) for buttons, icon buttons, and checkbox hit areas.
- Layout: `--measure: 66ch`, `--sidebar-w: 16rem`, `--margin-w: 14rem`, `--gutter: clamp(1rem, 3vw, 2rem)`, `--header-h: 3.25rem`. Breakpoints use Tailwind defaults: `lg` (1024px) is the drawer threshold, `xl` (1280px) adds the margin column.

**Shell layout**:
- `layouts/Base.astro`: html shell, fonts, `color-scheme` meta, theme boot script, skip link. The boot script is `<script is:inline>` (so Astro does not defer it past first paint), wraps the `localStorage` read in try/catch, and sets `data-theme` only when the value is exactly `light` or `dark`.
- `layouts/Shell.astro`: sticky header (`--header-h`; headings get `scroll-margin-top: var(--header-h)`), containing the running head slot, the theme control at the right, and the drawer button below `lg`. Then the contents sidebar (`nav` prop), the article slot (`<main id="main" tabindex="-1">`, the skip link target), and the margin slot. Pages pass their navigation and headings in; the shell does not know about content (features 3 and 5 supply it).
- `nav` prop shape: `{ title: string; href: string; number?: string; children?: NavItem[] }[]`. Chapter and section numbers come from the content pipeline (feature 3); the shell only displays `number` when given.
- Margin column holds "On this page" (h2 and h3 only) and margin notes. Between `lg` and `xl`, "On this page" collapses into a disclosure at the top of the article and margin notes render inline after their paragraph as an indented block with the same tick.
- Drawer: native `<dialog>` below `lg`, opened with `showModal()` from a small handler script. It slides from the left at `--sidebar-w`, closes on Esc, backdrop click, or choosing a link, closes automatically if the window grows past `lg`, and returns focus to the drawer button.
- Contents page with dotted leaders and the resume line are built by feature 5 using this system; they are not part of this spec's acceptance criteria.

**Reading styles** (`.prose-ref` in `prose.css`):
- Paragraph spacing `1.1em`, list item gap `0.35em`, nested list indent `1.25em`, blockquote with a 2px `rule-strong` left border in `ink-soft`, horizontal rule as a hairline, links in `accent` with underline offset `0.2em`, `:visited` unchanged.
- Tables: hairline rules between rows only, header in the running head style, numeric columns right aligned with tabular figures, wrapped in a focusable `role="region"` with `tabindex="0"` and `aria-label` that scrolls horizontally inside the column when wide.
- Images and figures: see Figure below.
- Code: one module, `app/src/lib/shiki.ts`, exports the Shiki config used by `markdown.shikiConfig` in `astro.config.mjs` and by any `<Code>` component or the content loader (feature 3), so every code block is highlighted the same way. It uses `themes: { light, dark }` with `defaultColor: false`; the CSS sets `color: light-dark(var(--shiki-light), var(--shiki-dark))` and the block background to `paper-raised`. Starting themes: `github-light` and `github-dark-dimmed`. Contrast is measured against `paper-raised`. Where a scope fails (the dimmed comment color is known to), the module passes a copy of the theme JSON with that scope's color changed, since CSS cannot reach Shiki scopes once `defaultColor` is false. Switch to a fully custom theme only if more than a handful of scopes need changing.
- Code block label: Astro puts `data-language` on `<pre>`; CSS shows it as the language label through `::before`. There is no copy button in this foundation.

**Base components** (all `.astro` in `app/src/components/ui/`, no React; native HTML does the interactive work):

| Component | Built with | Behavior |
|---|---|---|
| Button | native `<button>` or `<a>` | Variants: primary (accent fill, paper text), secondary (1px `rule-strong`), ghost. One size, 40px high |
| Link | prose styles and `.astro` | Accent, underline, visible focus |
| IconButton | native `<button>` | 40px square, required `aria-label`, inline SVG icons using `currentColor` from a small local set |
| Checkbox | native `<input type="checkbox">` | Explicit 24px box (`accent-color` alone does not size it) inside a 40px hit area; label wired by `for`. Wiring to progress is feature 6 |
| Callout | `.astro` | Types Note (accent) and Caution (caution); label word shown, left hairline, `paper-raised` background |
| Figure | `.astro` | `<figure>`: image on a `plate` panel with 1px `rule`; `<figcaption>` outside the plate on `paper`, "Figure N." in accent (CSS counter that resets per `.prose-ref`), then the caption text. Caption comes from the image title, never the alt text. No caption means no number |
| Table | prose styles plus wrapper | As in reading styles |
| CodeBlock | prose styles on Shiki output | Language label from `data-language`; scroll region focusable |
| Disclosure | native `<details>` and `<summary>` | Styled marker, keyboard native |
| Dialog | native `<dialog>` | Opened by invoker attributes (`commandfor` and `command="show-modal"`), no script; backdrop uses the `scrim` token; title linked with `aria-labelledby` |
| MarginNote | `.astro` with a slot | Hairline tick, sans text; shown in the margin column at `xl`, inline below. The markdown syntax that produces it is decided in feature 3 |
| ThemeControl | `.astro` with a small script | Group of three buttons labelled System, Light, Dark with `aria-pressed`; a change in another tab is not synced |

**Dependencies to add**: none. Tabs and Tooltip are deferred until a feature needs them (practice mode or quizzes will decide); they would then use Radix primitives in a React island with `client:visible`. The Tailwind typography plugin is not used.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Theme boot script | Which theme to apply | `localStorage.theme`; absent or `system` means no `data-theme`, so `color-scheme: light dark` follows the OS |
| ThemeControl | Which button shows pressed | `localStorage.theme`, default `system` |
| Shell nav | Contents items and current page | `nav` prop from the page (content pipeline, feature 3); current item from `Astro.url.pathname` and `aria-current="page"` |
| Shell margin | "On this page" list | `headings` array that Astro returns when rendering markdown (feature 3 passes it in), filtered to depth 2 and 3 |
| Shell nav | Chapter and section numbers | `number` field on each `nav` item, supplied by the content pipeline (feature 3) |
| Figure | Caption text and figure number | `caption` prop taken from the markdown image title (feature 3 sets it; alt text stays separate); number from a CSS counter |
| Code block | Language label | `data-language` attribute Astro writes on `<pre>` |
| Dialog | Trigger and title | `commandfor` id on the trigger button; title text from the page's `aria-labelledby` heading |
| Callout | Label word | `type` prop: `note` shows "Note", `caution` shows "Caution" |
| Fonts | Font files | Astro Fonts API provider at build, cached on disk |
| Running head | Section title text | `runningHead` prop from the page |

**Key invariants**:
- No hex color, raw font name, or pixel size for layout in a component; only tokens (AC-10).
- Only three font families load: Literata, Hanken Grotesk, JetBrains Mono.
- Theme is applied only by `color-scheme` and an optional `data-theme` attribute on `<html>`; components never branch on theme in JavaScript.
- Radius is 2px or 4px. No shadows except dialog and tooltip. No gradients, blur, or glass.
- Accent usage is limited to the roles listed in the color rules.
- Color is never the only signal for state or meaning.
- Native HTML elements are used for every interactive component. A custom widget needs its own spec decision.
- Tailwind's default palette and its `dark:` variant are not used.
- The foundation adds no database tables, no Astro Actions, and no npm dependencies.

**Security model**: localhost only, as in spec 0001. The inline theme script reads one `localStorage` key and writes an attribute; it never injects content. No compliance scope.

**Configuration required**: none. No environment variables.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: open `/design` and a sample article in light and dark; read, switch theme, reload, theme persists, verifies **AC-2**, **AC-4**, **AC-12**
- Failure case: `localStorage` blocked or holds an unknown value; the app falls back to System with no error, verifies **AC-2**
- Failure case: network off after one build; fonts still render, verifies **AC-11**
- Keyboard: tab through the shell and every component, open and close the drawer and dialog, check focus returns to the trigger, verifies **AC-7**, **AC-8**
- Resize: open the drawer at 900px, widen the window to 1100px; the drawer closes, verifies **AC-7**
- Reduced motion: enable the OS setting; no transitions run, including drawer and dialog, verifies **AC-9**
- Token discipline: search `app/src` for hex colors and raw font names outside the two token files, verifies **AC-10**
- Wide content: a 200 line code line and a 12 column table at 360px width scroll inside their own block, verifies **AC-4**, **AC-5**
- Contrast: run the contrast check over every token pair and Shiki colors in both themes, verifies **AC-3**
- Reading page weight: on a production build, a plain article page has no React bundle in the network panel, verifies **AC-13**
- Layout shift: production build with the cache off, measure cumulative layout shift on the sample article, verifies **AC-11**

## Build plan

Ordered for the project's Skateboard approach: first the thinnest whole you can actually read in, then the rest of the parts.

1. Record the direction contract for this surface with Impeccable's `surface-brief write` (seed key `b6c8341e`, Typeset Reference) and keep `app/PRODUCT.md` as is, satisfies **AC-12** (the brief the build follows)
2. Add tokens: write `tokens.css`, update `global.css` with `--color-*: initial`, the `@theme inline` mappings, and the font variable mapping, replace the scaffold tokens, satisfies **AC-3**, **AC-10**
3. Configure the three fonts with the Astro Fonts API and render them in `Base.astro`, satisfies **AC-11**
4. Add the `color-scheme` meta, the inline theme boot script, `ThemeControl`, and the light, dark, and system behavior, satisfies **AC-2**, **AC-13**
5. Build `Shell.astro` with sticky header, sidebar, margin column, native dialog drawer, skip link, and running head, satisfies **AC-7**
6. Write `prose.css`, create the shared `app/src/lib/shiki.ts` config, and render a long sample article fixture (static file under `app/src/fixtures/`) in the shell; this is the first usable reading page, satisfies **AC-4**, **AC-5**
7. Build Figure, Callout, MarginNote, and the Table wrapper, satisfies **AC-6**, **AC-8**
8. Build Button, Link, IconButton, Checkbox, Disclosure, and Dialog, satisfies **AC-8**, **AC-9**
9. Build the `/design` page showing every token and component in light and dark side by side, with a fixture image, satisfies **AC-12**
10. Write the contrast script (a fixed list of token pairs plus Shiki colors for both themes) and run it, satisfies **AC-3**
11. Run the keyboard pass, resize pass, reduced motion pass, offline font check, layout shift and script checks on a production build, and Impeccable's detector once over the changed UI, then fix what they show in one batch, satisfies **AC-8**, **AC-9**, **AC-11**, **AC-13**
12. Write `app/DESIGN.md` (and `.impeccable/design.json`) from the built system with Impeccable's documenter, satisfies **AC-1**

## Consequences

**Positive**:
- One small set of tokens and components means every later feature (path, practice, flashcards, search, assistant) looks consistent without more design decisions.
- Reading pages stay almost script free, which keeps them fast and calm.
- Light and dark come from one set of variables, so there is no duplicated theme code.
- Native HTML for drawer, dialog, and disclosure keeps keyboard and focus behavior correct with little code.

**Negative / tradeoffs**:
- The Typeset Reference is the most familiar direction for this kind of content; the distinguishing details above carry the identity, and a careless build would read as a generic docs theme.
- Hand written prose styles take more upfront work than a typography plugin and must be maintained.
- The Astro Fonts API is new, so option names may differ from the sketch here, and the first build needs network access.
- Shiki's stock themes may fail contrast on a few token colors and need per scope overrides.
- Diagrams stay on a light plate in dark mode, so they are a bright rectangle in an otherwise dark page by design.
- Tabs and Tooltip are not in the foundation; the first feature that needs them adds them as a small extra decision.

**Neutral**:
- The old scaffold tokens `surface` and `ink` are renamed; only `Base.astro` and `index.astro` use them today.
- Theme preference lives in the browser, not SQLite, so it does not follow you to another browser.
- Lint, format, and test setup remain feature 2's job.

## Follow-up

- [ ] Content pipeline (feature 3) must render markdown with the shared Shiki config from `app/src/lib/shiki.ts` and pass `nav`, `headings`, and figure captions into the shell; record this in its spec.
- [ ] After the build, add the design rules to the root `AGENTS.md`: tokens only, three fonts, no shadows, accent roles (feature 2, `/audit`).
- [ ] Tabs and Tooltip are deferred. The feature that needs one (practice mode or quizzes) adds Radix primitives in a React island with `client:visible` and extends `/design`.
- [ ] The dotted leaders contents page, resume line, and chapter sign off are feature 5 and 6 work built on this system.
- [ ] Impeccable's detector is manual on this machine (no automatic hook); run it once at the end of the UI build, as step 11 says.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
