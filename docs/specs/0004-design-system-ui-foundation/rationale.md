# 0004. Rationale: Typeset Reference design system and UI foundation

Build spec: [index.md](index.md)

## Context

> ⚠️ Premise note: warm paper with a book serif is the look most generated interfaces in this category land on, and it can read as generic. You chose it knowingly after seeing it flagged, so the spec keeps it and pins the specific details (chapter numbers, dotted leaders, numbered figures, margin ticks, hairlines only) that make it this app rather than any docs theme. A build that skips those details defeats the choice.

The study app has two color tokens and no real look. Spec 0001 chose Astro, Tailwind 4, React islands, and left the visual design to this feature. Every later feature (guided path, progress, practice mode, flashcards, search, assistant) depends on it, so a missing design system means each one invents its own spacing, colors, and components.

The main use is long reading. Sessions run for an hour, and the material is the primer's own markdown: long prose, tables, code blocks, and many diagrams drawn as PNGs on white. The owner studies in daylight and in the evening, so both themes are required. The product principles are reading first, quiet over loud, and the material as the hero. The owner named gamified or loud as the thing that would feel wrong.

Technical forces: theme values must be CSS variables under Tailwind's `@theme` (spec 0001), most pages are static Astro with almost no JavaScript, content and images come from outside the project root through a custom loader, and the only user is on localhost, so there is no need for brand work, marketing pages, or cross browser legacy support beyond current evergreen browsers.

No design file, screenshot, or design tool was available, so Impeccable proposed the direction from `app/PRODUCT.md`.

## Options considered

### Option 1: The Operations Manual

Study as an airline operations manual: chapter edge tabs, the path as checklist rows, an amber "you are here" flag, NOTE and CAUTION callouts, and a sign off block at each chapter's end. This was the direction the Impeccable roll assigned.

**Pros**:
- Strong fit for a guided path that gets harder; checklists map directly to progress.
- Distinctive and clearly not a docs theme.

**Cons**:
- Can feel clerical, and small caps labels pile up.
- The reading pages must still be plain prose, so the identity lives mostly on the home page and the path.

### Option 2: The Typeset Reference

A well set technical book: warm neutral paper, deep ink, one ink blue accent, contents with leaders, numbered figures, margin notes.

**Pros**:
- Best fit for an hour of reading; the interface frames the content instead of competing with it.
- Few moving parts: hairlines and type do the work, which suits a hand written token layer and near zero JavaScript.
- Matches the quiet principle with no extra effort.

**Cons**:
- The most familiar look in the category, so identity depends on disciplined details.
- Less visual help for showing progress than a checklist style.

### Option 3: The Practice Sampler

Chapters as stitched bands in order of difficulty on a linen ground, signed and dated at the foot.

**Pros**:
- Clear difficulty ordering and a memorable idea.

**Cons**:
- Weak identification with an engineering audience and a playful tone against the quiet brief.
- A textile skin around diagrams and code is the highest effort and the hardest to keep readable.

### Option 4: Clean docs theme

Sidebar, article, table of contents, system fonts, neutral palette, executed well.

**Pros**:
- Least risk and least work; users know it instantly.

**Cons**:
- Indistinguishable from every other docs site, which the owner did not want.

## Rationale

The Typeset Reference was chosen over the roll's assignment because the dominant force is long form reading, where it is strongest, and the owner picked it with the genericness risk stated. The Operations Manual would give the path more character, but it adds visual structure to exactly the pages (articles) that need the least. Its best ideas were not lost: the "where you stopped" marker and chapter completion fit later features (path, progress) as small additions inside this system without changing it.

The foundation stays small on purpose. One user, local only, three font families, native HTML for drawer, dialog, and disclosure, with Tabs and Tooltip deferred until a feature needs them, keeps the tool invisible, which is principle four. The old scaffold tokens are replaced because they carried no meaning beyond a white page.

Decisions I made as the architect (RECOMMEND items), each with its runner up:

