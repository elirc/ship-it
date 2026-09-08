import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("public", { recursive: true });
for (const name of ["worker", "iframe"])
  await build({
    entryPoints: [`src/runner/${name}-runtime.ts`],
    outfile: `public/sandbox-${name}.js`,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    minify: true,
    define: { "process.env.NODE_ENV": '"development"' },
  });
console.log("Sandbox runtimes built.");
