---
description: C3 Instructions for Nexus Agent Chat App (zero-BFF NexusChatEmbed)
alwaysApply: false
---

# Nexus Package — C3 AI Nexus Agent Chat Application

Same-cluster Nexus chat embed using the **zero-BFF** `NexusChatEmbed` drop-in. The browser talks
to the Nexus app mount **directly** (the same restful surface the Nexus host UI uses); there is no
server-side proxy and no custom auth gate. Sign-in rides the page's own session via a one-time,
silent `c3auth` cookie exchange.

## Architecture

```
browser ── cookie (own app path) ──► consumer /api/8/User/mySessionToken   (once, silent)
browser ── Authorization: c3auth ──► nexus /api/8/User/myUser → Set-Cookie  (once, silent)
browser ── cookie (nexus path) ────► nexus /api/8 + agent pod               (everything after)
```

- **No server-side integration.** The silent exchange mints via the platform's self-scoped
  `User.mySessionToken`, so the consumer needs **no C3 package dependency, no custom type, and no
  role grant**. The old `NexusApiClient` proxy and `NexusAuth` gate are deleted.
- **Discovery.** `<NexusChatEmbed>` finds the Nexus mount from
  `Microservice.Config.forName('Nexus').serviceAppUrl`. The library's `ownApiBase()` now derives this
  page's own control-plane base from the **served path** (`deriveGatewayBase`), NOT `import.meta.env.DEV`:
  a gateway-served page (built deploy, or C3 Code dev behind the gateway at `/<env>/<app>/…`) yields
  `/<env>/<app>/api/8`, so the discovery POST resolves; only a bare-localhost dev server yields the
  flat `/api/8`. **So no `nexusBase` override is needed** — the template no longer passes one, and
  discovery works out of the box behind the C3 Code gateway. A consumer on a different cluster/Nexus
  mount can still pass an explicit `nexusBase` to skip discovery, but it is no longer required.
- **Transport.** `InClusterTransport({ baseUrl })` points at the discovered Nexus mount and streams
  NDJSON from the agent pod. Pods key on `userId` (one per user) and are shared with the Nexus host.

## Chat surface (`NexusChatEmbed` props)

`agentDefId` is **required** (the consumer picks the agent — the package ships no default; a router
`location.state.agentDefId` deep-link still overrides the initial selection). The surface is
otherwise all-on by default; an embed turns off what it doesn't want:

| Prop | Default | Effect |
| --- | --- | --- |
| `allowAgentSwitch` | `false` | In-chat agent switcher (header picker + new-chat menu). Off → every chat pinned to `agentDefId`. |
| `workspaceEnabled` | `true` | Workspace section (header toggle + file panel). |
| `connectAppsEnabled` | `false` | Connect/add-apps UI. Off → users cannot attach apps. |
| `crossClusterOAuthEnabled` | `false` | Cross-cluster per-user OAuth connect path (the "ADD EXTERNAL APP" free-text id/URL input). New in this library drop; fails closed by default. |
| `modelControlsEnabled` | `true` | Effort-level + LLM model pickers in the composer. |
| `sessionSidebarEnabled` | `true` | Left chat-sessions sidebar. Off → chat column reflows full-width. |
| `mcpAppsEnabled` | `false` | Inline MCP _app rendering_ (live app-server + `ui://` resource apps). A separate `ChatPage` concern, distinct from `connectAppsEnabled`. **The new library forwards it** (earlier drops did NOT). |

**This library drop added `crossClusterOAuthEnabled` and now forwards `mcpAppsEnabled`.** The new
`NexusChatEmbedProps` gained `crossClusterOAuthEnabled?: boolean` and `mcpAppsEnabled?: boolean`
(both default false), each passed straight through to `ChatPage`, so all seven optional surfaces can
be enabled with no library edit. (The Nexus host still derives its own `mcpAppsEnabled` from the
`nexus-mcp-apps` PostHog flag and `crossClusterOAuthEnabled` from `nexus-cross-cluster-user-oauth`.)

**This template enables ALL SEVEN surface props** on the `/chat` embed (`src/EmbedRoutes.tsx`) —
`allowAgentSwitch`, `workspaceEnabled`, `connectAppsEnabled`, `crossClusterOAuthEnabled`,
`modelControlsEnabled`, `sessionSidebarEnabled`, `mcpAppsEnabled` — matching the ZIP demo's
`EmbedDemoRoutes` exactly (the demo turns every one on). Full Nexus-host parity — the same chat
surface the host exposes.

