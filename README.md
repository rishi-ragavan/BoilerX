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

## UI rules

- The UI calls **only** `ForumApi`, `AiPipeline`, `DmApi` via `ui/react/src/api/boilerApi.ts` — never entity types.
- Every call passes `actingMemberId` from `usePersona()` (`components/Persona/PersonaContext.tsx`) as `actorId`.
- Errors surface in the UI (no mock fallbacks).
