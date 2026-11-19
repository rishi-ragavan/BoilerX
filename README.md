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

- **Formal tone — no `#` anywhere.** Topic tags render as plain chips (`stock market`, not `#stock market`);
  student handles are **`Boiler a3f1`** (not `Boiler #a3f1`).
- **Tagged experts are never listed.** `PostView.experts` contains only the *viewer's own* match (for "why you were
  tagged"); everyone else sees only `PostView.expertCount` ("5 experts tagged"). A public list + anonymous 🎯 replies
  would de-anonymize the repliers. `createPost` therefore returns only the count, not names.
- **Never say "verified".** Everyone on the platform passed the Purdue email gate (`Verify.check` at signup), so
  no badge/label says Verified/Unverified. Anonymous handles: `Boiler a3f1`, `Faculty · Finance`, `Alum · Google`.
  `MemberView.verified` was removed; `listMembers` returns only gate-passed members.
- **No likes.** `Like`, `LikeResult`, `toggleLike`, `likeCount`, `likedByMe` are gone. A post card offers only
  "View N comments" (`PostView.replyCount`). Feed `hot = (replies + 2·expertReplies + 1) / (hours + 2)^1.5`;
  reputation = +1 per answer given.
- **Anyone can answer; professors' answers come first.** `getPost` returns replies grouped FACULTY → ALUMNI →
  STUDENT (oldest first within a group); each `ReplyView.authorGroup` says which, so the UI renders a header
  ("Professors", "Alumni", "Students") whenever it changes. Do not re-sort replies in the UI.
- **Three spaces, identical behavior: Student, Experts, Alumni.** The AI routes every new post
  into one space so no space gets crowded. Each space feed shows all PUBLIC questions routed
  there; `dept` filters any space; For You shows all spaces. Anyone can read and reply in any space (only
  EXPERTS_ONLY posts are restricted). The keyword fallback must route too — never dump everything into Student.
- **No articles.** Every post is a question (`postType` is always QUESTION; there is no Articles tab).
- **Faculty are "Experts" in the UI.** The Faculty space is the **Experts** space (`Post.Space.EXPERTS`, feed tab
  `experts`; `faculty`/`professors` still accepted as aliases, and a pipeline `FACULTY` space is stored as EXPERTS).
  People: `Expert · Finance` (named or anonymous). Reply groups: `EXPERTS` → `ALUMNI` → `STUDENT`. The member role
  value stays `FACULTY` (signup, DM permission). Note the 🎯 `Expert:` flair is separate: it marks anyone tagged.
- **Faculty cannot post.** `createPost` rejects FACULTY; faculty answer (and start DMs). Students and alumni ask.

## UI rules

- The UI calls **only** `ForumApi`, `AiPipeline`, `DmApi` via `ui/react/src/api/boilerApi.ts` — never entity types.
- Every call passes `actingMemberId` from `usePersona()` (`components/Persona/PersonaContext.tsx`) as `actorId`.
- Errors surface in the UI (no mock fallbacks).