## Frontend (`ui/react/`)

Minimal consumer SPA that mounts the vendored chat library. Key files:

Routing uses **`HashRouter`** (not `BrowserRouter`), matching every other Genesis / C3 Code UI
template in this repo (`genaiPkg`, `proPkg`, `repo/genesis`). The bundle is served under the Genesis
gateway (`/<env>/<app>/uiservice/…`) inside the Studio iframe; BrowserRouter's `/`→`/chat` redirect
rewrote the real pathname the iframe wrapper/gateway couldn't serve on reload, and the `/<env>/<app>`
basename math never matched the deeper served base. Hash routing is opaque to the gateway, needs no
basename, and keeps the redirect inside the fragment. ChatPage's `/chat#<sessionId>` navigation still
works: react-router serializes the session id as the nested hash after the `/chat` route path.

- `src/main.tsx` — providers the chat reads from context: `QueryClientProvider`, `TooltipProvider`,
  `Toaster`, `initTheme()`, and `HashRouter`. **Mirrors the demo's `demo/main.tsx`** provider tree and
  import order (`./i18n` then `./globals.css` then the routes), with the one deploy adaptation below
  (HashRouter instead of the demo's `BrowserRouter` — and consequently no `resolveBasename`, since a
  basename is meaningless under HashRouter; the demo's `basename.ts`/`resolveBasename.ts` are NOT
  vendored).
