# Verify: flashcards from the Anki decks · spec 0008 · updated 2026-10-19
_Steps derived from spec 0008 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Open `/flashcards` on a fresh database → three decks listed with 42, 8 and 6 cards, "10 cards to review today", a Review all button and a Review link per deck → AC-1, AC-3, AC-6
- [ ] Start Review all → the front shows, no rating buttons, Space or Enter shows the answer, then four buttons labelled with intervals (for a new card about 1m, 6m, 10m, 8d) → AC-4
- [ ] Rate a new card Good, reload `/flashcards/review/` → that card is gone from the queue and the deck row shows one fewer new card → AC-5
- [ ] Rate a card Again → it returns in the same session after the others; when only a learning card due within 20 minutes remains it is shown instead of the done screen → AC-7
- [ ] Press Z (or the Undo button) right after a rating → the card is shown again first, Undo is disabled until the next rating; undo a first rating and the new card count goes back up → AC-8
- [ ] Rate every card in the session → "Done for today" with the next due time such as "tomorrow 22:57" → AC-7
- [ ] After a review, load the home page and any study page → sidebar Flashcards badge and the home line ("N cards to review today", or "Nothing due, next card ...") match the new state, and a screen reader reads "N cards to review today" for the badge → AC-9
- [ ] Complete a whole session with the keyboard only (Space, 1 to 4, Z) at phone width in light and dark themes → focus moves to the answer after reveal and to the next card after a rating, no sideways scroll, text readable → AC-11
- [ ] Open `/flashcards/review/?deck=nope` → the 404 page → AC-3
- [ ] Day boundary: change the computer clock to after 4 AM the next day → 10 new cards are offered again, and before 4 AM they are not → AC-6
- [ ] Two tabs: rate the same card in both → the last write wins, no error shown → AC-5, AC-10
- [ ] Vanished card: open a session, then remove that note's deck (scratch copy of the repo only, never the upstream file), rate the card → a clear message and the session moves on, its saved row stays in `card_state` → AC-10

## Commands
- [ ] `cd app && pnpm check` → format, lint and typecheck pass → AC-13
- [ ] `cd app && pnpm build` → builds and logs "flash cards: 56 cards in 3 decks" → AC-1, AC-12, AC-13
- [ ] Rate then undo through the Actions (POST `/_actions/rateCard/` and `/_actions/undoRating/` with JSON) → rate returns `logId`, undo of that id restores the row and a stale `logId` returns NOT_FOUND → AC-5, AC-8
- [ ] `sqlite3 data/study.db ".tables"` → `card_state` and `review_log` exist after the first start → AC-5
- [ ] Hostile deck (scratch repo): a note with `<script>`, `onclick`, `style`, `javascript:` link, `onerror` image and an anchor-link pilcrow → none appear in the review page props, unsafe links become plain text, the pilcrow is gone → AC-2
- [ ] Scratch repo with a deck holding a repeated guid and an empty front → both notes skipped with a warning in the log → AC-1
- [ ] Scratch repo, dev server running: corrupt one `.apkg` → error logged, that deck keeps its last cards, the others load; delete a deck file → the deck disappears; restore it → it returns, all without a restart → AC-12

## Acceptance-criteria coverage
- AC-1 … covered by steps 1, build, repeated guid · AC-2 … hostile deck · AC-3 … steps 1, 404 · AC-4 … step 2 · AC-5 … steps 3, two tabs, Actions, tables · AC-6 … steps 1, day boundary · AC-7 … steps 4, 6 · AC-8 … step 5, Actions · AC-9 … step 7 · AC-10 … two tabs, vanished card · AC-11 … step 8 · AC-12 … build, corrupt deck · AC-13 … check, build
