/*
 * Copyright 2009-2026 C3 AI (www.c3.ai). All Rights Reserved.
 * Confidential and Proprietary C3 Materials.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";
import tailwindcss from "@tailwindcss/vite";
import { makeAtAliasFallback, makeForeignBareDepResolver, makePinSingletons, SINGLETON_LIBS } from "./viteShared";

// This consumer app mounts `@c3/agentix-client-ui` from the sibling vendored library at
// `../agentix-chat-ui`. The resolution model mirrors the ZIP demo's `vite.demo.config.ts`:
//   - `@/…` resolves in order [this app's own src, then the chat library's src]
//   - `SINGLETON_LIBS` are pinned to this app's single physical copy (context-bearing libs must
//     resolve once, or the consumer's Provider and the chat UI's `useContext` read different
//     instances and context comes back empty at runtime)
//   - library-tree files import bare deps that get re-resolved through this app's install
// The C3-specific build integration (outDir into ../content/<pkg>, asset naming, base, and the
// VITE_C3_PKG requirement) is preserved. There is NO server-side proxy: the embed signs in via a
// silent same-origin cookie exchange, so the old /api|/remote|/thirdparty|/typesys dev proxies are
// gone.
const APP_SRC = path.resolve(__dirname, "./src");
const CLIENT_SRC = path.resolve(__dirname, "../agentix-chat-ui/src");

const PKG_NM = path.resolve(__dirname, "node_modules");
const CLIENT_NM = path.resolve(__dirname, "../agentix-chat-ui/node_modules");

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const port = parseInt(env.VITE_DEV_SERVER_PORT || '9000', 10);
  const pkgName = env.VITE_C3_PKG;
  const base = command === 'serve' ? `/${env.VITE_C3_ENV}/${env.VITE_C3_APP}/uiservice/` : './';

  if (!pkgName) {
    throw new Error('VITE_C3_PKG is not set');
  }

  return {
    plugins: [
      makeAtAliasFallback('nexuspkg-at-alias-fallback', [APP_SRC, CLIENT_SRC]),
      makePinSingletons('nexuspkg-pin-singletons', PKG_NM, [CLIENT_NM]),
      makeForeignBareDepResolver('nexuspkg-foreign-bare-deps', [CLIENT_SRC], [path.join(APP_SRC, 'main.tsx')]),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: [
        { find: /^@c3\/agentix-client-ui$/, replacement: path.join(CLIENT_SRC, 'index.ts') },
        { find: /^@c3\/agentix-client-ui\/(.*)$/, replacement: `${CLIENT_SRC}/$1` },
        ...SINGLETON_LIBS.map((lib) => ({ find: lib, replacement: path.join(PKG_NM, lib) })),
      ],
      dedupe: SINGLETON_LIBS,
    },
    server: {
      host: true,
      allowedHosts: true,
      port: port,
      strictPort: true,
    },
    base: base,
    build: {
      outDir: `../content/${pkgName}`,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          assetFileNames: "assets/[name][extname]",
          chunkFileNames: "assets/[name].js",
          entryFileNames: "assets/[name].js",
          /*
           * Split the heavy, rarely-changing vendor groups out of the single ~1.7 MB entry chunk.
           * This is a pure grouping of already-deduped modules (it never duplicates a singleton —
           * each library still resolves to the one physical copy pinned above), so it is safe for
           * the context-bearing libs. The win: the browser fetches these chunks in parallel with
           * the app chunk and caches them across deploys where only app code changed, and it clears
           * the >1000 kB single-chunk warning. Grouping is by import path so a library upgrade needs
           * no edit here. Only cycle-free leaf groups are split out (react, the tiptap/prosemirror
           * editor, ace); everything else stays in one `vendor` chunk because finer splits (radix,
           * markdown) create circular chunks with the shared pool.
           */
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/.test(id)) {
              return "vendor-react";
            }
            if (/[\\/]node_modules[\\/](@tiptap|prosemirror-|prosemirror)[\\/]?/.test(id)) {
              return "vendor-editor";
            }
            if (/[\\/]node_modules[\\/](ace-builds|react-ace)[\\/]/.test(id)) {
              return "vendor-ace";
            }
            return "vendor";
          },
        },
        onwarn: (warning, warn) => {
          if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
          warn(warning);
        },
      },
    },
  };
});