- `src/EmbedRoutes.tsx` — `<Routes>` mounting `<NexusChatEmbed agentDefId="C3Agent" …/>` with **ALL
  SEVEN surface props ON** (`allowAgentSwitch workspaceEnabled connectAppsEnabled
  crossClusterOAuthEnabled modelControlsEnabled sessionSidebarEnabled mcpAppsEnabled`) at **`/chat`**
  (load-bearing: ChatPage navigates to `/chat#<sessionId>`), with `/` and `*` redirecting to `/chat`.
  This is a **verbatim mirror of the demo's `EmbedDemoRoutes`** — same wrapper element classes (`flex
  h-screen w-full overflow-hidden bg-background` outer + `flex min-h-0 min-w-0 flex-1 flex-col
  overflow-hidden` inner, which drive the chat's full-height layout) and the same all-props-on surface.
  **No `nexusBase` prop** (deploy adaptation vs the demo, which passes `nexusBase={VITE_NEXUS_BASE}`
  only for its local dev-server proxy) — the library's `ownApiBase()` derives the discovery base from
  the served path, so mount discovery resolves on its own behind the C3 Code gateway (see **Discovery**
  above).
- `src/i18n.ts` — **a verbatim mirror of the demo's `demo/i18n.ts`.** Registers the `common`/`chat`/
  `connect` namespaces with EMPTY resources on a fresh react-i18next instance; the vendored library then
  registers its bundled English packs at mount (`NexusChatEmbed` → `ensureNexusChatI18nDefaults`) as a
  LOW-PRIORITY fallback into this same instance, so the chat renders real English text with zero copied
  content here. `main.tsx` imports it first (before `./globals.css`), exactly as the demo does. A
  consumer that wants to override copy inits its own strings here and they win.
- `src/globals.css` — **a VERBATIM copy of the demo's `demo/demo.css`.** Does `@import 'tailwindcss'`
  + `@import 'tw-animate-css'` + `@import '@c3/agentix-client-ui/tailwind-sources.css'` + a
  layout-critical `@source inline(...)` pin + `@plugin '@tailwindcss/typography'` + `@source
  './**/*.{ts,tsx}'` + `@import '@c3/agentix-client-ui/styles/theme.css'` **LAST** + a page-level
  `@layer base` block. This is the CORRECT setup because this consumer resolves the library **from
  source** (its `vite.config.mts` aliases `@c3/agentix-client-ui` → `../agentix-chat-ui/src`, identical
  to the demo's `vite.demo.config.ts`), so — exactly like the demo — the consumer's Tailwind pass scans
  the library source plus this consumer's own files in ONE coherent build. The chat's tokens/fonts/base
  come from `@c3/agentix-client-ui/styles/theme.css` (the SAME single package-exported source the Nexus
  host imports: Geist `@font-face`, the color token layer light+dark, the `@theme inline` ShadCN bridge,
  the `dark:` variant), imported LAST so its `@layer base` lands in order. The trailing `@layer base`
  block ports the host's page-level surface rules (box-sizing, `html,body,#root` height/font/background,
  bare `a`/`input`/`button`/`pre`/`code` styling) that `theme.css` deliberately omits — needed by a
  full-page consumer. **This is byte-for-byte what the demo does, and the demo is the known-good
  reference.** (The library ALSO ships a precompiled `styles/embed.css` that `NexusChatEmbed` imports at
  mount — a self-contained scoped copy of the same look for consumers that do NOT build Tailwind from
  source; a from-source consumer like this one and the demo gets the look from `theme.css` + its own
  Tailwind pass, and the mount-time `embed.css` merges harmlessly under the same `.nexus-chat-embed`
  scope.)

  **WHY this mirrors the demo (superseding the earlier "no second Tailwind build" theory).** An
  earlier iteration stripped this file to ~3 hand-authored rules on the theory that `@import
  'tailwindcss'` produced a doubled Tailwind build with an inverted `@layer` order (`components`
  outranking `utilities`) that turned the workspace divider into a solid blue bar. **That theory was
  disproven by building the shipped demo and diffing its emitted CSS.** The demo resolves the library
  from source, so there is exactly ONE Tailwind build; mirroring the demo's exact CSS entry is the fix.
  Stripping the consumer entry only made this consumer DIVERGE from the demo (the drift the user
  reported as "still looks wrong").

  **Built-CSS proof (fresh demo parity — this drop).** This consumer build was compared against a
  fresh build of the shipped demo (`demo/`, library resolved from the same source). Both emit a
  **341 kB** `index.css` with an **identical single coherent `@layer` order**:
  `properties, theme, base, components, utilities` — `utilities` LAST, Preflight present exactly ONCE
  (one `text-size-adjust` rule, no doubled Preflight), `components` NOT outranking `utilities`. A
  normalized rule-by-rule diff of the two built stylesheets found the ONLY difference to be a single
  extra utility in ours (`.invisible{visibility:hidden}`, pulled in by this template's all-props-on
  `NexusChatEmbed` surface) — every other rule byte-identical (demo 341132 B vs ours 341161 B). The
  divider resolves `.bg-transparent{background-color:#0000}` at rest with no non-hover `.bg-primary`
  rule (no blue bar). Geist + Geist Mono `@font-face` are present (4 faces, woff2 emitted as sibling
  assets); host tokens resolve `--accent` `#2266f0` (light) / `#93c5fd` (dark), `--border` `#d8dce8`
  (light) / `#434852` (dark), `--radius` `8px`; the host type scale + line-height are present
  (`--text-base` `1rem`, `--text-base--line-height` `1.5`). The consumer's rendered result therefore
  matches the demo's.

  **Layout & density come from the library + the demo's globals (like the demo).** ChatPage's
  full-height layout and its base surface are NOT hand-authored consumer rules. The demo-copied
  `@layer base` block supplies the page-level surface (`html,body,#root { height:100%; font-family:
  var(--font-sans); background:var(--bg-primary); … }`), and the wrapper `NexusChatEmbed` renders is
  `.nexus-chat-embed h-full w-full`. The consumer's `EmbedRoutes` wrapper (mirroring the demo's
  `EmbedDemoRoutes`) supplies the viewport height — `flex h-screen w-full overflow-hidden bg-background`
  outer + `flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden` inner — and the `h-screen`/`flex`/
  `min-h-0` utilities are emitted by the consumer's own Tailwind pass (that's why `globals.css` has
  `@source './**/*.{ts,tsx}'`). This is identical to the demo, and the demo renders at full height, so
  there are **no** consumer-side `.h-screen` / `.nexus-chat-embed { display:flex }` /
  `.nexus-chat-embed { line-height:1.5 }` patches to carry.

  **Deploy adaptations (the ONLY places this consumer intentionally differs from the demo).**
  `HashRouter` instead of the demo's `BrowserRouter` + `resolveBasename()` (Genesis gateway / Studio
  iframe — see the Routing note above; the demo's `basename.ts`/`resolveBasename.ts` are consequently
  NOT vendored, a basename being meaningless under HashRouter); **no `nexusBase`** (the demo passes it
  only for its local dev-server proxy); the C3 build config in `vite.config.mts`
  (`outDir ../content/<VITE_C3_PKG>`, `assets/[name]` naming, `serve` vs build `base`, the manualChunks
  vendor split); the `tsconfig.build.json` build-types stub (scopes `tsc` to the consumer `src/**`); the
  consumer `index.html` (root `<div id="root">` + `./src/main.tsx` entry + the byte-compatible FOUC theme
  script + favicon); the `globals.css` filename (the demo's is `demo.css`; contents byte-identical); and
  `package.json` runtime deps. Everything else — the CSS entry contents, i18n bootstrap, provider tree,
  and wrapper element classes — is a verbatim mirror of the demo.

  **Default theme.** The consumer's `index.html` inlines a byte-compatible FOUC snippet
  (`localStorage 'nexus_theme' === 'dark' ? 'dark' : 'light'`, catch → light) and `main.tsx` calls
  `initTheme()`; both stay in lock-step with the vendored `lib/theme.ts`. The library defaults LIGHT.



## Vendored library (`ui/agentix-chat-ui/`)

`@c3/agentix-client-ui` is vendored as a sibling of `ui/react/` and consumed via
`file:../agentix-chat-ui`. It ships the whole ChatPage cluster, the `components/ui/*` primitives, and
`singletonLibs.ts` (the canonical single-copy library list). Do not change `"c3ShipUiContent": false`.

**`ui/agentix-chat-ui/` is a pristine, unmodified copy of the ZIP library — never edit anything
inside it.** In the deploy layout (C3 Studio / test dirs) it has **no `node_modules`** — the consumer
resolves the library's runtime deps (tiptap, radix-ui, marked, dompurify, …) from `ui/react/`'s own
install (every library runtime dep is listed in `ui/react/package.json`, see Build wiring). Any
consumer-side logic belongs in `ui/react/`, never in the vendored dir.

**`.gitignore` gotcha — the vendored `src/lib/` MUST stay tracked.** The repo-root `.gitignore` has a
Python `lib/` rule that matches EVERY `lib/` directory, including the library's `src/lib/` (which holds
`theme.ts`, `chatApi.ts`, `utils.ts`, and ~55 other real TS modules the consumer resolves `@/lib/…`
against at build time). That rule is explicitly negated for both UI `src/lib/` trees:
`!**/ui/react/src/lib/**` AND `!**/ui/agentix-chat-ui/src/lib/**`. Without the second negation the
vendored `src/lib/` is silently dropped from a clean `git` checkout, so local builds (files present on
disk) pass but **CI fails** with `Rollup failed to resolve import "@/lib/theme"` after only ~2 modules
transform. After any library re-drop, confirm `git status`/`git check-ignore` still tracks
`ui/agentix-chat-ui/src/lib/` — the alias config in `vite.config.mts` is correct and is NOT the fix.

