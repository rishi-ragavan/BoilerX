# Starter kit

**Extract the bundle, then give the `resources/agentix-chat-code/demo/` folder to your coding agent**
along with the prompt below. The agent reads this file (`SKILL.md` + `references/` sit at the root of
the bundle) and wires the chat into your app. One extract yields the whole kit — the code is not a
second archive.

## How to get the kit (admin)

The kit downloads from the Nexus app's admin UI — you are most likely already looking at it:

1. Open the Nexus app and go to the **admin area** (the `/admin` route).
2. Select the **Embed chat** tab.
3. Click **Download** — your browser's existing session authenticates it, so there is no extra
   sign-in. The file saves as `agentix-chat-embed.tgz`.
4. Extract it (`tar -xzf agentix-chat-embed.tgz`) and hand the `resources/agentix-chat-code/demo/`
   folder to your coding agent along with the prompt below.

The **Embed chat** tab is **admin-only** — if you don't see it, you lack the Nexus admin role; ask a
Nexus administrator to download the kit for you, or to grant the role. (A coding agent that needs the
kit without a human can fetch it directly — see
[Get the kit yourself](../SKILL.md#get-the-kit-yourself-agent-driven-no-human-handoff).)

If your app is still on the **C3 Code / `nexusPkg`** template, delete its proxy and auth gate first —
see [Migrating an app off the C3 Code template](../SKILL.md#migrating-an-app-off-the-c3-code-nexuspkg-template).

## What's in the bundle

The served bundle (`agentix-chat-embed.tgz`) is this skill folder with the code merged in — everything
gzipped once, so a single extract yields it all:

| Entry                                 | What it is                                                                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                            | Skill instructions                                                                                                                                          |
| `references/`                         | Supporting references (this file included)                                                                                                                  |
| `references/agentix-agent-authoring/` | How to **author agents** over REST — create/configure an agent and author + attach skills, MCP connections, and plugins by name (SKILL.md + helper scripts) |
| `resources/agentix-chat-code/`        | The code — the two directories below, extracted                                                                                                             |

`resources/agentix-chat-code/` holds:

| Directory          | What it is                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `demo/`            | A working consumer app. `cd demo && npm install && npm run build` is a build check — see below |
| `agentix-chat-ui/` | The chat library the demo builds against as `file:../agentix-chat-ui`                          |

## Cluster prerequisites

Two cluster-side records decide whether the wired chat works for a user. Nothing writes them
automatically. Both are one-time, and both belong to whoever administers Nexus and the cluster — not
to the embedding team.

**Nexus mount discovery — `serviceAppId`** (recommended; the legacy `serviceAppUrl` is still handled).
Nexus normally publishes this once at deploy, cluster-wide, and every consumer app reads it with no
per-app setup (step 0). **Multi-studio clusters** (`Microservice.Config.forName("Studio").appId` set): discovery reads
`Microservice.Config.forName("Studio").appId` and tries `Microservice.Config.forName('Nexus.' + studioId)` before
the cluster-wide `'Nexus'` — each Studio's
operator publishes its own record. If that publish was skipped, discovery fails and the chat renders
**"Agentix is unavailable."** — publish an **APP**-scope value on the consuming app instead (or, to
point one app at a **different** Nexus, pass `nexusBase`).

> **Find the real mount first.** Open the Nexus app directly in a browser and read its URL —
> `https://<host>/<env>/<app>/...`. The `<env>` and `<app>` segments are whatever the Nexus
> deployment actually uses — not literally `nexus`, and not necessarily the consumer's own env.
> Use those values in the publish below.

Run the write **against the consuming app that hosts the chat page, not against the Nexus app**. The
component reads the record from the page's own app, so an APP write on Nexus reports success while
discovery still fails.

```js
Microservice.Config.forName('Nexus').setConfigValue(
  'serviceAppId',
  '<cluster>-<env>-<app>', // the REAL Nexus app id — do NOT assume the app is named "nexus" or shares the consumer's env
  ConfigOverride.APP
);
```

**Chat access — `Agentix.User` (legacy alias `Nexus.User`).** This is the real authorization boundary, and
the first thing to check when a user cannot open the chat. The cookie exchange needs no grant, so a user
without `Agentix.User` plants a cookie **successfully** — the integration looks wired — and then 403s on
the chat APIs. A role on the **consuming** app grants nothing on Nexus.

Fix it by having the **Nexus administrator** add the user to `Agentix.User` on the **Nexus** app. To see
what the signed-in user holds, run this **against the Nexus app** (paste as one line):

<!-- prettier-ignore -->
```js
var u = User.myUser(); JSON.stringify({ id: u.id, groups: (u.groups || []).map(function (g) { return g.id; }), roles: (u.roles || []).map(function (r) { return r.id; }) })
```

## What to expect

- **The kit cannot run standalone on a laptop.** `npm install && npm run build` inside `demo/` is a
  **build** check — it proves the extracted kit is self-contained and compiles with no monorepo on disk.
  It cannot run the chat, which signs in by a **same-origin cookie exchange** against the Nexus mount
  (see [Why a cookie exchange at all](../SKILL.md#why-a-cookie-exchange-at-all)). On `localhost` there is
  no C3 session and no same-origin mount, so the page renders and the chat never signs in. Hand the ZIP
  to the team that owns the hosting app; the chat runs from the **deployed** app, on the same cluster
  host as Nexus.
- **Each user's first message can take minutes** while that user's agent pod boots. Pods key on
  `userId` — one per user — and the embed shares that pod and its history with the Nexus host UI.
- **No locale or theme in the demo.** It renders i18n keys as placeholders and stock Tailwind colors on
  purpose (step 4). The consuming app supplies both.
