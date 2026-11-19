#!/usr/bin/env bash
# Decide whether @c3/agentix-client-ui needs a fresh publish.
#
# The Jarvis develop-mainline hook dispatches the publish workflow on EVERY green
# develop build, but most green builds do not touch this package — so the `dev`
# dist-tag would otherwise churn with byte-identical content under a new version
# every build. This gate makes the workflow content-idempotent: it publishes only
# when the shipped package content actually changed since the last published dev
# version.
#
# Emits `should_publish=true|false` on stdout and (when running under GitHub
# Actions) into $GITHUB_OUTPUT, so the workflow can gate its version/publish steps.
#
# FAIL OPEN. Every uncertain path — no baseline (first publish), an unreadable
# registry pointer, a fetch/pack/diff failure — resolves to PUBLISH, never a
# silent skip. The only outcome that skips is a positively-confirmed no-change.
#
# Inputs (env):
#   NPM_TAG   dist-tag being published (default "latest"). The skip-check applies
#             ONLY to the automated "dev" cadence; every other tag always publishes.
#   FORCE     "true" forces a publish regardless of content (manual override).
#
# Must run AFTER `npx google-artifactregistry-auth`, from the package directory
# (the `npm view` read needs the registry token; `npm pack` needs package.json).

set -uo pipefail

PACKAGE_NAME="${PACKAGE_NAME:-@c3/agentix-client-ui}"

log() { printf 'publish-gate: %s\n' "$*" >&2; }

# Emit the decision to stdout and, under Actions, to $GITHUB_OUTPUT.
emit() {
  # $1 = true|false ; $2 = human reason
  log "should_publish=$1 ($2)"
  printf 'should_publish=%s\n' "$1"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    {
      printf 'should_publish=%s\n' "$1"
      printf 'reason=%s\n' "$2"
    } >> "$GITHUB_OUTPUT"
  fi
}

# Last-published source SHA for the given dist-tag. npm auto-stamps `gitHead` at
# publish time; empty output (never published, or the registry does not serve it)
# means "no baseline".
resolve_baseline_githead() {
  tag="$1"
  out="$(npm view "${PACKAGE_NAME}@${tag}" gitHead 2>/dev/null)"
  rc=$?
  # rc!=0 covers both "package/tag never published" (E404) and a genuine
  # auth/network failure. Both fail open, but a chronic auth failure would then
  # publish on every build — the exact churn this gate removes — so log the rc to
  # keep a stuck-open gate diagnosable in the workflow log.
  #
  # rc==0 with empty output is the third stuck-open path: the tag resolves but the
  # registry serves no `gitHead` (a field-drop after a registry cutover). It also
  # fails open — publish every build — so log it distinctly from rc!=0, or a
  # silently-disabled gate looks identical to healthy publishing.
  if [ "$rc" -ne 0 ]; then
    log "npm view ${PACKAGE_NAME}@${tag} gitHead exited rc=${rc} — no baseline (auth/network failure, or tag not yet published); publishing"
  elif [ -z "$out" ]; then
    log "npm view ${PACKAGE_NAME}@${tag} gitHead succeeded but returned no gitHead — no baseline (tag unpublished, or registry serves no gitHead); publishing"
  fi
  printf '%s' "$out"
}

# Exact shipped file set, honoring package.json `files` (co-located tests,
# scripts/, tsconfig are in the tree but NOT shipped). Using `npm pack` keeps this
# in lockstep with `files` with no duplicated glob logic. One path per line.
#
# Note: this is HEAD's shipped set, so the diff catches additions and
# modifications precisely. A pure deletion of a shipped file with no other shipped
# change is the one case it can miss — but it self-heals: the baseline stays at the
# pre-deletion publish, so the next shipped change re-publishes with the deletion
# included. Acceptable for a `dev` prerelease; not worth reconstructing the
# baseline's packed set to close.
#
# Assumes every shipped path is git-tracked source — true today: the package ships
# raw `src/` TS, `build` is `tsc --noEmit`, no prepack emits anything. If a future
# prepack ever ships a built artifact (e.g. `dist/`), the diff below compares the
# tracked source, not the built bytes, so a build-only change could be skipped —
# revisit the gate at that point.
resolve_packed_files() {
  npm pack --dry-run --json 2>/dev/null \
    | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));(d[0]&&d[0].files||[]).forEach(f=>console.log(f.path));' \
      2>/dev/null || true
}

