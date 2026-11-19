# agentixChatPkg — Setup

`agentixChatPkg` embeds a **Nexus Agent chat** into a C3 app on the **same cluster host** as Nexus using
the zero-BFF `<NexusChatEmbed>` drop-in. The browser drives the Nexus mount directly with plain
cookie auth; there is **no server-side proxy and no consumer-side Nexus secret**. Sign-in rides the
page's own session through a one-time silent `c3auth` cookie exchange (via the platform's
self-scoped `User.mySessionToken` — no role grant, no C3 dependency).

```
browser ── cookie (own app) ──► /api/8/User/mySessionToken   (once)
browser ── c3auth header ─────► nexus /api/8/User/myUser      (once → Set-Cookie on nexus path)
browser ── cookie (nexus) ────► nexus /api/8 + agent pod      (everything after)
```

---

## Preconditions (cluster once)

Two cluster-side records decide whether the wired chat works. Nothing writes them automatically.
Both are one-time and belong to whoever administers Nexus and the cluster.

### 1) Publish the Nexus mount for discovery — `serviceAppUrl`

`<NexusChatEmbed>` reads this from the **consuming app's** own config store, so run the write
**against the app that hosts the chat page** (an APP write on the Nexus app reports success while
discovery still fails). One CLUSTER-scope publish at Nexus deploy covers every consumer:

```js
Microservice.Config.forName('Nexus').setConfigValue(
  'serviceAppUrl',
  'https://<host>/<env>/nexus/',
  ConfigOverride.CLUSTER
);
```

If the deploy skipped it, or one app must point at a **different** Nexus, publish an **APP**-scope
value on the consuming app instead (or pass `nexusBase` to the component).

> **This template passes NO `nexusBase`** — `ui/react/src/EmbedRoutes.tsx` mounts `<NexusChatEmbed>`
> with automatic discovery. The library derives this page's own control-plane base from the **served
> path** (`deriveGatewayBase`), NOT `import.meta.env.DEV`, so under the C3 Code gateway (page served
> at `/<env>/<app>/…`) the discovery POST resolves against `/<env>/<app>/api/8` and finds the Nexus
> mount on its own via the `serviceAppUrl` published in step 1. **A consumer on a different cluster or
> Nexus mount can still pass an explicit `nexusBase`** to skip discovery, but it is not required here.

### 2) Grant chat access — `Nexus.User`

This is the real authorization boundary and the first thing to check when a user cannot open the
chat. The cookie exchange needs no grant, so a user without `Nexus.User` plants a cookie
**successfully** (the integration looks wired) and then 403s on the chat APIs. A role on the
**consuming** app grants nothing on Nexus. Have the **Nexus administrator** add the user — normally
by mapping the IdP default group to `Nexus.User` (cluster-once, run **on the Nexus app**):

```js
Nexus.Agent.ServiceApi.setOidcIdpConfigId('<idp-host>');
```

To see what the signed-in user holds, run this **against the Nexus app** (one line):

```js
var u = User.myUser(); JSON.stringify({ id: u.id, groups: (u.groups || []).map(function (g) { return g.id; }), roles: (u.roles || []).map(function (r) { return r.id; }) })
```

Consumer and Nexus must resolve to the **same user id** for the signed-in human (automatic for OIDC).

---

## Verify

Open the deployed app and sign in with normal SSO, then open **`/chat`**. The chat cannot run on a
laptop: it signs in via a same-origin cookie exchange that only exists on the deployed cluster host.
Verify with a **plain user** (no admin roles) to confirm the `Nexus.User` grant, not admin
privileges, is what lets the chat load. Each user's first message can take minutes while their agent
pod boots.

In DevTools → Network you should see the one-time silent exchange, then plain cookie traffic: one
`User/myUser` probe (302/401), one `User/mySessionToken` on the consuming app (200), one
Authorization'd `User/myUser` on the Nexus mount (200 with `Set-Cookie` for the nexus path), and
thereafter normal chat requests. You can reproduce the exchange without a browser:

```bash
TOK=$(curl -s -u '<user>:<pass>' -X POST https://<host>/<env>/<app>/api/8/User/mySessionToken \
  -H 'Content-Type: application/json' -d '{}' | jq -r '.signedToken')
curl -s -D - -o /dev/null -X POST https://<host>/<env>/nexus/api/8/User/myUser \
  -H "Authorization: c3auth $TOK" -H 'Content-Type: application/json' -d '{}' | grep -i set-cookie
```

---

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| "Nexus is unavailable." | Discovery failed — no `serviceAppUrl` visible to the **consuming** app (step 1 not published, or published APP-scope on the Nexus app instead of the consuming app). Confirm the page's own session is alive. (A consumer that passes an explicit `nexusBase` should check it points at the right Nexus mount.) |
| Cookie plants but chat 403s | User missing `Nexus.User` on the **Nexus** app (a role on the consuming app grants nothing there) — re-check the IdP group mapping |
| Mint 403/404 or probe always fails | Stale bundle calling a custom facade or a role-gated endpoint instead of the platform — the mint must be `User/mySessionToken` and the probe `User/myUser`; rebuild + resync the UI |
| Exchange 401 at the nexus mount | User doesn't exist in the Nexus app (test users are per-app) or IdP signature mismatch (`emptyAllCaches()`) |
| Empty / wrong sessions | User ids differ between the consumer and Nexus |
| Stuck "Connecting to Nexus…" | Nexus mount unreachable at the discovered path, or not same-origin |
| `No QueryClient set` | Consumer shell missing `QueryClientProvider` above the route |

Cross-cluster embeds (different IdP / signing trust) are **out of scope** for this template. The full
contract and deeper troubleshooting live in the package-level `CLAUDE.md`.
