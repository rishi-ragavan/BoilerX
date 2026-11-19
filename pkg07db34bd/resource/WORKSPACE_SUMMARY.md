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
- Anonymity: students → `Boiler ` + FNV-1a(memberId+postId)[0..4] (NO `#`, formal tone; tags render without `#` too); anon faculty "Verified Faculty · {dept}", anon alum
  "Verified Alum · {employer}". Flair `🎯 Expert: {post.department || tags[0]}` when replier has ExpertMatch.
- JS gotchas: `removeAll({filter}, true)`; `fetch().objs` may be null → guard; use `Filter.intersects('post.id', strArray)`.

- Lead rules: PostView.experts = ONLY the viewer's own match; everyone sees `expertCount` (tagged list would
  de-anonymize 🎯 replies). Faculty cannot ask QUESTIONs (createPost rejects); they publish ARTICLEs + reply.

## Data (`data/`)
- A1: 35 members (12 UG/4 MS/5 PhD/8 faculty/6 alumni; ids `bc_member_<level>_<name>`, plus `bc_member_ta_jordan`),
  12 posts (2 ARTICLE; `bc_post_rec_letters` is EXPERTS_ONLY), 28 ExpertMatch, 21 Reply, 30 Like.
  Demo personas: `bc_member_ug_alex` (default student), `bc_member_fac_chen` (Finance prof), `bc_member_phd_priya`
  (FE PhD), `bc_member_alum_maya` (Goldman quant). `bc_member_alum_ryan` = unverified alum; `bc_member_fac_osei` anonByDefault.
- Load: `App.State.inst().get().withFields({pkgFingerprint:-1, seeded:false}).update(); C3.pkg().upsertAllSeed()`.

## UI (`ui/react/src/`)
- `main.tsx` → HashRouter → `App.tsx` (PersonaProvider + routes: `/`, `/post/:postId`, `/inbox`, `/messages[/:conversationId]`,
  `/profile[/:memberId]`), all under `components/Shell/ShellLayout.tsx` (3 columns, `<Outlet/>` in center `<main>`).
- `c3Action.ts`: fetch-based `c3Call` (same contract as the skill reference; no axios). `api/boilerApi.ts`: typed wrappers.
- `hooks/useApi.ts`: StrictMode-safe loader `{data, loading, error, reload}`. `components/Shell/ShellStatus.tsx`:
  ShellStatus (loading/error/empty) + ShellPageHeader.
- `vite.config.mts`: embed config + reference `/api|/remote|/thirdparty|/typesys` proxies (added Step 0).
- Playwright browser is unauthenticated (API → 401); verify data via runJsOnLiveApp.

## Tests
- `test/js-rhino/test_ForumApi.js` (22 specs: anonymity, EXPERTS_ONLY, flair, verify). Run in liveapp (dev mode):
  `TestRunner.make().withTestNameGlob('test_ForumApi.js').run().toYamlString()`. Needs `testtools` dep (added, 8.12).
- `test/js-rhino/test_ForumApi_write.js` (22 specs: createPost unsafe/not saved, ExpertMatch validation ≤5/no author/
  unknown/dup, invalid space → STUDENT, articles no matches, reply anon/flair/unverified, toggleLike ±1 reputation).
  Spies `AiPipeline.analyzePost` via `TestApi.spyOn(...).callFake(fn)` — the fake runs WITHOUT closure (pass data via args).
  API-created rows cleaned with `TestApi.addExternalTeardownFilter(ctx, "startsWith(author.id,'<prefix>')", 'Post', 1000)`.
- ForumApi re-checks verification via `Verify.check(email, role)` on post/reply.

## Status
- Step 0 on main. A1 + A2 + A3 tests on `lane-a-forum`. Step 0: types valid (no Pkg issues), data loaded, ForumApi smoke-tested, `npm run build` green, UI running.