## Build wiring (`ui/react/vite.config.mts` + `viteShared.ts`)

- `@/…` resolves in order `[./src, ../agentix-chat-ui/src]` (consumer files win, then the library).
- `@c3/agentix-client-ui` aliases to the vendored `../agentix-chat-ui/src`.
- The single-copy library list travels **with the library**: `viteShared.ts` is copied verbatim from
  the ZIP demo and imports `SINGLETON_LIBS` from `../agentix-chat-ui/singletonLibs`. The consumer
  config never inlines its own copy, so a future library drop-in updates the list automatically.
- `SINGLETON_LIBS` are pinned to the consumer's single copy and deduped — context-bearing libs must
  resolve once or the chat renders with empty context. These are the only library deps the consumer
  `package.json` lists (see below); every other library dep resolves from the library's own install.
- C3 build integration is preserved: `outDir: ../content/<VITE_C3_PKG>`, `assets/[name]` naming, the
  `serve` vs build `base`, and the `VITE_C3_PKG` requirement. There are **no** dev proxies.
- **Type-check scope.** `build:ui` runs `tsc -p tsconfig.build.json`, which type-checks **only the
  consumer's own `src/**`**. The vendored library (`../agentix-chat-ui/src/**`) is intentionally
  excluded from `tsc`: it ships pre-type-checked from its own repo, and in the deploy layout
  (C3 Studio / test dirs) it has no `node_modules`, so re-checking it would fail on its bare imports.
  `tsconfig.build.json` therefore overrides `paths` to drop the legs that resolve into library
  source (the `@/*` fallback into `../agentix-chat-ui/src/*` and `@c3/agentix-client-ui[/*]`) and
  points those imports at the build-only ambient stubs in `ui/react/build-types/`, so the library is
  treated as an opaque external dependency. `tsconfig.json` (the editor/IDE config) is left intact
  and still resolves the real library types for IntelliSense. `tsc` here only gates the consumer's
  own code; **runtime** resolution of these imports is vite's job, not tsc's.

