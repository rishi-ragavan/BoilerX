# Get the kit yourself — full transport detail

Long-form companion to `SKILL.md` → [Get the kit yourself](../SKILL.md#get-the-kit-yourself-agent-driven-no-human-handoff).
Read this only if the three-step summary there wasn't enough — a discovery edge case, a harness whose
CLI isn't on `PATH`, the `Js.exec` encoding rules, or the confirmed-shared-filesystem `curl` shortcut.

The goal: an agent with no human handoff obtains and extracts `agentix-chat-embed.tgz`, then reads the
`SKILL.md` bundled at the root of the extraction and follows it. Everything below is a means to that end.

**Precondition — only download when the code is absent.** Before any of this, check your working tree
for an existing copy (`demo/` + `agentix-chat-ui/`, a `resources/agentix-chat-code/` tree, or an
unextracted `agentix-chat-embed.tgz`). If it's already there, skip the download entirely and go to the
[Fast path](../SKILL.md#fast-path-copy-the-demo-dont-re-derive-it). Downloading over an existing kit
wastes round-trips and risks shadowing edits you already made.

## Mental model: the exec runtime is often remote — don't ferry through the filesystem

The single most expensive wrong assumption is that the JS/Python **exec runtime** (whatever runs your
server-side snippets) shares a filesystem with your **local shell**. It usually does not — the runtime
is frequently a remote server with its own `/tmp`. Two consequences:

- A file the runtime writes (a token file, the downloaded archive) is **not visible** to your local
  shell — so "write token to `/tmp`, then `curl` from the shell" silently fails.
- Your local shell has **no `c3auth` session**, so a shell `curl` against the endpoint gets an
  identity-provider login page, not the archive.

**Robust pattern: do the whole authenticated download _inside_ the runtime**, base64-encode it there,
and ferry back only text + a hash. The token never leaves the runtime. Use a local-shell `curl` only
after you have _confirmed_ the runtime and your shell share one filesystem.

## Preflight: is the platform CLI on `PATH`?

If your harness exposes a CLI wrapper for server-side exec and the first call fails with
`command not found`, it is almost always a `PATH` issue, not a missing install — the installer usually
drops a shim under a user-local bin dir (commonly `~/.local/bin`). Either call it by absolute path or
add that bin dir to `PATH` before the first exec. Confirm once, up front, rather than losing a
round-trip to the failure.

## The endpoint

```
GET <nexusBase>/agent-api/v1/embed-client/download   →   200 application/gzip
```

- The payload is **non-secret and byte-identical** for every caller — the auth gate scopes _who may
  call the API_, not what they receive.
- Auth is the caller's own `c3auth` session: an `Authorization: c3auth <token>` header (or a
  `Cookie: c3auth=<token>`). The token is `User.mySessionToken().signedToken` (below).
- The caller needs `Nexus.User` on the **Nexus** app — the same authorization boundary the chat APIs
  use (`SKILL.md` → Prerequisites). A missing grant is the usual cause of a `403` here.
- The archive is `.tgz` (gzipped tar), not `.zip` — untar it, don't unzip.
- **Size:** a few hundred KB (a recent run: ~700 KB raw → ~935 KB base64), and it grows with the kit —
  so size the ferry off the **`bytes` the runtime reports**, not this figure. Expect a handful of chunks.

## Step 1 — resolving `<nexusBase>` (harden against a missing `.endpoint()`)

> **Pick ONE language and use it for all three steps — don't mix.** JS references platform types bare
> (`User.mySessionToken()`); the **C3 Python runtime requires a `c3.` prefix on every platform type**
> (`c3.User.mySessionToken()`, `c3.Microservice.Config.forName('Nexus')`, …). Copying a bare-`User`
> snippet into the Python door fails with `NameError: name 'User' is not defined`. Discovery (Step 1)
> works in either door; the **binary download (Step 2) is shown in Python** because this repo's JS HTTP
> surface is text-oriented (see that step). Whichever you use, prefix everything with `c3.` in Python
> and drop it in JS — and don't switch languages mid-flow.

Read `Microservice.Config` from **your current app** (the one your session is already
connected to), never from a guessed Nexus id. **Multi-studio clusters**
(`Microservice.Config.forName("Studio").appId` set): try
`forName('Nexus.' + Microservice.Config.forName("Studio").appId)` first, fall back to
`forName('Nexus')`. The config name is **case-sensitive** — `forName('nexus')` ≠ `forName('Nexus')`.

`AppUrl.endpoint(subPath)` is **absent on some platform builds** (`Cannot find function endpoint`).
Feature-check it rather than calling it blind — calling-then-catching wastes a round-trip on every run
where it's missing:

```js
function baseFromUrl(u) {
  if (u && typeof u.endpoint === 'function') return u.endpoint('');
  return String(u).replace(/\/+$/, ''); // fallback: string form, strip trailing slash(es)
}
// Resolution helper: try to resolve from a named config. Returns a result object or null.
// Null falls through to the next level — mirrors the browser resolver's tryConfigForName.
function tryResolveFrom(configName) {
  try {
    var c = Microservice.Config.forName(configName);
    var hasId = c.isFieldSet('serviceAppId') && c.serviceAppId;
    var hasUrl = c.isFieldSet('serviceAppUrl') && c.serviceAppUrl;
    if (!hasId && !hasUrl) return null;
    if (hasId) {
      try {
        return { resolved: 'appId', appId: String(c.serviceAppId), baseUrl: baseFromUrl(App.forId(String(c.serviceAppId), true).externalUrl) };
      } catch (e) { /* malformed appId — fall through to serviceAppUrl */ }
    }
    if (hasUrl) {
      try { return { resolved: 'urlOnly', baseUrl: baseFromUrl(c.serviceAppUrl) }; } catch (e) { /* unresolvable */ }
    }
  } catch (e) { /* config unreadable — fall through */ }
  return null;
}
// Studio-scoped resolution: try Nexus.<studioId> first when Studio config carries an appId.
var studioId = null;
try {
  var sc = Microservice.Config.forName('Studio');
  if (sc.isFieldSet('appId') && sc.appId) studioId = String(sc.appId);
} catch (e) {
  /* no Studio config */
}
var out = null;
if (studioId) out = tryResolveFrom('Nexus.' + studioId);
if (!out) out = tryResolveFrom('Nexus');
if (!out) {
  out = {
    resolved: 'none',
    error: 'Nexus not registered as a dependency here — an operator must publish serviceAppId (outside this skill).',
  };
}
JSON.stringify(out);
```

| `resolved` | Meaning                 | What to do                                                                                                                                                                                                                                    |
| ---------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appId`    | real id + live base URL | Use `baseUrl` directly.                                                                                                                                                                                                                       |
| `urlOnly`  | base URL, no id         | **Usable** — `baseUrl` is all the download needs; the id only matters for id-addressed tooling.                                                                                                                                               |
| `none`     | genuine setup gap       | **Stop and report.** Do not guess a sibling id. An operator must publish `serviceAppId` on Nexus once. On multi-studio clusters, the operator can run `resolve_studio_id.js` on the Nexus app itself to get the ready-to-run publish command. |

## Step 2 — download + mint + hash, all in the runtime

Mint the token and use it in the **same** snippet — no standalone "does the token mint?" probe (a bad
mint, e.g. the `User.myUser().mySessionToken()` mistake, surfaces on the real call just as well). The
mint is the platform's self-scoped `User.mySessionToken()`: static-style, acts only on the caller,
sits in the unprivileged baseline (a zero-role user gets `200`), nothing to grant. `.signedToken` **is**
the `c3auth` value — never log it, put it in a URL, or persist it beyond the runtime.

```python
# Python door — every platform type needs the c3. prefix (bare `User` throws NameError).
import urllib.request, base64, hashlib
tok  = c3.User.mySessionToken().signedToken
data = urllib.request.urlopen(urllib.request.Request(
    NEXUS_BASE + "/agent-api/v1/embed-client/download",
    headers={"Authorization": "c3auth " + tok}), timeout=120).read()
open("/tmp/kit.b64", "w").write(base64.b64encode(data).decode())
{"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}  # emit the hash to verify the ferry
```

**Prefer the Python door for this step** — it handles the binary body and base64 in stdlib. (The JS
door is fine for Step 1's discovery, which returns a string, but this repo's JS HTTP surface
—`HttpRequest.make({method,url}).withHeader(...).sendSync(HttpRequest.SendSpec.timeoutSeconds(n))`,
read via `resp.string()`— is text-oriented, so downloading a gzip through it risks corrupting the
bytes. Use Python here, or the [`curl` shortcut](#shortcut-a-local-curl--only-if-the-shell-shares-the-runtimes-filesystem)
if the shell shares the runtime's filesystem.) **Always emit the `sha256`** so the ferry is verifiable
end-to-end against the local reassembly.

## Step 3 — ferry the base64 back in chunks, verify, extract

Tool output is usually capped (~195 KB of text), and the base64 is bigger than the raw archive, so it
takes **several pulls** — compute the count from the `bytes` step 2 reported (`ceil(bytes*4/3 /
190000)`), don't discover the cap reactively. Return one slice per pull (`i = 0, 1, 2, …`); stop when a
slice comes back empty:

```python
open("/tmp/kit.b64").read()[i*190000:(i+1)*190000]   # JS: File.readString('/tmp/kit.b64').substring(i*190000,(i+1)*190000)
```

Reassemble the chunks locally in order, decode, verify, extract:

```bash
base64 -d kit.b64 > agentix-chat-embed.tgz
sha256sum agentix-chat-embed.tgz         # (or `shasum -a 256`) — MUST equal the runtime's sha256 from step 2
mkdir -p agentix-chat-kit && tar -xzf agentix-chat-embed.tgz -C agentix-chat-kit
```

## Running the exec snippets without a CLI wrapper

A CLI like `c3-js-exec <appId> <file.js>` is a harness wrapper name, not a platform API. If your
environment lacks it, the same snippets run over the generic platform action any C3 app exposes:

```
POST <appUrl>/api/8/Js/exec
Authorization: c3auth <token>          (or however your environment carries auth)
Content-Type: application/json

{"src": "<javascript source as a string>"}
```

Two encoding rules — get either wrong and you silently get `204 No Content` or a deeply-boxed result:

1. **Bare trailing expression, evaluated by `eval()` — do not wrap the script in a function.** The
   wrapper effectively runs `var __c3r = eval(<your script, unmodified>);`. A `(function(){…})()`
   wrapper returns `undefined` (→ `204`) unless you add an explicit `return`. `eval()`'s completion
   value is the last expression, no `return` needed.
2. **Wrap the whole `eval()` in `JSON.stringify(...)`.** Otherwise an object result comes back
   deep-boxed (`{"type":"Boxed<…>","value":…}` per nested field). Final `src` shape, built by string
   concatenation (`"JSON.stringify(eval(" + <encoded string> + "));"`) — not template interpolation,
   which double-encodes. Read `.value` from the `200` response and `JSON.parse()` it.

(Python snippets run the analogous `Py.exec` / server-side-Python door your harness exposes — with the
`c3.` prefix on every platform type, per Step 1's note. The runtime-is-remote and ferry-the-bytes rules
are identical.)

## Shortcut: a local `curl` — only if the shell shares the runtime's filesystem

If — and only if — you have confirmed your local shell shares one filesystem with the runtime **and**
carries a `c3auth` session, you can skip the base64 ferry and download directly (`$TOKEN` = the
`.signedToken` from the mint):

```bash
curl -fsSL -H "Authorization: c3auth $TOKEN" \
  "$NEXUS_BASE/agent-api/v1/embed-client/download" -o agentix-chat-embed.tgz
mkdir -p agentix-chat-kit && tar -xzf agentix-chat-embed.tgz -C agentix-chat-kit
```

Stream the body **as binary** (don't decode as text, or the gzip corrupts). If the download comes back
as an HTML login page, the shell has no `c3auth` session — fall back to the in-runtime download above.

## After extraction

`agentix-chat-kit/` holds the bundled `SKILL.md` + `references/` at its root, with the runnable demo
app and the vendored `@c3/agentix-client-ui` sources under `resources/` (a `resources/agentix-chat-code/`
tree, or a nested `resources/agentix-chat-code.tgz` to untar once more, depending on the build — `ls`
the extraction to see which). Read that root `SKILL.md` and follow the
[Fast path](../SKILL.md#fast-path-copy-the-demo-dont-re-derive-it) — it is this same file, shipped
alongside the code.
