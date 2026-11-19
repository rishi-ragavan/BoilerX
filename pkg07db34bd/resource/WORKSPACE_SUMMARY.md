# WORKSPACE SUMMARY — BoilerConnect (pkg07db34bd)

Maintained by the agent. Concise map, not a transcript. Full lane/ownership table: `/README.md`.

## Package
- `pkg07db34bd` (name locked). Deps: `mcpServer 8.10` (brings `genaiPlatform` → `GenaiCore.Llm.Completion.Client` for Lane B).
- Template origin: Agentix chat embed. `ui/agentix-chat-ui/` is a vendored lib that `vite.config.mts` aliases for
  `@/components/ui/*` + theme CSS (tokens: bg-background, text-foreground, text-muted-foreground, border-border,
  bg-muted, bg-primary/text-primary-foreground, text-destructive). Keep it; the chat embed route was removed.

## Backend (`src/`) — JS (`js-server`)
- Entities (`src/model/`): ForumMember{email, role, level, verified, department, employer, bio, tags, badges,
  anonByDefault, reputation; inherited `name`}, Post{author, postType, title, body, visibility, space, department, tags,
  isAnonymous, createdAt, expertMatches, replies}, ExpertMatch{post, expert, rank, score, reason}, Reply, Like{member,
  post?, reply?}, Conversation, Message. Enums are nested types (ForumMember.Role, Post.Space, …); values compare as strings.
- Views (`src/view/`): see README. APIs (`src/api/`): ForumApi (real impl), Verify, Rank (real), AiPipeline (Step 0:
  deterministic fallback only), DmApi (Step 0: hard-coded stubs + real FACULTY-only check).
- Anonymity: students → `Boiler #` + FNV-1a(memberId+postId)[0..4]; anon faculty "Verified Faculty · {dept}", anon alum
  "Verified Alum · {employer}". Flair `🎯 Expert: {post.department || tags[0]}` when replier has ExpertMatch.
- JS gotchas: `removeAll({filter}, true)`; `fetch().objs` may be null → guard; use `Filter.intersects('post.id', strArray)`.

## Data (`data/`)
- Step 0: 5 members (`bc_member_ug_alex` default persona, `bc_member_phd_priya`, `bc_member_fac_chen` PROFESSOR,
  `bc_member_alum_maya` Goldman, `bc_member_ta_jordan` TA), 3 posts, 4 ExpertMatch, 3 Reply, 4 Like.
- Load: `App.State.inst().get().withFields({pkgFingerprint:-1, seeded:false}).update(); C3.pkg().upsertAllSeed()`.

## UI (`ui/react/src/`)
- `main.tsx` → HashRouter → `App.tsx` (PersonaProvider + routes: `/`, `/post/:postId`, `/inbox`, `/messages[/:conversationId]`,
  `/profile[/:memberId]`), all under `components/Shell/ShellLayout.tsx` (3 columns, `<Outlet/>` in center `<main>`).
- `c3Action.ts`: fetch-based `c3Call` (same contract as the skill reference; no axios). `api/boilerApi.ts`: typed wrappers.
- `hooks/useApi.ts`: StrictMode-safe loader `{data, loading, error, reload}`. `components/Shell/ShellStatus.tsx`:
  ShellStatus (loading/error/empty) + ShellPageHeader.
- `vite.config.mts`: embed config + reference `/api|/remote|/thirdparty|/typesys` proxies (added Step 0).
- Playwright browser is unauthenticated (API → 401); verify data via runJsOnLiveApp.

## Status
- Step 0 done: types valid (no Pkg issues), data loaded, ForumApi smoke-tested, `npm run build` green, UI running.
