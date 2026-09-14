import { build, context } from "esbuild";

const watch = process.argv.includes("--watch");
const opts = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "dist/index.js",
  sourcemap: true,
  external: ["@azure/functions"],
  logLevel: "info",
};
if (watch) {
  const ctx = await context(opts);
  await ctx.watch();
} else {
  await build(opts);
}
