// Builds the static demo: copies pdf.js into /public/pdfjs, then runs `next build` (or `next dev`)
// with NEXT_PUBLIC_STATIC_DEMO=true. Written in Node so it behaves the same on Windows, macOS and Linux.
//
//   node scripts/build-demo.mjs        -> static export in ./out
//   node scripts/build-demo.mjs dev    -> dev server in demo mode
import { cpSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const pdfjsBuild = join(dirname(require.resolve("pdfjs-dist/package.json")), "legacy", "build");

const target = join(root, "public", "pdfjs");
mkdirSync(target, { recursive: true });
for (const file of ["pdf.min.mjs", "pdf.worker.min.mjs"]) {
  cpSync(join(pdfjsBuild, file), join(target, file));
}

const command = process.argv[2] === "dev" ? "dev" : "build";
const result = spawnSync("npx", ["next", command], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, NEXT_PUBLIC_STATIC_DEMO: "true" },
});
process.exit(result.status ?? 1);
