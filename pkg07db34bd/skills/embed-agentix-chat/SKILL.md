---
name: embed-agentix-chat
description: >
  Embed a Nexus Agent chat into an existing C3 app UI on the same cluster via
  the drop-in NexusChatEmbed component (zero BFF: InClusterTransport straight at
  the Nexus mount, silent c3auth cookie exchange via the platform's self-scoped
  User.mySessionToken mint — no role grant, no C3 dependency). Also covers migrating an app
  off the older C3 Code (nexusPkg) template — deleting its server-side proxy and OAuth auth
  gate — and upgrading an app across the @c3/nexus-client-ui → @c3/agentix-client-ui package
  rename. Load when user says "embed Nexus chat into my app", "add a Nexus agent chat page",
  "NexusChatEmbed", "silent cookie exchange", "upgrade the agentix chat library",
  "npm install @c3/agentix-client-ui", "Nexus is unavailable in embed", or "author an agent
  definition over REST". Full trigger list in `triggers:` below.
triggers:
  - embed Nexus chat into an app
  - add a Nexus agent chat page
  - integrate a Nexus agent into an existing app UI
  - integrate Nexus chat
  - integrate the agentix chat
  - integrate the agentix chat interface
  - integrate agentix chat into my app
  - integrate the Nexus chat interface into an app
  - add the agentix chat UI to an app
  - embed the agentix chat interface
  - embed agentix chat
  - add a chat interface powered by Nexus
  - wire the Nexus chat into an existing UI
  - drop the Nexus chat into an app
  - NexusChatEmbed
  - nexusClient package
  - silent nexus cookie bootstrap
  - same-cluster nexus embed c3auth
  - ChatPage transport mount pattern
  - Nexus is unavailable in embed
  - mySessionToken mint for embed
  - migrate off the C3 Code nexusPkg embed template
  - delete the NexusApiClient proxy and NexusAuthGate
  - upgrade the embedded agentix chat library
  - rename nexus-client-ui to agentix-client-ui in a consumer app
  - fetch/download the latest pre-built embed-chat starter-kit tgz
  - agentix embed starter-kit download endpoint
  - download the embed chat kit
  - how do I get the embed chat kit
  - get the agentix chat starter kit myself
  - agent download the embed starter kit
  - npm install @c3/agentix-client-ui
  - author an agent definition over REST
  - create an agent via /agent-api/v1
  - delete an agent definition
  - Agentix.AgentAdmin definition create
  - /embed-agentix-chat
  - Nexus chat embed
  - Agentix chat embed
antiTriggers:
  - deploy the app
  - sync package
  - run Playwright tests
  - cross-cluster embed
core: false
category: nexus-dev
version: 5.3.0
---

# Embed Nexus Chat into a C3 App

