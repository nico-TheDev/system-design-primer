# Verify: Stack & architecture · spec 0001 · updated 2026-10-19
_Steps derived from the spec's setup notes, invariants, and the scope's "Done when". The spec has no numbered acceptance criteria, so steps point to the scope line or the invariant they check. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] From `app/`, run `pnpm dev`, open http://localhost:4321 → page shows "System Design Study" and "Database check: ok"  → scope Done when (starts with one command, shows a page)
- [x] Start a second `pnpm dev` while the first runs → it reports the running server and does not start one on 4322  → strictPort invariant
- [x] `curl -H 'Host: evil.com' http://localhost:4321` → 403  → localhost only invariant

## Commands
- [x] `cd app && pnpm install` on a clean checkout → completes, and `node -e "new (require('better-sqlite3'))(':memory:')"` loads the native driver  → setup notes (allowBuilds)
- [x] `cd app && pnpm build` → succeeds  → setup notes
- [x] `ls app/data` after the first page load → `study.db`, `study.db-wal`, `study.db-shm` exist, and `git status` does not list them  → gitignore invariant
- [x] `sqlite3 app/data/study.db 'select * from app_meta'` → one `scaffold|ok|…` row  → migration applied on first open
- [x] `STUDY_DB_PATH=/tmp/other.db pnpm dev`, load the page → `/tmp/other.db` is created and `app/data/study.db` is untouched  → configuration
- [x] `git status --short` after all of the above → only `app/` and `docs/` changed; nothing at the repo root or in upstream folders  → nothing outside `app/` invariant

## Coverage
- Scope Done when: "starts locally with one command and shows a page" → steps 1 and the build command · "stack and app location recorded in a spec" → spec 0001 exists
- Invariants covered: localhost only, strictPort, DB path and lazy open, gitignored data, upstream untouched
- Not covered here (later features): Actions with Zod, repo-images endpoint, content loader, Tailwind `@theme` use beyond the base tokens