# decide_publish <baseline_sha> <head_ref> [packed_file...]
# Echoes "publish" or "skip". Never fails the caller — any error path is "publish".
decide_publish() {
  baseline="$1"; shift
  head_ref="$1"; shift

  # No baseline → first publish / unreadable pointer → publish.
  [ -n "$baseline" ] || { echo publish; return 0; }
  # No packed list → `npm pack` failed → fail open.
  [ "$#" -gt 0 ] || { echo publish; return 0; }
  # Baseline commit not available locally (fetch failed / unreachable) → fail open.
  git cat-file -e "${baseline}^{commit}" 2>/dev/null || { echo publish; return 0; }

  # `git diff --quiet` reports "no change" (exit 0) for ANY pathspec that matches
  # zero tracked files. So if npm ever reshapes its `files[].path` format (e.g. a
  # `package/` prefix, an absolute path), every packed path would match nothing,
  # the diff would exit 0, and the gate would skip forever — a silent fail-CLOSED,
  # the one direction this gate must never take. Require the packed paths to
  # resolve to at least one tracked file; if none do, fail open (publish).
  if [ -z "$(git ls-files -- "$@" 2>/dev/null)" ]; then
    echo publish
    return 0
  fi

  # Restrict the diff to the shipped paths. exit 0 = identical (skip);
  # exit 1 = changed (publish); exit >1 = git error → fail open (publish).
  if git diff --quiet "$baseline" "$head_ref" -- "$@" 2>/dev/null; then
    echo skip
  else
    echo publish
  fi
}

main() {
  force="${FORCE:-false}"
  npm_tag="${NPM_TAG:-latest}"

  if [ "$force" = "true" ]; then
    emit true "force input set"
    return 0
  fi
  if [ "$npm_tag" != "dev" ]; then
    emit true "tag '$npm_tag' is not the automated dev cadence"
    return 0
  fi

  baseline="$(resolve_baseline_githead "$npm_tag")"
  # Guard the registry-supplied value before it reaches git as a ref argument. A
  # gitHead is always a commit SHA (npm stamps `git rev-parse HEAD` at publish), so
  # anything non-hex is treated as "no baseline" → publish (fail open). This also
  # stops a leading-dash value from being read by git as an option, not a ref.
  if [ -n "$baseline" ] && [[ ! "$baseline" =~ ^[0-9a-f]{7,64}$ ]]; then
    log "ignoring non-SHA baseline gitHead: '$baseline'"
    baseline=""
  fi
  if [ -n "$baseline" ]; then
    # Checkout is shallow (depth 1); fetch just the baseline commit's tree so the
    # diff has both sides. Best-effort — a failure leaves the baseline absent and
    # decide_publish falls open.
    git fetch --depth=1 origin "$baseline" 2>/dev/null || true
  fi

  files=()
  while IFS= read -r line; do
    [ -n "$line" ] && files+=("$line")
  done < <(resolve_packed_files)

  # An empty list means `npm pack` failed or its JSON did not parse — fail open,
  # but log it: a persistently-broken parse would otherwise look identical to
  # healthy publishing in the workflow log.
  if [ "${#files[@]}" -eq 0 ]; then
    log "npm pack produced no packed-file list — failing open (publish)"
  fi

  if [ "${#files[@]}" -gt 0 ]; then
    decision="$(decide_publish "$baseline" HEAD "${files[@]}")"
  else
    decision="$(decide_publish "$baseline" HEAD)"
  fi

  if [ "$decision" = "skip" ]; then
    emit false "no shipped file changed since ${baseline}"
  else
    emit true "shipped content changed (or baseline unavailable)"
  fi
}

# Only run when executed, not when sourced (keeps the functions unit-testable).
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main "$@"
fi