Add a **Nexus Agent chat UI** to an existing C3 application on the **same cluster host** as Nexus.
Zero BFF: the browser drives the Nexus app mount (`/<env>/<app>`) **directly** — the same restful
surface the Nexus host UI uses — with plain cookie auth. (`<env>` and `<app>` are whatever the Nexus
deployment actually uses — not literally `nexus`, and not necessarily the consumer's env.) No server-side proxy types, no second
login, no OAuth, no client credentials. **Server-side integration is zero**: the one-time silent
cookie exchange mints via the platform's own self-scoped `User.mySessionToken`, so the consumer
needs no C3 package dependency, no custom type, and no role grant.

```
browser ── cookie (own app path) ──► consumer /api/8/User/mySessionToken     (once, silent)
browser ── Authorization: c3auth ──► nexus /api/8/User/myUser → Set-Cookie    (once, silent)
browser ── cookie (nexus path) ────► nexus /api/8 + agent pod                 (everything after)
```

| Layer     | Component                                            | Source                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI        | `<NexusChatEmbed />` (ChatPage + InClusterTransport) | `@c3/agentix-client-ui` (`c3/nexusClient/react/`)                                                                                                                                                                                                                                                                                                                                                                     |
| Cookie    | `silentNexusCookieBootstrap`                         | `c3/nexusClient/react/src/lib/nexusCookieBootstrap.ts`                                                                                                                                                                                                                                                                                                                                                                |
| Mint      | `User.mySessionToken` (platform, self-scoped)        | Platform baseline — no grant, nothing to deploy                                                                                                                                                                                                                                                                                                                                                                       |
| Transport | `InClusterTransport({ baseUrl })`                    | _In-cluster_, not localhost: `local: false` (default) targets a sibling app's discovered Nexus mount; host opts out with `{ local: true }`                                                                                                                                                                                                                                                                            |
| Discover  | `Microservice.Config.forName('Nexus').serviceAppId`  | **Recommended**: publish `serviceAppId` (`<cluster>-<env>-<app>`) — host-free, so the `/<env>/<app>`-on-current-origin mount is vanity-native. `serviceAppUrl` still honored for existing publishers. **Multi-studio:** `Microservice.Config.forName("Studio").appId` → `forName('Nexus.<studioId>')` tried first; cluster-wide `'Nexus'` is the fallback. APP-scope on a consumer (or `nexusBase`) overrides CLUSTER |

## Why a cookie exchange at all

`c3auth` cookies are **path-scoped per app** (`Path=/<env>/<app>; Secure; HTTPOnly`). A consumer
app's page holds no credential for `/<env>/<app>/...` (the Nexus mount) even though the user is signed in. The
bootstrap exchanges the page's own-app session for a Nexus-path cookie with zero user interaction:

1. **Probe** `POST <nexusBase>/api/8/User/myUser` with `redirect: 'manual'`.
2. If denied: `POST <ownApp>/api/8/User/mySessionToken` (cookie-authed to the page's own app)
   returns the **caller's own** `SessionToken`; read `.signedToken`.
3. Present the token **once** to the Nexus mount in an `Authorization: c3auth <token>` header.
   Any app on the cluster accepts a sibling app's signed token (same env IdP); the response
   re-issues it as `Set-Cookie` scoped to the Nexus path. The token lives only in function scope —
   never logged, never in a URL, never persisted.
4. Re-probe → cookie works → everything after is plain cookie auth, identical to the host UI.

**Both endpoints are self-scoped platform defaults** — `myUser` and `mySessionToken` act only on
the caller, so they sit in the unprivileged baseline every authenticated principal has on every
app, with no role grant (verified: a **zero-role** user gets 200 on both). That property is what
makes the integration zero-config, so don't substitute alternatives:

- `User#sessionToken` takes a _user_ argument → admin-gated (impersonation risk). Not usable.
- A custom self-scoped facade type works but is pure overhead — it drags in a package dependency
  plus an `allow:` grant, and a missing grant 403s plain users while admins pass, which is a
  nasty asymmetric failure. An earlier revision shipped exactly that (`NexusEmbedAuth.myToken`)
  and it was deleted once the platform action was confirmed. Don't reintroduce it.
- Role-gated probes (`Echo`, app facades) read "denied" as "no cookie" for plain users.

A failed exchange means the page's own session is dead — the host app's normal reauth problem. The
component renders a quiet "Nexus is unavailable."

## Starter kit

**Human admin:** download the kit from the Nexus app's **admin area → Embed chat tab → Download**
button (admin-only; your existing session authenticates it — no extra sign-in). Then **extract the
bundle and give the `resources/agentix-chat-code/demo/` folder to your coding agent** along with the
prompt the panel supplies — the agent reads this skill (`SKILL.md` + `references/` sit at the root of
the served bundle) and wires the chat into the app that will host it. One extract yields the whole
kit; the code is merged in, not a second archive. (A coding agent that needs the kit without a human
handoff — and doesn't already have it in its dirs — fetches it directly — see [Get the kit yourself](#get-the-kit-yourself-agent-driven-no-human-handoff).)

### Get the kit yourself (agent-driven, no human handoff)

**First — check whether you already have the kit; don't download if you do.** Look in your working
tree for an existing copy (a `demo/` + `agentix-chat-ui/` pair, a `resources/agentix-chat-code/` tree,
or an unextracted `agentix-chat-embed.tgz` — e.g. `find` for `agentix-chat-ui` or `vite.demo.config.ts`).
If it's there — handed to you, or downloaded on an earlier turn — **skip straight to the
[Fast path](#fast-path-copy-the-demo-dont-re-derive-it).** Only download when the code is genuinely absent.

When it is absent, download it yourself — one authenticated GET against the Nexus app, the same
endpoint the admin panel uses:

```
GET <nexusBase>/agent-api/v1/embed-client/download   →   200 application/gzip
```

> ⚠️ **Do the whole download _inside_ the exec runtime, not from your shell.** The runtime that runs
> your server-side snippets is often a **remote** server with its own filesystem — a file it writes is
> invisible to your shell, and your shell has no `c3auth` session (a shell `curl` gets a login page).
> So: discover the mount, mint the token, GET the bytes, and base64-encode them **all in the runtime**,
> then ferry back only text + a sha256 to verify. A local-shell `curl` is a shortcut for the confirmed
> shared-filesystem case only.

The full, copy-paste recipe — hardened discovery (feature-checking `.endpoint()`), the in-runtime
download+mint+hash snippet, the chunked base64 ferry with verification, the raw-`Js.exec` encoding
rules, and the `curl` shortcut — is in **[`references/get-the-kit.md`](./references/get-the-kit.md)**.
The mint is the self-scoped `User.mySessionToken()` and the caller needs `Nexus.User` on the Nexus app
(the same boundary the chat APIs use — see [Prerequisites](#prerequisites)). **Pick one exec language
and don't mix** — the C3 **Python** runtime needs a `c3.` prefix on every platform type
(`c3.User.mySessionToken()`) where JS uses it bare, so a bare-`User` snippet in a Python door fails
with `NameError`. The reference shows the binary download in Python (this repo's JS HTTP surface is
text-oriented); see it for details.

**Then read the bundled `SKILL.md` at the root of the extraction and follow it** — it is this file,
shipped with the code (the demo app and vendored `agentix-chat-ui/` sources sit under `resources/`), so
the [Fast path](#fast-path-copy-the-demo-dont-re-derive-it) applies verbatim.

The admin-facing guidance — what's in the kit, the two cluster prerequisites and their console
snippets, and what to expect (no local-run path) — lives in
[`references/starter-kit.md`](./references/starter-kit.md), a single source read by both the admin
(rendered on the card) and the coding agent (from `references/starter-kit.md` at the root of the
bundle). The rest of this file is the contract that document points back to:
[Prerequisites](#prerequisites), the numbered [Steps](#steps), and [Troubleshooting](#troubleshooting).

### Fast path: COPY the demo, don't re-derive it

**Balance speed against correctness by _where_ you spend effort — not by cutting corners everywhere.**
The two are not in tension if you split the work the way the kit already splits it:

- **Copy for speed — do NOT re-derive.** The wiring that is _identical for every consumer_ — the Vite
  resolution (`makePinSingletons`, dedupe, `@/` alias order), the `tsconfig` `paths`, and the provider tree
  in `main.tsx` — is solved in the demo and correct by construction. Hand-re-deriving it is pure cost
  with no upside: it's the single biggest time sink **and** the most common source of subtle breakage
  (a mispinned singleton fails silently at runtime). Copy it verbatim and move on.
- **Get right for correctness — the small, consumer-specific surface.** Only two kinds of thing are
  genuinely yours to decide: the [deploy deltas](#deploy-deltas-copy-the-demo-then-change-only-these)
  (A–D — router, tsconfig exclusion, no proxy, install model) and the consumer-owned config the chat
  reads (its `agentDefId`, theme tokens, i18next namespaces, chat-surface toggles). This surface is
  small enough to reason about carefully without slowing the whole integration down.
- **Prove the balance held with one cheap check.** After wiring, build the consumer and grep the emitted
  CSS for a few package-only utilities (`grep -c -e 'max-w-lg' -e 'state=open' -e 'animate-in'` — full
  command in [`references/app-context.md`](./references/app-context.md)). All present ⇒ the copy landed
  and the presentation layer is intact. This one grep catches the jsdom-invisible styling failures that
  otherwise read as "chat won't start," so you spend seconds instead of debugging a healthy backend.

**The verb is "copy," not "reference."** The kit's `resources/agentix-chat-code/demo/` is a working
consumer app — `viteShared.ts`, `vite.demo.config.ts`, `tsconfig.json`, `main.tsx` (the full provider
tree, incl. `TooltipProvider` + `Toaster` + `QueryClientProvider` + `initTheme`), `EmbedDemoRoutes.tsx`,
`i18n.ts`, `demo.css`, `index.html`. Treating these as "reference material" invites re-deriving them by
hand, which is where the time goes. Instead:

1. **Clone `demo/` verbatim** into the consumer's `ui/react/` (rename `demo.css` → `globals.css`,
   `EmbedDemoRoutes` → `EmbedRoutes` to taste — the names are cosmetic).
2. **Apply only the deploy deltas** in [Deploy deltas](#deploy-deltas-copy-the-demo-then-change-only-these)
   below. Everything else — the whole [Vite resolve order](#4-vite-resolve-order) story — is already
   correct in the copied files.

**Do NOT hand-write** `makePinSingletons`, the dedupe list, the `@/` alias order, or the `tsconfig` `paths`.
They already exist in `viteShared.ts` / `vite.demo.config.ts` / `tsconfig.json`. Re-deriving them is the
single biggest avoidable time sink and it reopens the singleton-pinning fight the demo already won. The
provider-tree work is likewise done — `main.tsx` already mounts every provider the chat needs
([step 6 rule: never edit the vendored library](#never-edit-the-vendored-library)).

### Deploy deltas (copy the demo, then change ONLY these)

The demo is authored to run standalone at the web root (Vite dev server at `/`, proxying to a
cluster). A real consumer is served from its **app mount** at `/<env>/<app>`, often inside an iframe.
Four deltas bridge that gap; nothing else in the copied files needs touching:

| #   | Delta             | Do this                                                                                                                                                                                               | Why the demo is wrong for a deployed mount                                                                                                                                                                                                                                                                                    |
| --- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | **Router**        | Use `HashRouter`, **no** `basename`. Delete `basename.ts` + `resolveBasename.ts`.                                                                                                                     | The demo's `main.tsx` uses `BrowserRouter basename={resolveBasename()}`. On a real mount the basename math never matches the served path, and the `/`→`/chat` redirect rewrites a pathname a hosting iframe cannot reload. `HashRouter` sidesteps both.                                                                       |
| B   | **tsconfig**      | Add `build-types/vendored-library.d.ts` with `declare module '@c3/agentix-client-ui';`, and a `tsconfig.build.json` that drops the `@/*` library leg so `tsc` never type-checks the vendored library. | Cleaner than the demo's `skipLibCheck`: it excludes the library from `tsc` at the root, killing the entire `@types/react`-strictness error class. The library ships pre-checked — you never need to re-check it.                                                                                                              |
| C   | **No dev proxy**  | Do **not** add a discovery proxy for a deployed mount.                                                                                                                                                | A current library derives the Nexus mount from the served path via `deriveGatewayBase` (`c3/nexusClient/react/src/lib/gatewayBase.ts`), so there is no `nexusBase` prop and no proxy to add. **If you think you need a discovery proxy, your library copy is stale — [re-download the kit](#keep-kit--library-in-lockstep).** |
| D   | **Install model** | List every runtime dep in the consumer `ui/react/package.json`; run `npm install` **only** there. **Never** `npm install` inside the vendored `agentix-chat-ui/`.                                     | The vendored library has no `node_modules` by design (it mirrors the deploy pipeline). A sidecar install there pulls a large tree for nothing and can shadow the consumer's singletons.                                                                                                                                       |

### Where the kit comes from — one build-generated `.tgz`, one download endpoint

The kit is a **build output**, regenerated on **every `npm run build`** of `c3/nexus/react` (via
`scripts/postBuild.cjs`) — exactly like the `ui/content/` bundle — and **gitignored** the same way, so
it is never committed and cannot drift from its sources. `npm run build:embed-zip` regenerates just the
bundle without the full vite build (quick local refresh). Exactly **one** file is written, and nothing
is generated under `skills/`:

| Artifact                                         | Where               | Contains                                                                                                                                                                        | Used by                                                     | Why there                                                                                                                                |
| ------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `c3/nexus/resource/embed/agentix-chat-embed.tgz` | C3 package resource | skill instructions (`SKILL.md`) + supporting references (`references/`) + the code (`demo/` + `agentix-chat-ui/`) merged in at `resources/agentix-chat-code/`, all gzipped once | the RESTful download endpoint → admin panel + external apps | the only tree `Pkg.content(...)` can read; a remote downloader has no repo checkout, so it needs the how-to **and** the code in one file |

The code is assembled **in memory** and merged into this bundle (flattened into the same gzip, not a
nested archive) — it is never written to `skills/` on its own, so the build leaves the skill folder
untouched, and a single extract yields the whole kit.

How it ships without being committed: the C3 artifact build runs `npm run build` for every
`c3/<pkg>/react` package — which writes the `.tgz` to disk — and then the Jarvis re-stash step
re-packs the **working tree** (the same mechanism that ships the built `ui/content/`), so the
freshly-built pkg resource travels in the deployed package with no commit. That re-stash strips every
`*.zip` (an anti-nesting guard), which is why the archive is `.tgz`, not `.zip` — a `.zip` resource
would silently vanish and the endpoint would 500. `.tgz` survives (Helm charts ship that way). A plain
`make sync` (incremental transport, no build) does **not** refresh it — rebuild via
`make build-push-ui` / `sync-pkg`, same as any `ui/content/` change. See
[`docs/design/nexus-client/nexus-client.md` §10](../../docs/design/nexus-client/nexus-client.md).

Both the in-app admin **Embed chat** panel and any **external same-cluster app** fetch the served
bundle from one RESTful endpoint on the Nexus app:

```
GET <nexusBase>/agent-api/v1/embed-client/download    →  200 application/gzip
```

- **From the admin panel** (same-origin): the browser's existing `c3auth` cookie authenticates the
  request; the panel streams the blob to a download. No setup.
- **From an external cluster app** (programmatic / central-MCP fetch of the latest kit): forward
  `Authorization: c3auth <sessionToken>` (typically `User.mySessionToken()`) to the Nexus mount. The
  caller needs `Nexus.User` on the Nexus app — the same authorization boundary the chat APIs use
  (see [Prerequisites](#prerequisites)). The payload is non-secret and byte-identical for every
  caller, so the gate scopes _who may call the API_, not what they receive. Discover `<nexusBase>`
  from `Microservice.Config.forName('Nexus').serviceAppId` (or the legacy `serviceAppUrl`) exactly
  as the embed component does.

## Prerequisites

- **Both apps on the same cluster host** — "both apps" means the **consuming app** (the one
  embedding the chat) and the **Nexus app** itself. Same origin (no CORS), same env IdP so
  cross-app token signatures verify, and the user must exist in both apps (automatic for OIDC
  users). A different cluster or a different IdP is out of scope.
- IdP default group mapped to `Nexus.User` on the **Nexus** app (cluster-once,
  `Nexus.Agent.ServiceApi.setOidcIdpConfigId('<idp-host>')`) — the planted cookie is only useful
  if the user can call the chat APIs. **This is the real authorization boundary**, and the first
  thing to check when a user cannot open the embedded chat. Why it fails the way it does, what does
  not substitute for it, the remedy, and the self-scoped `User.myUser()` groups/roles read to run
  **against the Nexus app** are all in [Cluster prerequisites](#cluster-prerequisites) above.
- `serviceAppId` (recommended; `serviceAppUrl` still handled) is discoverable by the consumer —
  normally one **CLUSTER**-scope publish made when Nexus is deployed, which every consumer app on
  the cluster reads with no per-app setup (step 0). **Multi-studio clusters:** when the env carries
  a `Microservice.Config.forName("Studio").appId` record, discovery reads the studio id and tries
  `Microservice.Config.forName('Nexus.' + studioId)`
  before the cluster-wide `'Nexus'` record — each Studio's operator publishes its own record; the
  cluster-wide one remains the fallback. **Nothing publishes it automatically**, so if
  the deploy skipped it, or one app must point at a **different** Nexus in the cluster, that consumer
  publishes its own **APP**-scope value (or passes `nexusBase`).
- Consumer app users resolve to a principal on the consumer app (for OIDC, map the default group
  to any role — the role needs **no permissions**; it exists only so the user exists).

### Find the real Nexus mount

Before publishing any config or passing `nexusBase`, **open the Nexus app directly** in a browser
and read its URL: `https://<host>/<env>/<app>/...`. The `<env>` and `<app>` segments are whatever
the Nexus deployment actually uses — not literally `nexus`, and not necessarily the consumer's own
env. Use those values when constructing the `serviceAppId` (`<cluster>-<env>-<app>`) or a manual
`nexusBase` (`/<env>/<app>`). Guessing `nexus` is the most common cause of wrong-path failures in
new integrations.

## Steps

### 0. Publish Nexus `serviceAppId` (cluster-wide once, or APP-scope per consumer)

`<NexusChatEmbed />` discovers the mount by reading `Microservice.Config` from the
**page's own app**, so a value has to be visible there. On multi-studio clusters
(`Microservice.Config.forName("Studio").appId` present), the resolver reads the studio id and
tries `forName('Nexus.' + studioId)` before
the cluster-wide `forName('Nexus')`. Publish **`serviceAppId`** — the recommended
route.

**Why `serviceAppId`, not a URL.** The resolver reduces whatever it reads to a **root-relative
pathname on the current browser origin** — it never targets the published host. `serviceAppId`
(`<cluster>-<env>-<app>`) carries no host at all, so its `/<env>/<app>` mount is **vanity-native by
construction**: the embed lands same-origin whether it loads on the canonical host or a customer
vanity domain (no CORS, and the browser's `c3auth` cookie is preserved because every call stays on
the page's own origin). The legacy `serviceAppUrl` (an absolute canonical URL) is **still handled**
for existing publishers — its host is discarded and only its pathname kept — but prefer
`serviceAppId` for new setups. When both are published, `serviceAppId` wins.

**Default — one CLUSTER-scope publish when Nexus is deployed.** `ConfigOverride.CLUSTER` needs
cluster admin, which the deploying admin already has, and one record then serves every consumer app
on the cluster:

```js
Microservice.Config.forName('Nexus').setConfigValue(
  'serviceAppId',
  '<cluster>-<env>-<app>', // the REAL Nexus app id (its own cluster+env) — do NOT assume the app is named "nexus" or shares the consumer's env
  ConfigOverride.CLUSTER
);
```

This is an explicit admin step — **nothing in this repo writes the CLUSTER record** (no app-start
hook, no deploy target), so on a cluster where it was never run, discovery fails and each consumer
needs the override below. Do **not** substitute ENV scope: v8 config stores are **per-app even at
ENV** (verified — an ENV write from one app is invisible to siblings), so ENV buys nothing a plain
APP write doesn't.

**Multi-studio clusters.** On clusters with multiple Studios, discovery automatically reads
`Microservice.Config.forName("Studio").appId` and tries a studio-scoped record
(`"Nexus.<studioId>"`) before falling back to the cluster-wide `"Nexus"` record. Single-Nexus
clusters with no Studio config see no change. The studio-scoped publish is an **operator** step
(see the MNE deployment runbook § "Multi-studio clusters") — embed consumers don't need to
do anything extra.

**Override — an APP-scope value on one consumer.** Use it when the cluster publish is missing, or
to aim a single app at a **different** Nexus (several in one cluster). APP wins for that app only,
and each consumer publishes for itself — **run it against the consuming app that hosts the chat
page, not against the Nexus app**: `NexusChatEmbed` reads the record from the page's own app, so an
APP write on Nexus reports success and discovery still fails. The call is in [Cluster
prerequisites](#cluster-prerequisites) — same `setConfigValue` with `ConfigOverride.APP`.
(Or skip discovery entirely: `<NexusChatEmbed nexusBase="/<env>/othernexus" />`.) `make
sync-embed-demo` re-pins the APP-scope override for the worked example by reading the **resolved**
Nexus config (`serviceAppId`, then `serviceAppUrl`) on the consumer app — it does **not** derive the
id from the consumer's own `App.inst().id`, so it never publishes a wrong `/<env>/<app>` when Nexus
is not co-located. If neither field resolves it **warns and skips** (publish the CLUSTER record above
first, or pass `nexusBase`).

Verified: a plain authenticated consumer user (no extra permissions) can
`POST <own>/api/8/Microservice.Config/forName` with `{ "name": "Nexus" }` and read the value —
no role grant needed for the read. The **APP**-scope write/read round trip is pinned by
`c3/nexusClientTest/test/js-rhino/mount-discovery/integration/test_nexus_mount_config_roundtrip.js`;
the cluster-wide visibility of a **CLUSTER**-scope record rests on platform override semantics, not
on a suite here — if discovery fails on a cluster you don't administer, reach for the APP override
rather than debugging the scope.

### 1. Package dependency

**None.** The consumer needs no C3 `c3pkg.json` dependency — `nexusClient` ships no C3 types.
The React library comes in via npm:

```json
{ "dependencies": { "@c3/agentix-client-ui": "file:../agentix-chat-ui" } }
```

(That is the shape the downloadable starter kit ships, where the library sits beside the app as
`agentix-chat-ui/`. In this repo the demo points at the monorepo path
`file:../../nexusClient/react` instead. Once the package is published, install it from the real
registry instead — see
[`consuming-agentix-client-ui.md`](../../docs/development/consuming-agentix-client-ui.md).)

**Do not** set `c3ShipUiContent: true` on nexusClient itself (it stays a library; the consumer
ships its own SPA with `c3ShipUiContent: true`).

#### React 19 is mandatory — adopt the reference `package.json`, do not hand-migrate

The library's peer deps **require React 19 + react-router v8**. The upgrade is **not** skippable. But
the fast path is a **one-shot dependency swap** (adopt the kit's `package.json`), **not** an incremental
migration of the React-18 template. Set these from the reference (they match `demo/package.json`):

| Dependency                          | Version                      | Note                                                           |
| ----------------------------------- | ---------------------------- | -------------------------------------------------------------- |
| `react` / `react-dom`               | `^19.0.0`                    | mandatory                                                      |
| `react-router`                      | `^8.3.0`                     | the package is `react-router` (v8), **not** `react-router-dom` |
| `i18next`                           | `^26`                        |                                                                |
| `react-i18next`                     | `^17`                        |                                                                |
| `@types/react` / `@types/react-dom` | **`^19.0.0` — NOT `19.3.x`** | see below                                                      |

**Pin `@types/react` / `@types/react-dom` to `^19.0.0`, not `19.3.x`.** The `19.3` line is far
stricter and floods the vendored library with type errors. This pin is the difference between a clean
build and hours of chasing library-internal type noise. Combined with delta B
([exclude the library from `tsc`](#deploy-deltas-copy-the-demo-then-change-only-these)), the
strictness error class disappears entirely.

**Edge case — a large existing app (not a fresh template).** Wholesale-replacing an app's own
`package.json` may break its React-18 code. Such apps must still reach React 19 (the library requires
it) — either adopt the reference versions and fix their own code, or migrate their own code first. For
a fresh template, copy-the-reference is the path and there is nothing else to migrate.

### 2. Mount pattern

```tsx
import { NexusChatEmbed } from '@c3/agentix-client-ui';

<Route path="/chat" element={<NexusChatEmbed agentDefId="C3Agent" />} />;
```

That's the whole integration. `NexusChatEmbed` discovers the Nexus mount via
`Microservice.Config.forName('Nexus').serviceAppId` (or the legacy `serviceAppUrl`), reduced to a
same-origin pathname (override with `nexusBase="/myenv/othernexus"`), runs the silent cookie
bootstrap, wires its own
`SessionProvider`, and renders the same `ChatPage` cluster the Nexus host uses. Host-page
requirements are ordinary app chrome, not auth: a react-router Router, a `QueryClientProvider`,
and the consumer's own theme provider above it — every C3 React app shell already has all three.
Mount at route path `/chat` specifically: ChatPage's internal navigation targets
`/chat#<sessionId>`.

**The consumer's own customization wins; adopt only the wiring.** Keep the consuming app's
routing, providers, theme and design tokens as they are — the chat renders against them. Do not
restyle the chat, fork its components, or copy files out of the package into the app: a fork
freezes at that commit and silently diverges from the mount it talks to (and the presentation
layer it needs is inside the package by design — see step 4).

#### Configuring the chat surface (consumer props)

Agent selection is the consumer's config, not a package default — so `agentDefId` is **required**.
The chat surface is otherwise all-on by default; an embed disables the pieces it doesn't want.
The same props exist on `ChatPage` for an in-host mount; `NexusChatEmbed` forwards them.

| Prop                    | Type      | Default      | Effect                                                                                                                                                                                                       |
| ----------------------- | --------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `agentDefId`            | `string`  | **required** | Agent definition id new chats start with. No hardcoded default in the package — the consumer supplies it. A router `location.state.agentDefId` deep-link still overrides the initial selection when present. |
| `allowAgentSwitch`      | `boolean` | `false`      | Show the in-chat agent switcher (header picker + sidebar new-chat agent menu). Off → every new chat is pinned to `agentDefId` (static agent-name label, no picker).                                          |
| `workspaceEnabled`      | `boolean` | `true`       | Workspace section (header toggle + right-hand file panel).                                                                                                                                                   |
| `connectAppsEnabled`    | `boolean` | `false`      | The add/connect-apps UI (AppsPicker connect input + studio picker). Off → users cannot attach apps to the chat.                                                                                              |
| `modelControlsEnabled`  | `boolean` | `true`       | Effort-level + LLM model pickers in the composer.                                                                                                                                                            |
| `sessionSidebarEnabled` | `boolean` | `true`       | Left chat-sessions sidebar. Off → the sidebar is not rendered at all (the chat column reflows to full width).                                                                                                |

```tsx
// Minimal embed pinned to one agent, no switcher, no app-connecting:
<NexusChatEmbed agentDefId="C3Agent" />

// Embed that also hides the workspace + session list (single-agent kiosk):
<NexusChatEmbed
  agentDefId="C3Agent"
  workspaceEnabled={false}
  sessionSidebarEnabled={false}
/>
```

`mcpAppsEnabled` (in-chat MCP _apps rendering_ — inline app-server + `ui://` resource UIs) is a
separate `ChatPage` prop, also default-off for embeds; it is distinct from `connectAppsEnabled`
(the connect/add-apps control).

### 3. Grant the mint action

**Nothing to grant.** `User.mySessionToken` is self-scoped and already in the platform's
unprivileged baseline (verified: a **zero-role** user gets 200). The consumer's user role needs
**no permissions** for the embed — it only has to exist so IdP users resolve to a principal on
the app:

```json
{ "id": "<YourApp>.User", "permissions": [] }
```

Map your IdP group to it as usual (deploy-time, per app):

```bash
c3api -c <cluster> -e <env> -a <consumerApp> UserGroup/addIdpGroupForIdp \
  '{"this":{"id":"<YourApp>.User"},"idp":"OidcIdpConfig::<cluster>.c3ci.cloud","idpGroup":"dev.OidcDefaultGroup"}'
```

The grant that _does_ matter is `Nexus.User` on the **Nexus** app — without it the cookie plants
successfully and the chat APIs then 403. It is granted on Nexus by whoever administers Nexus, not
by the embedding team; see [Cluster prerequisites](#cluster-prerequisites) for the check and the
remedy.

### 4. Vite resolve order

**Copy this from the demo — do not author it.** `viteShared.ts` + `vite.demo.config.ts` already encode
the correct `@/` alias order, the `makePinSingletons` + `makeForeignBareDepResolver` plugins, and the
`dedupe` list. The two-leg resolution below is _what they already do_; it is documented here so you can
verify the copy, not so you re-derive it.

The chat package is now **self-contained** — its own vite/tsconfig have no host `@/` fallback, and
`c3/nexusClientTest/react/src/packageBoundary.test.ts` locks the borrowing allowlist at **empty**.
So a consumer SPA `vite.config.ts` needs only two `@/` resolution legs:

1. **Consumer `src/`** — theme, local overrides win.
2. **`nexusClient/react/src/`** — NexusChatEmbed, ChatPage cluster, transport, hooks, the data/state
   layer (`lib/chatApi`, `lib/apiCore`, `lib/nexusBase`, session/recency/provisioning, the MCP +
   service-health React-Query hooks), **and** the whole presentation layer the chat renders (`ui/*`
   primitives, shared chrome, the `cn` helper). The package borrows nothing from the host tree.

The one thing the chat does **not** ship is i18n: it reads the `chat`, `common`, and `connect`
namespaces from a **consumer-provided** i18next context (`react-i18next`), exactly as it reads the
QueryClient and theme from consumer providers. Provide an initialized i18next with those namespaces.
Registering them with **empty** resources is a valid start — i18next returns the key for a missing
string, so the chat renders readable placeholders instead of crashing; the embed demo does exactly
that in `demo/i18n.ts`, and only the Nexus host SPA has real locale packs (`src/locales/`). No host
`@/` resolution leg is required.

Because everything **styled** now lives in (2), the consumer's Tailwind entry imports the package's
own styling source and registers **its own files** — `@source`-registering the Nexus host tree is
**not** required, and no part of the host tree is imported:

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@c3/agentix-client-ui/tailwind-sources.css'; /* registers the whole chat cluster */
@plugin '@tailwindcss/typography'; /* the `prose` classes the chat's Markdown rendering needs */
@source './**/*.tsx'; /* the consumer's own files */
```

That `@import` is the only chat-specific line, and it is load-bearing: paths inside
`tailwind-sources.css` resolve relative to that file, so it registers the package through the
`node_modules` symlink Tailwind would otherwise skip. The consumer supplies its own semantic tokens
(`bg-background`, `text-foreground`, the `dark:` variant) against its own design system — the chat
does not ship a token layer, so without them those utilities fall back to stock Tailwind values.

Getting this wrong is a silent, jsdom-invisible failure: a styled component the **host** owned
would be missing from the built CSS, and the MCP consent Dialog would portal into `<body>` with no
overlay / width clamp / open-state transform — mounted and hit-testable but invisible, reading as
"chat won't start" while the backend is perfectly healthy. Exact snippet + how to verify against
the built bundle: [`references/app-context.md`](./references/app-context.md).

Singleton libraries (`react`, `react-dom`, `@tanstack/react-query`, `react-router`, i18next) must
pin to one physical copy (the consumer's `node_modules`) — two copies of a provider library mean
the consumer's Provider and the chat UI's `useContext` read different instances, so context reads
come back empty at runtime. The same applies to the package's **own** modules: resolve it by real
path, not through the `node_modules` symlink, so a file reached as `@/components/ui/button` and as
`@c3/agentix-client-ui/components/ui/button` is one module (a second copy of a module holding
module-level state — e.g. `nexusBase`'s configured base — breaks the embed silently). Use the
`makePinSingletons` + `makeForeignBareDepResolver` Vite plugins from
`c3/nexusClient/react/demo/vite.demo.config.ts` as template. Note the package name is
`react-router` (v8), not the v6-era `react-router-dom` — pinning the old name silently pins
nothing.

### 5. Sync and deploy

```bash
# Reference wiring: sync-embed-demo builds + syncs the demo app, maps the OIDC group to the
# consumer's user role, and publishes Nexus serviceAppId + serviceAppUrl (APP). No dependency sync needed.
make sync-embed-demo C3_CLUSTER=<cluster> C3_ENV=<env>
```

### 6. Verify

1. Log in as a **plain (non-admin) user** — no second sign-in anywhere.
2. Open the chat route → brief "Connecting to Nexus…" → chat renders.
3. DevTools Network: one `myUser` probe (302/401), one `mySessionToken` (200), one Authorization'd
   `myUser` (200 + `Set-Cookie` for the nexus path), then normal chat traffic.
4. Send a message → reply streams live.
5. curl repro of the whole exchange (no browser needed):

   ```bash
   TOK=$(curl -s -u '<user>:<pass>' -X POST https://<host>/<consumer-env>/<consumer-app>/api/8/User/mySessionToken \
     -H 'Content-Type: application/json' -d '{}' | jq -r '.signedToken')
   curl -s -D - -o /dev/null -X POST https://<host>/<nexus-env>/<nexus-app>/api/8/User/myUser \
     -H "Authorization: c3auth $TOK" -H 'Content-Type: application/json' -d '{}' | grep -i set-cookie
   ```

## Migrating an app off the C3 Code (`nexusPkg`) template

An app wired before this design embeds the chat through the **C3 Code / `nexusPkg` template**: a
server-side proxy type (`NexusApiClient`) re-emitting chat traffic through the consumer's own
`/api/8`, usually alongside an auth gate (`NexusAuth` / `NexusAuthGate`) in front of the chat — some
apps on that template carry the proxy only, with no OAuth redirect, so check rather than hunt for
one. **None of it is required** — it is strictly more code on the per-turn path, and it drifted from
host behavior feature by feature. Refactor onto the direct connection above; delete rather than keep
in parallel (skip what this app does not have):

| Delete                                                             | Why it is now dead                                                                                                         |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| The server-side proxy types + every `c3Action` chat path they back | The browser drives the Nexus mount's REST surface directly — the same one the host UI uses. No proxy on either side        |
| The auth gate / `isAuthenticated` checks, where present            | `NexusChatEmbed` authenticates itself: the silent cookie bootstrap runs on mount and renders its own unavailable state     |
| Any custom token-minting facade (e.g. `NexusEmbedAuth.myToken`)    | The mint is the platform's self-scoped `User.mySessionToken` — nothing to grant, nothing to deploy (see the section above) |
| The OAuth redirect / second sign-in, **if this app has one**       | The chat runs as the already signed-in user, on that user's own session                                                    |
| The C3 package dependency added for the proxy                      | `nexusClient` ships no C3 types (step 1)                                                                                   |

Then wire it exactly as a fresh install (steps 0–4). A stale bundle still calling the old facade or
probing a role-gated endpoint is the top post-migration symptom — see Troubleshooting.

## Upgrading the library

An app **already on the direct connection** but built against an earlier starter kit needs more than
a reinstall if it predates the package rename: `@c3/nexus-client-ui` → `@c3/agentix-client-ui`. This
section applies **only** to an app that already depends on the old name. That is now a rare case —
the package has never been published to a registry, so the only apps carrying the old name are ones
wired by hand from a pre-rename kit; the admin panel's prompt therefore says nothing about a rename,
and this section is where the work is written down. Check for `@c3/nexus-client-ui` first: if it
appears nowhere, there is nothing to rename. Where it does apply, the old name survives in four
places outside the vendored directory, and a stale one fails at build/resolve time rather than
loudly:

| Rename surface                                                                  | Note                                                                                                                                      |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| The npm **dependency key** in the consumer's `package.json`                     | Only the key is renamed — the value still points at the vendored `agentix-chat-ui/` directory, which npm resolves by path                 |
| Every `import … from '@c3/…'` **specifier**                                     | Including the bare-package import of `NexusChatEmbed` (step 2)                                                                            |
| The Tailwind entry's `@import '<pkg>/tailwind-sources.css'` line                | Step 4 — the one chat-specific CSS line; a stale name means chat utilities silently vanish from the built CSS                             |
| The `@c3/…` **alias patterns** in the consumer's Vite config + `tsconfig` paths | Both are anchored on the package name (Vite alias regexes, `paths` entries), so a stale one resolves nothing rather than erroring clearly |

Then re-do the parts a new kit can change:

1. Replace the vendored `agentix-chat-ui/` directory with the one from the new ZIP and reinstall.
2. Re-check the shared single-copy packages and the **two** `@/` resolution roots (consumer `src/`
   first, then the library) against the demo's `vite.demo.config.ts` — it is the reference config
   (step 4).
3. **Re-read this file** for contract changes instead of assuming the previous wiring still holds;
   the kit is built from the same commit as the Nexus app that served it, so the two move together.
4. Standing rules are unchanged: don't restyle the chat, fork its components, or copy files out of
   the package.

Only the **npm package name** changed — the C3 packages are still `c3/nexusClient` /
`c3/nexusClientTest` and the vendored directory is still `agentix-chat-ui/`, so a sweep that renames
those has gone too far.

## Key constraints

| Constraint                                   | Detail                                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Same cluster host only                       | Cross-cluster / different IdP / cross-origin is out of scope (cookie + signature trust break)                                           |
| One mount per document                       | The Nexus base is a module-global written by each transport ctor — a second live transport with a different base wins for BOTH surfaces |
| One pod per user (v1)                        | Pod keys on `userId` alone; embed shares pod + history with the Nexus host UI                                                           |
| Route path must be `/chat`                   | ChatPage's internal navigation targets `/chat#<sessionId>`                                                                              |
| `c3ShipUiContent` stays false on nexusClient | Library, not a standalone app — consumer ships its own SPA                                                                              |
| Mint + probe must stay self-scoped           | `mySessionToken` / `myUser` only. `User/sessionToken` is admin-gated; `Echo/echoStr` is role-gated                                      |

## Stall preventers (read before you start editing files)

Small rules that each map to a real time sink. Do them up front.

### Never edit the vendored library

Every provider the chat needs — `TooltipProvider`, `Toaster`, `QueryClientProvider`, `initTheme` — lives
in the consumer's `main.tsx` (already present in the demo's). You should have **zero** hand-patches
inside `agentix-chat-ui/`. Patches to `NexusChatEmbed.tsx`, `appServerDetection.ts`, or `chatApi.ts` are
all avoidable and become unavoidable only when you skip delta B (so the library gets type-checked) or
move providers out of the host. A fork of any library file freezes at that commit and silently diverges
from the mount it talks to.

### `.gitignore` guard

Confirm the negation `!**/ui/agentix-chat-ui/src/lib/**` stays in `.gitignore`. The repo-root Python
`lib/` ignore rule otherwise silently drops the vendored library's `src/lib/`, producing the classic
**green-locally / red-in-CI** surprise: local builds pass, CI fails with `Rollup failed to resolve
"@/lib/theme"`. Check this before pushing.

### Clear the Vite optimizer cache after a React major

After bumping React across a major (18 → 19), a stale optimize bundle causes a recurring `useOptimistic`
error (the symptom of a React-18 pre-bundle lingering). Clear `.vite` / `.vite-temp` and refresh the UI
service — **don't** kill `npm` manually; let the service restart repopulate the optimizer cache.

### Keep kit ↔ library in lockstep

The kit is built from the same commit as the Nexus app that serves it, so the two move together — but a
**copy you downloaded earlier can go stale.** Stamp your copy with its source commit. An older library
copy lacked `deriveGatewayBase` / `crossClusterOAuthEnabled` / `mcpAppsEnabled` forwarding — the exact
gap that makes people reach for the (unneeded) discovery proxy in delta C. **Rule of thumb: if your
library appears to lack any of those, your copy is stale — re-download the kit** rather than working
around the gap.

## Troubleshooting

| Symptom                                                     | Likely cause                                                                                                                                                                        | Fix                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Nexus is unavailable." before any cookie traffic           | Discovery failed: no `serviceAppId` (or legacy `serviceAppUrl`) visible to this app (no CLUSTER publish and no APP override), or consumer cannot read `Microservice.Config/forName` | Step 0 publish (CLUSTER, or APP on this app); verify browser `forName` read; or pass `nexusBase`                                                                                                                                                                       |
| "Nexus is unavailable." for everyone                        | Nexus env stopped (503), or the page's own session is dead                                                                                                                          | `scripts/sne status`; re-login to the consumer app                                                                                                                                                                                                                     |
| Mint 403 / 404                                              | Stale bundle still calling a custom facade (`NexusEmbedAuth/myToken`) instead of the platform                                                                                       | Rebuild + resync the consumer UI; the mint must be `User/mySessionToken`                                                                                                                                                                                               |
| Probe always fails though user can open Nexus               | Stale bundle probing a role-gated endpoint (e.g. `Echo/echoStr`) or wrong param (400 NoMatch)                                                                                       | Rebuild + resync the consumer UI; probe must be `User/myUser`                                                                                                                                                                                                          |
| Exchange 401 at the nexus mount                             | User doesn't exist in the Nexus app (test users are per-app) or IdP signature mismatch                                                                                              | OIDC users exist everywhere — for test users create them in both apps; for signature issues `emptyAllCaches()`                                                                                                                                                         |
| Cookie plants but chat APIs 403 ("I can't access the chat") | User lacks `Nexus.User` on the **Nexus** app. A role on the **consuming** app grants nothing there.                                                                                 | Check what the user holds with the self-scoped `User.myUser()` read in [Cluster prerequisites](#cluster-prerequisites), run **against Nexus**; then cluster-once `setOidcIdpConfigId` mapping on Nexus, or ask the Nexus administrator to add the user to `Nexus.User` |
| `No QueryClient set`                                        | Consumer shell missing `QueryClientProvider`                                                                                                                                        | Add it above the route (normal app chrome)                                                                                                                                                                                                                             |
| Session-expiry banner loops                                 | Nexus cookie expired mid-session and re-mint failed (own session dead too)                                                                                                          | Expected handoff: host app's reauth takes over; embed re-mints silently only while the page session is alive                                                                                                                                                           |

## Agent authoring

Same-cluster builder apps author on the Nexus mount the same way they drive chat — cookie / `c3auth`, no BFF.

- **Agent definitions** — list, create, update, and delete at `<nexusBase>/agent-api/v1` (`Nexus.Agent.SessionApi`). Create/update accept attach-by-name arrays (`skill_names`, `custom_tool_names`, and flag-gated `plugin_names`).
- **Global skill bodies** — create, update, list, get, and delete at `<nexusBase>/agent-skills-api/v1` (`Nexus.Agent.SkillApi`). Writes are admin-only and always global — REST has no user-scope door.
- **Plugins** — create/list/get/update/delete at `<nexusBase>/agent-plugins-api/v1` (`Nexus.Agent.PluginApi`). Every method is 404 `feature_disabled` while `nexus-plugins` is off.
- **MCP connections** — list, create, update, and delete at `<nexusBase>/agent-mcp-api/v1` (`Nexus.Mcp.ConnectionRestApi`). Writes are admin-only.

Get the contract. The only URL hardcoded for discovery:

```
GET <nexusBase>/agent-api/v1/openapi.json
```

That is `SessionApi.getOpenApiSpec`. Same cookie / `c3auth` as the embed is enough to call it.

**Full authoring how-to ships in this kit** at `references/agentix-agent-authoring/SKILL.md` — the
end-to-end recipe for creating/configuring an agent and authoring + attaching skills, MCP connections,
and plugins by name over REST, with the agent structure, capability catalog, auth matrix, and the
delete-subpath quirk. It is the full skill folder (SKILL.md + helper scripts) documenting the same REST door this kit uses,
a verbatim snapshot of the bundled
[`agentix-agent-authoring`](../../c3/nexus/resource/agent/skills/agentix-agent-authoring/SKILL.md)
skill — the single source — injected into the kit at build time.

## Reference

- Package: [`c3/nexusClient/`](../../c3/nexusClient/) (`README.md` has ownership rule)
- Design: [`docs/design/nexus-client/nexus-client.md`](../../docs/design/nexus-client/nexus-client.md)
- Worked example (embed demo): [`c3/nexusClient/react/demo/`](../../c3/nexusClient/react/demo/) + `make sync-embed-demo`
- Per-app template values: [`references/app-context.md`](./references/app-context.md)
- Starter-kit admin guidance (rendered on the Embed chat card, shipped in the ZIP): [`references/starter-kit.md`](./references/starter-kit.md)
- Get the kit yourself (agent-driven download — discovery, `c3auth` mint, raw-exec + no-`curl` fallbacks): [`references/get-the-kit.md`](./references/get-the-kit.md)

## Mandatory self-review

1. Is `serviceAppId` (recommended) — or the legacy `serviceAppUrl` — discoverable from the consuming app — the **CLUSTER**-scope publish made when Nexus was deployed, or a deliberate **APP**-scope override on this consumer (missing cluster record, or a different Nexus)?
2. Is the mint the platform's `User/mySessionToken` (not a custom facade), reading `.signedToken`?
3. Is the component mounted at route path `/chat`?
4. Is the required `agentDefId` passed, and are the chat-surface toggles (`allowAgentSwitch`, `workspaceEnabled`, `connectAppsEnabled`, `modelControlsEnabled`, `sessionSidebarEnabled`) set to match the embed's intent (all default-on except `allowAgentSwitch` / `connectAppsEnabled`)?
5. Does the consumer's Vite config resolve `@/` in the correct order — consumer `src/` first, then `nexusClient/react/src/` (**two** legs; there is no host leg, the package borrows nothing from the host tree)?
6. Are singleton libraries pinned to one copy?
7. Has cluster-once Nexus setup been run (IdP default group → `Nexus.User` on the Nexus app) — and if a user still cannot open the chat, has the self-scoped `User.myUser()` groups/roles read been run **against Nexus** before anything else is changed?
8. Is `c3ShipUiContent: true` set on the **consumer** package (not nexusClient)?
9. Does the consumer's Tailwind entry import `@c3/agentix-client-ui/tailwind-sources.css` (the package registers itself) and `@source`-register only its own files — with **no** import of and no `@source` into the host tree — and does the consumer supply its own semantic tokens and `dark:` variant?
10. Verified with a **plain user**, not just an admin — and did the reply arrive as incremental NDJSON rather than one buffered blob (step 6)?
11. Migrating an existing app: are the old proxy types, `c3Action` chat paths, auth gate, token-minting facade, OAuth redirect (where the app had one), and the C3 package dependency **deleted** — not left running beside the direct connection?
12. Upgrading an app that already depended on the older build (skip entirely if `@c3/nexus-client-ui` appears nowhere): has the package rename been applied to **all four** surfaces (dependency key, every import specifier, the Tailwind `tailwind-sources.css` import, the `@c3/…` Vite alias + `tsconfig` paths), the vendored `agentix-chat-ui/` replaced and reinstalled, and this file re-read for contract changes?
13. Did I **copy** the demo (`vite.demo.config.ts`, `viteShared.ts`, `tsconfig.json`, `main.tsx`, `i18n.ts`, `demo.css`) rather than re-derive `makePinSingletons`, dedupe, alias order, or `tsconfig` paths by hand?
14. Did I adopt the reference React 19 versions in one shot (`react`/`react-dom` `^19`, `react-router` `^8.3.0`, `i18next` `^26`, `react-i18next` `^17`) and pin `@types/react` / `@types/react-dom` to **`^19.0.0`, not `19.3.x`**?
15. Did I apply **all four** deploy deltas — `HashRouter` (no basename, delete `basename.ts`/`resolveBasename.ts`), the `tsconfig` ambient-stub library exclusion, **no** dev/discovery proxy, and `npm install` only in the consumer (never in `agentix-chat-ui/`)?
16. Did I leave the vendored library unpatched, keep the `.gitignore` negation for `ui/agentix-chat-ui/src/lib/**`, clear the Vite optimizer cache after the React major, and treat a missing `deriveGatewayBase`/`crossClusterOAuthEnabled`/`mcpAppsEnabled` as a signal to re-download rather than proxy around?
17. **Speed vs. correctness:** did I copy the shared wiring verbatim (Vite resolution, `tsconfig` paths, provider tree) rather than re-derive it, spend care only on the small consumer-specific surface (deploy deltas + `agentDefId`/theme/i18n/toggles), and run the one-line built-CSS grep to prove the presentation layer landed?
18. **Agent-driven kit download (only when the kit is not already in my dirs):** did I first check my working tree for an existing copy (`demo/` + `agentix-chat-ui/`, `resources/agentix-chat-code/`, or an unextracted `.tgz`) and skip the download if present; and when it was genuinely absent, discover `<nexusBase>` from **my** app's `Microservice.Config.forName('Nexus')` (not a guessed id, feature-checking `.endpoint()`), run the whole authenticated download **inside the runtime** (not assuming a shared filesystem or a shell `c3auth` session), used **one exec language throughout** (JS by default, or `c3.`-prefixed platform types if Python), mint the token in the same snippet, ferry the bytes back base64+sha256-verified in planned chunks, and then read the **bundled** `SKILL.md` at the extraction root rather than working from memory?

Present a brief self-review after writing — if weaknesses are found, fix them before presenting.