## Upgrading the embedded chat library

A newer `agentix-chat-ui/` is a clean copy-paste drop-in. The procedure:

1. `rm -rf ui/agentix-chat-ui` and copy the new `agentix-chat-ui/` from the ZIP in its place (do not
   edit anything inside it).
2. `cd ui/react && npm install && VITE_C3_PKG=<pkg> npm run build:ui`. The vendored library needs
   **no** `node_modules` of its own (mimicking C3 Studio, which never installs there) — its runtime
   deps resolve from `ui/react/`'s install. Reconcile the `ui/react/package.json` dep list first if
   the new library added deps (see "NOT automatic" below).

What is **automatic** (no consumer edit): the singleton list (`viteShared.ts` re-reads the new
`singletonLibs.ts`), the build type-check scope — `tsconfig.build.json` checks only the consumer
`src/**` and treats the library as an opaque external dependency via the ambient stubs in
`ui/react/build-types/`, so a drop-in of newer library source needs no tsconfig change (the stubs
cover `@c3/agentix-client-ui` and the `@/` library imports generically) — **and now the whole LOOK +
the i18n text**: the chat's tokens/fonts/base ship inside the library and reach this consumer through
`globals.css`'s `@import '@c3/agentix-client-ui/styles/theme.css'` (built from source by the consumer's
own Tailwind pass, like the demo; the library also ships a precompiled `styles/embed.css` that
`NexusChatEmbed` imports at mount for non-from-source consumers), and the English
`common`/`chat`/`connect` packs ship in the library (`locales/en/*.json` + `lib/i18nDefaults.ts`,
registered at mount). So there are **no consumer fonts, host color tokens, type-scale overrides, or
vendored locale packs to re-fetch or re-sync on upgrade** — a drop-in of the new `agentix-chat-ui/`
carries all of it.

What is **NOT automatic** — reconcile on upgrade:

- **The consumer `package.json` dependency list.** The consumer lists `@c3/agentix-client-ui` + EVERY
  runtime dep the library imports (the deploy pipeline installs ONLY in `ui/react/`), and the
  singletons among them are additionally pinned in `vite.config.mts`. Reconcile against the union of
  the new library `package.json`'s `dependencies` **and** its `peerDependencies` — the library now
  declares `i18next` / `react-i18next` (and `react` / `react-dom`) as `peerDependencies`, i.e. the
  consumer must provide them (this template already lists `i18next`, `react-i18next`,
  `i18next-browser-languagedetector`, `react`, `react-dom`). If the new `singletonLibs.ts`
  adds/removes/renames an entry, mirror that in both the dep list and the pinned singletons.
- **Package rename** (`@c3/nexus-client-ui` → `@c3/agentix-client-ui`) — applies **only** if upgrading
  an app that still depends on the old name (check for `@c3/nexus-client-ui` first; if it appears
  nowhere there is nothing to rename). The old name survives in **three** surfaces:
  1. the npm **dependency key** in `ui/react/package.json` (the `file:` value still points at
     `../agentix-chat-ui`);
  2. every `import … from '@c3/…'` **specifier** (including the bare `NexusChatEmbed` import);
  3. the `@c3/…` **alias** in `vite.config.mts` and the `paths` entry in `tsconfig.json` (and the
     mirrored `@c3/…` `paths` override in `tsconfig.build.json`, plus the matching `declare module`
     in `ui/react/build-types/vendored-library.d.ts`).

  (The consumer's `globals.css` DOES `@import '@c3/agentix-client-ui/tailwind-sources.css'` AND
  `@import '@c3/agentix-client-ui/styles/theme.css'` — mirroring the demo's `demo.css` — so on a
  package rename these two import specifiers are additional surfaces to update alongside the three
  above.)

  Only the npm package name changed — the vendored directory stays `agentix-chat-ui/`, so a sweep
  that renames the directory has gone too far.
- **Contract changes.** The kit ships from the same commit as the Nexus app, so they move together.

## Setup

See **`SETUP.md`** for the two cluster-side prerequisites: publish `serviceAppUrl` on the consuming
app's `Microservice.Config.forName('Nexus')`, and grant the user `Nexus.User` on the Nexus app.
