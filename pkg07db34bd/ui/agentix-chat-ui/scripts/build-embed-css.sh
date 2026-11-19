#!/usr/bin/env bash
#
# Copyright 2009-2026 C3 AI (www.c3.ai). All Rights Reserved.
# Confidential and Proprietary C3 Materials.
#
# Regenerate the self-contained embed stylesheet (src/styles/embed.css) from its Tailwind v4 source
# (src/styles/embed.source.css) via the embed-CSS Vite build. embed.css is a BUILD OUTPUT — gitignored,
# never committed. Every host/demo build runs this generate-first (so the file is on disk before vite
# resolves NexusChatEmbed's `import './styles/embed.css'`), and the host postBuild vendors the result
# into the downloadable starter-kit tgz. Portable across macOS-dev and Ubuntu-CI (no BSD/GNU forks).

set -euo pipefail

# Resolve to the package root (c3/nexusClient/react) regardless of caller cwd.
here="$(cd "$(dirname "$0")/.." && pwd)"
cd "$here"

out_dir="dist-embed-css"
target="src/styles/embed.css"

echo "› compiling ${target} from src/styles/embed.source.css …"
npx --no-install vite build --config vite.embed-css.config.ts

# The lib build emits exactly one CSS asset alongside a throwaway JS chunk; grab the CSS.
css_file="$(find "${out_dir}" -maxdepth 1 -name '*.css' | head -n1)"
if [ -z "${css_file}" ] || [ ! -f "${css_file}" ]; then
  echo "✗ embed-css build produced no .css in ${out_dir}" >&2
  exit 1
fi

# Prepend the standard C3 license header (identical to what the insert-license pre-commit hook would
# add) so regeneration is idempotent with that hook, then a generated-file banner.
{
  cat <<'LICENSE'
/*
 * Copyright 2009-2026 C3 AI (www.c3.ai). All Rights Reserved.
 * Confidential and Proprietary C3 Materials.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

/* GENERATED FILE — do not edit by hand. Source: src/styles/embed.source.css. Rebuild: npm run build:embed-css */
LICENSE
  cat "${css_file}"
} > "${target}"
rm -rf "${out_dir}"

bytes="$(wc -c < "${target}" | tr -d ' ')"
echo "✓ wrote ${target} (${bytes} bytes)"
