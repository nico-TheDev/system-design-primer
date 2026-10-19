# Verify: content pipeline · spec 0003 · updated 2026-10-19
_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Run from `app/` with `pnpm dev` (the port is pinned to 4321; use `--port` if something else holds it). Upstream edits in the steps below are temporary: revert them with `git checkout -- README.md solutions/` afterwards.

## UI / manual
- [ ] Open `/dev/content` → heading says `24 topics, 14 exercises`; topics list in this order: start here, the 15 index topics in README order, interview approach, study guide, six appendix items → AC-1, AC-2
- [ ] Check that none of Motivation, Anki flashcards, Contributing, Index of system design topics, the two exercise list sections, Under development, Credits, Contact info, License appears as a topic → AC-1
- [ ] Open the first appendix topic → it starts with the text that sits between `## Appendix` and its first `###` → AC-2
- [ ] Exercises list system design first (pastebin, twitter, web_crawler, mint, social_graph, query_cache, sales_rank, scaling_aws), then object oriented (hash_table, lru_cache, call_center, deck_of_cards, parking_lot, online_chat); `template` is absent → AC-3
- [ ] Open `pastebin`: Problem keeps Step 1 (constraints and usage math); solution sections are Step 2, Step 3, Step 4, Additional talking points → AC-4
- [ ] Open `lru_cache`: Problem is the constraints; one `Solution` section with highlighted Python blocks and no cell outputs → AC-4
- [ ] Open `scaling_aws`: repeated "Assumptions" and "Goals" headings get distinct ids, and each section anchor jumps to its section → AC-4
- [ ] In a README code sample that contains a `## ` line (bash example), confirm it did not start a new topic → AC-1, AC-4
- [ ] A README image written as a raw `<img src="images/...">` tag shows; an imgur image whose id exists in `images/` loads from `/repo-images/images/...` with the network off; one without a local copy keeps its imgur URL → AC-5
- [ ] In a topic, a `#cache` link goes to `/topics/cache/`, `#cache-aside` goes to `/topics/cache/#cache-aside`, `#contributing` goes to the upstream GitHub URL → AC-6
- [ ] In an exercise, an absolute `https://github.com/donnemartin/system-design-primer#...` link opens the matching topic; a relative `../scaling_aws/README.md` style link opens `/exercises/scaling_aws/` → AC-6
- [ ] Temporarily rename `## Step 2` in one exercise → it shows as a whole page (`whole page` in the summary), a warning is logged, the other exercises are unchanged → AC-8
- [ ] Temporarily break one notebook (invalid JSON) → it is skipped with an error log, 13 exercises remain → AC-8
- [ ] With the dev server running, append a `## New section` to `README.md` → it appears as a topic within a few seconds with no restart; add or remove an exercise folder and check it follows → AC-7

## Commands
- [ ] `curl -i localhost:4321/repo-images/images/<an existing png>` → 200, `content-security-policy: sandbox; default-src 'none'`, `x-content-type-options: nosniff` → AC-9
- [ ] `curl --path-as-is localhost:4321/repo-images/../README.md`, and `%2e%2e/README.md`, `%252e%252e/README.md`, `docs/specs/...`, `images/x.md`, `solutions/system_design/pastebin/README.md` → all 404 → AC-9
- [ ] Upper case `.PNG` under `images/` → 200; a symlink in `images/` that points outside → 404 (remove both afterwards) → AC-9
- [ ] Watch the dev log after a change → one line like `content: 24 topics, 14 exercises, 1 warnings` plus one line per warning; the known warning today is the broken upstream anchor `#latency-numbers-every-programmer-should-know%3E1` → AC-10
- [ ] `git status` after a full run → changes only under `app/` and `docs/` → AC-11
- [ ] `pnpm build` → succeeds with both collections; `/dev/content` returns 404 from the built server → AC-12
- [ ] `pnpm check` → format, lint and typecheck pass → AC-12

## Value sourcing (one step per row of the spec table)
- [ ] Topic `id` and `title` equal the heading `id` and text in the rendered README (compare a repeated title such as "Source(s) and further reading" ids on one topic page) → AC-2
- [ ] Topic `kind`: only the three marker slugs get `start-here`, `interview-approach`, `study-guide`; every `###` under Appendix is `appendix`; the rest are `topic` → AC-2
- [ ] Topic `order`: interview approach comes before study guide even though the README order is the other way round → AC-2
- [ ] Topic `headings` list only sub headings inside that topic, and each anchor exists on the page → AC-2
- [ ] Exercise `id` equals the folder name; `title` equals the first `h1`; remove the `h1` temporarily → title falls back to the folder name with a warning → AC-3, AC-8
- [ ] Exercise `order` follows the README tables: swap two rows in a table temporarily → the order changes; delete a row → the folder moves last with a warning → AC-3
- [ ] Split point: change `## Step 2` to `## step   2` (case and spacing) → still splits; change to `## Step 20` → whole page fallback → AC-4, AC-8
- [ ] Solution section `anchor` equals the heading `id` (`solution` for notebooks, `full-page` for the fallback) → AC-4
- [ ] Relative link or image: a link from one exercise to another resolves against the source file's folder; an image path that does not exist keeps its `/repo-images/` URL and logs one warning → AC-5, AC-6
- [ ] imgur rewrite: add a file named like a remote imgur id into `images/` temporarily → that image switches to the local URL on the next sync → AC-5
- [ ] `#slug` inside an exercise that matches a heading of the same exercise stays `#slug`; a slug that matches nothing is left as written with one warning per distinct target → AC-6
- [ ] Serve an image: content type follows the extension (`.jpg` → `image/jpeg`, `.svg` → `image/svg+xml`) → AC-9
- [ ] Log summary counts equal the numbers shown on `/dev/content` → AC-10

## Acceptance-criteria coverage
- AC-1 … covered by steps 1, 2, 8 · AC-2 … 1, 3, Value sourcing topic rows · AC-3 … 4, exercise order and id rows · AC-4 … 5, 6, 7, 8, split rows · AC-5 … 9, imgur and image rows · AC-6 … 10, 11, link rows · AC-7 … last UI step · AC-8 … fallback, broken notebook, title and split rows · AC-9 … the four endpoint commands · AC-10 … log line step and summary row · AC-11 … `git status` step · AC-12 … `pnpm build` and `pnpm check`
