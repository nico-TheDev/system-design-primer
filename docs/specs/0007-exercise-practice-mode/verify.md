# Verify: Exercise practice mode · spec 0007 · updated 2026-10-19
_Steps derived from spec 0007 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Open an exercise at `/exercises/<id>/` → a "Practice" link sits directly under the title; `/exercises/` shows "Practice" on all 14 rows → AC-1
- [x] Open `/exercises/<id>/practice/` with no session → one `h1`, the four step titles line, "Attempts" with "No attempts yet.", and a "Start practice" button that works with JavaScript off → AC-2
- [x] Open `/exercises/nope/practice/` → the 404 page with a link home → AC-2
- [x] Rename `## Step 2` in one exercise folder's solution → its practice page shows "This exercise could not be split…" with a reader link and no Start button; undo the rename → AC-2
- [x] Press "Start practice" twice (second in another tab) → one open session at step 1, clock running, no duplicate → AC-3
- [x] View source of the practice page before Reveal → no "Solution" label, no solution section ids or text → AC-4, AC-7
- [x] Check page order with a session open → title, sticky timer bar (time, Pause, "Target 45:00"), step panel, problem, "Reveal solution", "Discard session"; scroll and the bar stays at the top → AC-4
- [x] Press Next to step 3, reload → "Step 3 of 4" still shows; Back is disabled on step 1 and Next on step 4; check the system design and an object oriented exercise use their own titles → AC-5
- [x] Watch the clock tick, press Pause, wait, reload, press Resume → time is frozen while paused, exact across the reload, shown as `m:ss` (and `h:mm:ss` from one hour) → AC-6
- [x] Let a session pass 45:00 (or set `elapsed_ms` near 45 minutes) → "Over target" shows next to the time → AC-6
- [x] Press "Reveal solution" → page reloads with a "Solution" label and one `h2` per section; stopwatch still running; Reveal button gone, "Finish practice" present; reload keeps it → AC-7
- [x] Press "Finish practice" → page shows no open session, the new attempt is first in "Attempts" (date like "19 Oct 2026" and a duration), "Practiced N times", and "Start practice" again → AC-8, AC-10
- [x] Press "Discard session" → text changes to "Discard this session? Your time is lost." with "Yes, discard" and "Cancel"; Cancel restores the button and focus; Yes deletes the session and reloads → AC-9
- [x] Open `/exercises/`, the sidebar and the drawer after a finished attempt → the row shows an icon and "Practiced" ("Practiced N times" above one); sidebar and drawer show the icon with hidden "Practiced"; "Resume practice" shows on rows with an open session → AC-1, AC-11
- [x] Open the home page → a third line "N of 14 exercises practiced" with a progress bar; marking an exercise done does not change it, practicing does not change done → AC-11
- [x] Stop and restart `pnpm dev` mid session → same step and time → AC-12
- [x] Finish in tab A, press Next in tab B → tab B reloads to the saved state → AC-12
- [x] Use only the keyboard on `/exercises/<id>/practice/` and at 360px in light and dark → every control reachable with visible focus, no horizontal scroll, pause and resume announced once, ticking time not announced → AC-13

## Commands
- [x] `cd app && pnpm check` → format, lint and typecheck pass → AC-14
- [x] `cd app && pnpm build` → completes → AC-14
- [x] `sqlite3 app/data/study.db ".schema practice_session"` → table, step check constraint and the partial unique index on active sessions exist → AC-3, AC-12
- [x] `sqlite3 app/data/study.db "update practice_session set running_since = (strftime('%s','now')-5*3600)*1000 where status='active'"` then load the page → paused at the old time plus 3 hours, "Paused after 3 hours"; Resume starts a new stretch → AC-6
- [x] POST `/_actions/finishPractice/` for an unrevealed session → 400 "Reveal the solution before you finish." → AC-8
- [x] POST `/_actions/discardPractice/` with no session → success → AC-9

## Value sourcing (one step per row of the spec's table)
- [x] Practice page: unsplit exercise vs split exercise → Start shown only when `split` is true → AC-2
- [x] Open session: start one on exercise A, load exercise B → B shows no session → AC-3
- [x] Timer elapsed: pause at a known time, reload → same value from `elapsed_ms` and `running_since` → AC-6
- [x] "Over target": 44:59 vs 45:00 → text appears at 45:00 → AC-6
- [x] "Paused after 3 hours": stretch of 2h59 vs 3h00 → text only at 3h → AC-6
- [x] Step title and prompt: system design vs object oriented exercise → the matching set of four → AC-5
- [x] Solution: reveal in one tab, reload another → solution present only once `revealed` is saved → AC-7
- [x] Finish duration: finish a session that was paused for a while → duration equals the paused time, not wall time → AC-8
- [x] Attempts date and duration: finish two sessions → newest first, date from `finished_at`, duration from `duration_ms` → AC-10
- [x] Practiced marks and home count: insert a finished row for a removed id → ignored in rows and in "N of M" → AC-11
- [x] Entry links: open session on one exercise → only that row reads "Resume practice" → AC-1

## Acceptance-criteria coverage
- AC-1 … rows and reader link · AC-2 … idle, 404, unsplit · AC-3 … start twice · AC-4 … source and order · AC-5 … steps · AC-6 … clock, cap, over target · AC-7 … reveal · AC-8 … finish · AC-9 … discard · AC-10 … attempts · AC-11 … marks and summary · AC-12 … restart, two tabs · AC-13 … keyboard, 360px, themes · AC-14 … check and build
