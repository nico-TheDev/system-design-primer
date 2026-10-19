# Tool discovery: stack and architecture

Date: 2026-10-19
Stack: Astro 7 (server output, @astrojs/node, Actions, content collections), React 19, Tailwind CSS 4, Drizzle ORM / drizzle-kit, better-sqlite3 / SQLite, pnpm, TypeScript

Installed already: no stack-specific skills. Global skills present (architect, audit, check, debug, develop, scope, sync, test, code-review and others) are workflow skills, not stack skills.

## Agent skills (skills.sh registry, install counts from `skills find`)

Astro
- astrolicious/agent-skills@astro (17.7K). Confirmed via `--list`. Covers Astro components, SSR adapters, content collections, CLI.
- withastro/astro@astro-developer (406). Official org repo. Lower adoption; unverified scope.

Tailwind CSS 4
- lombiq/tailwind-agent-skills@tailwind-4-docs (17.1K). Best fit for v4 specifics.
- wshobson/agents@tailwind-design-system (69.3K). General design-system patterns, not v4-specific.
- secondsky/claude-skills@tailwind-v4-shadcn (8K). v4 plus shadcn.

React 19
- vercel-labs/agent-skills@vercel-react-best-practices (814.7K). Broad React patterns; not React 19-specific.
- vercel-labs/agent-skills@vercel-composition-patterns (402.3K). Component composition.

Drizzle ORM / drizzle-kit
- giuseppe-trisciuoglio/developer-kit@drizzle-orm-patterns (5.3K). Patterns for schema and queries.
- bobmatnyc/claude-mpm-skills@drizzle-orm (4.3K) and @drizzle-migrations (1.3K). Covers drizzle-kit migrations.
- pproenca/dot-skills@drizzle-sqlite (192). Drizzle plus SQLite specifically; small adoption.

better-sqlite3 / SQLite
- No credible better-sqlite3 skill found. Weak options: pproenca/dot-skills@drizzle-sqlite (192), 0xdarkmatter/claude-mods@sqlite-ops (103), mattpocock/ai-engineer-workshop-2026-project@better-sqlite3-rebuild (120, narrow native-rebuild fix).

pnpm
- antfu/skills@pnpm (22K). Best fit.
- wshobson/agents@monorepo-management (14.4K). Only if the repo becomes a monorepo.

TypeScript
- wshobson/agents@typescript-advanced-types (89.5K). Advanced type patterns.

Not relevant for this stack (noted, not recommended): supabase, expo, nestjs, prisma, nuxt, design-taste skills.

## MCP servers

Astro
- Official: Astro Docs MCP (withastro/docs-mcp). Remote, Streamable HTTP, URL https://mcp.docs.astro.build/mcp. Setup: `claude mcp add --transport http astro-docs https://mcp.docs.astro.build/mcp`. Source: https://docs.astro.build/en/guides/build-with-ai/

SQLite
- Official reference: @modelcontextprotocol/server-sqlite (stdio, read_query, list_tables, describe_table; write_query optional). Setup: `claude mcp add sqlite -- npx -y @modelcontextprotocol/server-sqlite /absolute/path/to/app.db`. Verified only through a third-party listing; check the modelcontextprotocol/servers repo before adopting.

Drizzle
- No official server found.
- Community: defrex/drizzle-mcp (schema management, queries, introspection; SQLite and Postgres). Install per its repo README.
- Community: Drizzle Sentinel MCP (migration safety lint, schema drift detection for SQLite, MySQL, Postgres).

Tailwind CSS
- No official Tailwind Labs MCP for the CSS framework found. The api-docs.tailwind.ai server is a Pinterest scheduling product, not relevant.
- Community: tailwindcss-mcp-server (clarity-contrib/tailwindcss-mcp-server). Docs, utilities, conversion. Setup per repo.
- tailwind-context-resolver-mcp: v3 config only, does not support v4. Skip for this stack.

## Caveats
- Skill install counts are registry popularity, not a quality audit. Only astrolicious/agent-skills@astro was confirmed by `--list`; the rest are from `find` results.
- Community MCP servers were not reviewed for code or maintenance status.
- Nothing was installed.
