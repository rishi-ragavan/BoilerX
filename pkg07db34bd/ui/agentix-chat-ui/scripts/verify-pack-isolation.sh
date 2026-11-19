#!/usr/bin/env bash
#
# Copyright 2009-2026 C3 AI (www.c3.ai). All Rights Reserved.
# Confidential and Proprietary C3 Materials.
#
# Publishability + consumer-portability acceptance for @c3/agentix-client-ui.
#
# `npm pack`s the package, extracts the tarball into a throwaway directory that has NO host tree
# (`c3/nexus/react/src`) anywhere on its path, and type-checks the extracted sources the way a
# real consumer would. Green = the package is self-contained AND alias-agnostic — i.e. it builds
# under any downstream tsconfig, not just this repo's. Two consumer failure modes are pinned:
#
#   (A) A shipped source secretly needs a HOST module — the tarball carries a `nexus/react/src`
#       specifier that dangles once the host tree is off the path. (step 2)
#   (B) A shipped source uses the `@/` path alias. The package ships raw TS, so a consumer resolves
#       these transitive imports against ITS OWN tsconfig `@/*` mapping, not ours — yielding a wall
#       of TS2307 "Cannot find module '@/lib/...'". This is the exact bug that blocked aiDashboard's
#       adoption. Shipped `src/` must therefore be RELATIVE-ONLY. We pin this two ways: a direct
#       grep for any `@/` import specifier (step 2b), and a standalone tsc run under a tsconfig whose
#       `@/*` maps to a DECOY dir (step 3) — reproducing a consumer whose alias points elsewhere, so
#       any stray `@/` fails to resolve exactly as it would downstream.
#
# This is the build-level companion to the source-level packageBoundary guard (in nexusClientTest)
# and to the package's own alias-free tsconfig.json / vite.config.ts.
#
# Portable across macOS-dev and Ubuntu-CI: no `stat`/`sed`/`date` forks; `mktemp -d` with no arg
# works on both BSD and GNU.

set -euo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PKG_DIR"

if [[ ! -d node_modules ]]; then
  echo "ERROR: $PKG_DIR/node_modules missing — run 'npm ci' in the package first." >&2
  exit 1
fi

WORK="$(mktemp -d)"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

echo "==> npm pack"
TGZ_NAME="$(npm pack --pack-destination "$WORK" 2>/dev/null | tail -1)"
TGZ="$WORK/$TGZ_NAME"
[[ -f "$TGZ" ]] || { echo "ERROR: pack produced no tarball" >&2; exit 1; }

echo "==> extract to isolated tree (no host tree on this path)"
ISO="$WORK/iso"
mkdir -p "$ISO"
tar xzf "$TGZ" -C "$ISO"          # -> $ISO/package/{src,package.json,...}
EXT="$ISO/package"

# 1. Structural: the tarball must ship no test files and no host paths.
test_files="$(find "$EXT/src" -name '*.test.ts' -o -name '*.test.tsx' | wc -l | tr -d ' ')"
[[ "$test_files" == "0" ]] || { echo "ERROR: tarball ships $test_files test file(s)" >&2; exit 1; }

# 2. Import-level: no source may import a relative host path (comments referencing the host path
#    for context are fine — match only import/from specifiers).
host_imports="$(grep -rnE "(from|import\(|require\()\s*['\"][^'\"]*nexus/react/src" "$EXT/src" || true)"
if [[ -n "$host_imports" ]]; then
  echo "ERROR: tarball sources import the host tree:" >&2
  echo "$host_imports" >&2
  exit 1
fi

# 2b. Alias-level: no source may import via the `@/` path alias. A consumer resolves these against
#     its own tsconfig `@/*`, not ours (failure mode B above). Match keyword-anchored specifiers —
#     `from '@/…'`, `import('@/…')`, `require('@/…')`, and the bare side-effect `import '@/…'` (a CSS
#     import has no `from`) — so a `@/` mention inside a comment or JSDoc is ignored.
alias_imports="$(grep -rnE "(from|import\(|require\()\s*['\"]@/|import\s+['\"]@/" "$EXT/src" || true)"
if [[ -n "$alias_imports" ]]; then
  echo "ERROR: tarball sources use the '@/' path alias — rewrite these relative (a consumer's @/* maps elsewhere):" >&2
  echo "$alias_imports" >&2
  exit 1
fi

# 3. Build-level: type-check standalone the way a downstream consumer does. The tarball omits
#    tsconfig (files: ["src"]); supply the package's own config + its installed deps (deps only —
#    the host tree is nowhere on this path). Then layer a consumer tsconfig that maps `@/*` to a
#    DECOY dir with none of our modules: relative-only src ignores it and type-checks clean, while
#    any stray `@/` import fails to resolve here exactly as it would in a real consumer (failure
#    mode B). react/react-dom pins mirror the package tsconfig (tsconfig `paths` is replaced, not
#    merged, by `extends`) so the standalone tree still resolves a single react types copy.
cp "$PKG_DIR/tsconfig.json" "$EXT/tsconfig.json"
ln -s "$PKG_DIR/node_modules" "$EXT/node_modules"
cat > "$EXT/tsconfig.consumer.json" <<'JSON'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./__decoy_consumer_alias__/*"],
      "react": ["./node_modules/@types/react"],
      "react/*": ["./node_modules/@types/react/*"],
      "react-dom": ["./node_modules/@types/react-dom"],
      "react-dom/*": ["./node_modules/@types/react-dom/*"]
    }
  },
  "include": ["src"]
}
JSON

echo "==> isolated tsc under a foreign '@/*' mapping (host tree absent, consumer alias reproduced)"
( cd "$EXT" && npx --no-install tsc --noEmit -p tsconfig.consumer.json )

echo "PASS: @c3/agentix-client-ui packs and type-checks standalone under a foreign alias — self-contained, alias-agnostic, publishable."
