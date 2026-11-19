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
  isAnonymous, createdAt, expertMatches, replies}, ExpertMatch{post, expert, rank, score, reason}, Reply, Conversation, Message. Enums are nested types (ForumMember.Role, Post.Space, …); values compare as strings.
- Views (`src/view/`): see README. APIs (`src/api/`): ForumApi (real impl), Verify, Rank (real), AiPipeline (Step 0:
  deterministic fallback only), DmApi (Step 0: hard-coded stubs + real FACULTY-only check).
- Anonymity: students → `Boiler ` + FNV-1a(memberId+postId)[0..4] (NO `#`, formal tone; tags render without `#` too); anon faculty "Verified Faculty · {dept}", anon alum
  "Verified Alum · {employer}". Flair `🎯 Expert: {post.department || tags[0]}` when replier has ExpertMatch.
- JS gotchas: `removeAll({filter}, true)`; `fetch().objs` may be null → guard; use `Filter.intersects('post.id', strArray)`.

- Spaces: STUDENT | EXPERTS (formerly Faculty; role stays FACULTY, label "Expert · {dept}") | ALUMNI.
  Feed tabs students|experts(aliases faculty, professors)|alumni all identical (questions routed there, dept filter on any
  tab); foryou = all PUBLIC. NO articles (PostType = QUESTION only). Seed: 12 posts (Student 3 / Faculty 6 / Alumni 3).
- Lead rules (see README "Product rules"): no "verified" wording anywhere; no likes (Like entity/toggleLike
  removed; hot uses replies; reputation +1 per answer); replies grouped FACULTY→ALUMNI→STUDENT via ReplyView.authorGroup.
- Lead rules: PostView.experts = ONLY the viewer's own match; everyone sees `expertCount` (tagged list would
  de-anonymize 🎯 replies). Faculty cannot post at all (createPost rejects); they reply + DM.

## Data (`data/`)
- A1: 35 members (12 UG/4 MS/5 PhD/8 faculty/6 alumni; ids `bc_member_<level>_<name>`, plus `bc_member_ta_jordan`),
  12 posts (no articles; `bc_post_rec_letters` is EXPERTS_ONLY), 34 ExpertMatch, 23 Reply (no likes).
  Demo personas: `bc_member_ug_alex` (default student), `bc_member_fac_chen` (Finance prof), `bc_member_phd_priya`
  (FE PhD), `bc_member_alum_maya` (Goldman quant). all 35 verified (ryan now @alumni.purdue.edu); `bc_member_fac_osei` anonByDefault.
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
  unknown/dup, invalid space → STUDENT, alumni can ask, reply anon/flair/gate, +1 reputation per answer).
  Spies `AiPipeline.analyzePost` via `TestApi.spyOn(...).callFake(fn)` — the fake runs WITHOUT closure (pass data via args).
  API-created rows cleaned with `TestApi.addExternalTeardownFilter(ctx, "startsWith(author.id,'<prefix>')", 'Post', 1000)`.
- ForumApi re-checks verification via `Verify.check(email, role)` on post/reply.

## Merge 1 (done, main @ 89509d4)
- Order B → A → D → C. Conflicts (PostDetailPage, ProfilePage → D; FeedPostCard, ShellLayout, HomePage → C) kept the owner.
- Integration commit aligned C + D UI with lead rules (no likes/articles/verified, Experts space, count-only experts,
  grouped replies). Deleted PostLikeButton; replySort.ts now = insertReply + group labels.
- Live DB cleaned (30 Like, 8 FACULTY/ARTICLE posts + replies/matches), seed upserted. Tests: ForumApi 38 + write 18 +
  AiPipeline 20 = 76 pass. Real LLM: demo Q → EXPERTS/Finance, 4 experts (chen, priya, maya, harris), ~2.5 s;
  "CS 251 exam answers" blocked.
- Repo was shallow-fetched by another session (broke merges with "unrelated histories"): fix `git fetch --unshallow origin`.
- `/usr/workspace` is now on `main` (the live app + preview run from it). Other lanes: C has worktree /home/c3/lane-c-feed-wt.

## Status
- Merge 1 on main. Step 0: types valid (no Pkg issues), data loaded, ForumApi smoke-tested, `npm run build` green, UI running.