- **Token mechanism**: CSS variables with `light-dark()` plus `color-scheme`, mapped to Tailwind with `@theme inline`. Pick because one set of values serves system, light, and dark with no duplication. Runner up: a `.dark` class with duplicated values, which doubles every color and needs more JavaScript.
- **Palette values**: warm neutral paper and charcoal, ink blue accent, with separate caution and done colors. Picked for contrast headroom (AA with margin) and because blue on paper is the book convention. Runner up: a green accent, rejected because green is also the done color.
- **Plate in dark mode**: figures on a near white `plate` in both themes. Pick because the primer's diagrams are PNGs on white with colored shapes, and inversion distorts them. Runner up: a dimming filter, which still leaves a bright box and softens thin lines.
- **Type scale**: fixed rem sizes with a Major Third feel for headings (about 1.25 steps) and a 66ch measure at 18px. Pick because a fixed scale is predictable on one machine. Runner up: fluid `clamp()` sizes, which add testing for little gain here.
- **Small caps and tracking**: limited to the running head and table headers. Pick to avoid the tracked label habit that makes interfaces look generated. Runner up: use on all labels, rejected as noise.
- **Radius and elevation**: 2px and 4px, no shadows except dialog and tooltip. Pick because a printed book has none. Runner up: 6 to 8px radius, rejected as the generic app look.
- **Components in `.astro` where possible**: pick because static components ship zero JavaScript (AC-13). Runner up: all components in React, rejected as extra hydration on reading pages.
- **Theme control as a small inline script, not React**: pick for the same reason. Runner up: a React island, rejected as unnecessary weight on every page.
- **Drawer as native `<dialog>`**: pick for built in focus trap and Esc. Runner up: a custom off canvas panel, which needs hand written focus management.
- **Shiki themes `github-light` and `github-dark-dimmed`**: pick as a known pairing with good coverage of languages in the primer. Runner up: a custom theme from tokens, deferred until contrast checks show the stock pair needs too many overrides.
- **`/design` page kept in the app**: pick because it is the cheapest way to verify both themes and every component. Runner up: a separate Storybook, rejected as heavy tooling for one person.
- **Motion**: fades of 120ms only. Pick because the brief asks for quiet. Runner up: Astro view transitions, deferred; they can be added later without changing the tokens.
- **Accessibility bar**: WCAG 2.2 AA, as you chose. Runner up: AAA text contrast, which would constrain the palette more than reading comfort needs.

Choices you made directly: design source (no design yet, Impeccable suggests), themes follow the system with a manual override, avoid gamified or loud, Astro Fonts API, Literata, Hanken Grotesk, JetBrains Mono, Shiki dual themes, hand written prose styles, contents sidebar with margin notes, diagrams on a light plate, the full component set, near still motion, native HTML first, with Radix for tabs and tooltip later when a feature needs them (the cross check showed neither has a user yet). No References section and no Agent Skill search were requested.

## Impeccable record

- Mode: Read for article pages, Operate for the shell and components.
- Seven grounded candidates, ordered by resonance: typeset engineering reference book, architecture drawing set, transit system map, whiteboard, Unix man page, index card deck, airline operations manual. The roll assigned the seventh (Operations Manual). You chose the top ranked one, shown as Impeccable's pick.
- Challengers judged: Practice Sampler (competitive, clear path but weak audience fit), Cutting Bench Select Rail, Cracktro Scroller Queue, Zoo Gardens Guide Map, Cloud Quarry, Mesophotic Deep Dive (declined for long reading). Kept from the declined: the folded "where you stopped" flag and the chapter sign off, for later features.
- Build path: code led, since no image generation tool is available here.

## Cross check

A read only pass on a different model found 14 decision gaps and 10 soundness points. All were applied on your pick: fonts setup and variable names, fallback stacks, no copy button, invoker attributes for the dialog, drawer details, data shapes for nav and figures, a margin note component, Shiki overrides through one shared module, a named contrast script, side by side themes on `/design`, a sticky header and skip target, and stricter token enforcement. Tabs, Tooltip, and the Radix dependency were deferred. Dark mode `rule-strong` and `ink-faint` were lightened to pass contrast on the raised paper.
