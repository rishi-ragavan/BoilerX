# BoilerX · BoilerConnect

Purdue-wide Q&A forum (Ed Discussion's purpose, X's look) built as one C3 package: **`pkg07db34bd/`**
(the package name is fixed by C3 Code; every API is called by Type name, so the name never matters).

## Lane ownership (§1.6)

| Lane | Owner | Owns (only this lane edits these) |
|---|---|---|
| **A: Foundation + Forum API** | Project lead (integrator) | All `.c3typ` Types (`src/model/**`, `src/view/**`, `src/api/*.c3typ`), `src/api/ForumApi.js`, `src/api/Verify.js`, `src/api/Rank.js`, `data/**`, `ui/react/src/App.tsx`, `ui/react/src/Interfaces.tsx`, `ui/react/src/api/**`, `ui/react/src/c3Action.ts`, `ui/react/src/hooks/**`, `ui/react/vite.config.mts`, merges, demo app |
| **B: AI pipeline** | Teammate 1 | `src/api/AiPipeline.js` + `test/js-rhino/test_AiPipeline.js` |
| **C: Shell + Feed UI** | Teammate 2 | `ui/react/src/components/{Shell,Feed,Composer,Persona}/**`, `ui/react/src/pages/Home/**` |
| **D: Post detail + DMs** | Teammate 3 | `src/api/DmApi.js`; `ui/react/src/components/{Post,Identity,Expert,Reply,Dm,Profile,Inbox,Email}/**`; `ui/react/src/pages/{Post,Inbox,Messages,Profile}/**` |

Need a change in a file you don't own → message its owner. Merge order at every checkpoint: **B → A → D → C** (by Lane A).

## Folder layout

```
pkg07db34bd/
  src/model/      entity types: ForumMember (+ .Role/.Level enums), Post (+ .PostType/.Visibility/.Space), ExpertMatch, Reply, Like, Conversation, Message
  src/view/       view/value types the UI receives: AuthorView, ExpertView, PostView, ReplyView, PostDetailView, MemberView,
                  ConversationView, MessageView, AnalyzeResult, ExpertSuggestion, DirectoryEntry, CreatePostResult,
                  NewPostInput, LikeResult, RefinedQuestion, EmailDraft, VerifyResult
  src/api/        ForumApi, AiPipeline, DmApi, Verify, Rank  (.c3typ = frozen contract, .js = implementation)
  data/<Type>/    sample rows (load: C3.pkg().upsertAllSeed())
  test/js-rhino/  backend tests (test_<Type>.js)
  ui/react/src/   App.tsx (routes) · Interfaces.tsx (view types) · api/boilerApi.ts (typed c3Call wrappers)
                  components/<Prefix>/ · pages/<Page>/
```

## Contract changes vs. the lane doc

- `Member` → **`ForumMember`** (the platform already ships a `Member` entity type).
- `Post.type` → **`postType`** (also on `PostView` / `NewPostInput`) — `type` is reserved on C3 objects.
- `DirectoryEntry` uses **`memberId`** (not `id`), matching `ExpertSuggestion.memberId`.
- Extras: `AuthorView.memberId` (null when anonymous), `ExpertView.badges`, `MemberView.roleLabel` + `anonByDefault`.

## Product rules (lead decisions, override the lane doc)

- **Three categories only: Professor, Alumni, Student.** Role values `FACULTY` / `ALUMNI` / `STUDENT`. No levels
  (UG/MS/PhD), no badges, no reputation, no likes, no "verified" wording (everyone passed the Purdue email gate).
- **Tags: "Expert" (professors) and "Alumni" (alumni) only.** Students have no tag. There is no 🎯 expert flair and
  no topic tags on posts.
- **Flair:** professors show department + research interests (`Finance · stock market, asset pricing`); alumni show
  a broad career role (`SWE`, `Product Manager`, `Quant Trader`…), plus their employer only when they post under
  their name. Students have no flair and no listed expertise (`tags` is always empty for students).
- **Tagging happens only in the Experts and Alumni spaces.** A Student-space question tags no one and never
  shows "experts tagged" (it is always PUBLIC, since an experts-only post there would have no audience).
- **Only professors and alumni are tagged on questions**, so only they have **Questions for you** (left nav + a right-rail
  panel). `ForumApi.inbox` returns nothing for students; the expert directory sent to the AI excludes students.
- **Three spaces, identical behavior: Student, Experts, Alumni.** The AI routes every question into one space.
  Anyone can read and reply in any space (only EXPERTS_ONLY posts are restricted).
- **Replies are grouped by category, and the post's own space's category comes first:** Experts space → professors
  first, Alumni space → alumni first, Student space → students first; the other categories follow, each grouped.
  `ReplyView.authorGroup` = `EXPERTS` | `ALUMNI` | `STUDENT`; render a header when it changes; don't re-sort.
- **Anonymity:** students are always `Boiler a3f1` (new handle per thread). Anonymous professors/alumni show as
  `Purdue professor` / `Purdue alum` with their tag + flair. The UI never renders real names. Tagged experts are
  never listed (only `expertCount`).
- **Questions only; faculty don't post.** No articles. Faculty answer (and start DMs); students and alumni ask.
- **Formal tone:** no `#` anywhere.

## UI rules

- The UI calls **only** `ForumApi`, `AiPipeline`, `DmApi` via `ui/react/src/api/boilerApi.ts` — never entity types.
- Every call passes `actingMemberId` from `usePersona()` (`components/Persona/PersonaContext.tsx`) as `actorId`.
- Errors surface in the UI (no mock fallbacks).
