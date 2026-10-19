# Verify: guided study path · spec 0005 · updated 2026-10-19
_Steps derived from spec 0005 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Open `/` → 24 rows numbered 1 to 24 under Start here, Topics, Interview approach, Study guide, Appendix; Start button goes to topic 1; "Short on time?" line links to the study guide; link below the list opens `/exercises/` → AC-1
- [ ] Press Start, then follow Next to the last topic → every page shows previous and next with number and title, first topic has no previous, last topic's next reads "Exercises" and lands on `/exercises/` → AC-3
- [ ] Open `/topics/cache/` → one `h1`, running head reads `13 · Cache`, first body heading level is `h2`, anchors from "On this page" jump to their heading → AC-2, AC-4
- [ ] Open an appendix topic (`/topics/powers-of-two-table/`) → body headings start at `h2` (shift of 2), ids unchanged → AC-2
- [ ] On any page check the sidebar and, below 1024px, the drawer → five labelled topic groups then the two exercise groups, current page has `aria-current="page"` → AC-5
- [ ] Open `/exercises/` → two groups, numbered 1 to 14, each row opens its exercise → AC-6
- [ ] Open `/exercises/pastebin/` → one `h1`, problem first, then a "Solution" label and one visible `h2` per solution section, "On this page" lists problem and solution headings, pager has All exercises → AC-7
- [ ] Open an exercise with `split` false, if one exists → whole page, no "Solution" label and no extra `h2` → AC-7
- [ ] Open `/topics/not-a-topic/` and `/exercises/nope/` → 404 page with a link back to `/`, no error → AC-8
- [ ] Temporarily make the topics collection empty (for example point the pipeline at an empty README in a scratch copy) → home shows "No study content found. Check that README.md is in the repository root." and no Start button; sidebar shows only exercise groups → AC-9
- [ ] With `pnpm dev` running, rename a topic heading in a scratch copy of the README and reload → new title in list, sidebar and page, no restart → AC-10
- [ ] Check each page `<title>` → `<page title> · System Design Study`, home is `System Design Study` → AC-10
- [ ] At 360px and desktop width, in light and dark → no horizontal scroll, drawer opens and closes, every link and pager button reachable with Tab → AC-5, AC-11
- [ ] Search the new files for hex colors, shadows and new fonts → none → AC-11

## Value sourcing
- [ ] Rename or reorder a topic in a scratch README → home order, numbers, sidebar, pager and running head all change together (one source: `order`) → AC-1, AC-3, AC-5
- [ ] Remove the study guide topic in a scratch README → the "Short on time?" line disappears → AC-1
- [ ] Open an appendix topic and a normal topic → shift is 2 and 1 respectively, and "On this page" matches the shifted headings → AC-2, AC-4

## Commands
- [ ] `pnpm check` (in `app/`) → passes → AC-12
- [ ] `pnpm build` (in `app/`) → passes → AC-12

## Acceptance-criteria coverage
- AC-1 … steps 1, value sourcing 1 and 2 · AC-2 … steps 3 and 4 · AC-3 … step 2 · AC-4 … step 3 · AC-5 … step 5 · AC-6 … step 6 · AC-7 … steps 7 and 8 · AC-8 … step 9 · AC-9 … step 10 · AC-10 … steps 11 and 12 · AC-11 … steps 13 and 14 · AC-12 … commands
