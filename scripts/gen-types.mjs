import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

// `supabase gen types ... > lib/database.types.ts` redirects whatever the CLI
// prints straight into the file, so any failure (not linked, no network, auth
// expired) silently replaces the type definitions with an error message. That
// happened on 2026-07-19 and wiped 1296 lines; only git saved it.
//
// This wrapper captures the output first and refuses to write anything that is
// not plausibly the generated module.

const OUT = "lib/database.types.ts";

let stdout;
try {
  // shell: true because on Windows the CLI is a .cmd shim that execFileSync
  // cannot spawn directly. The guard below is what keeps this safe, not the
  // spawn mode: nothing is written unless the output parses as the module.
  stdout = execFileSync("supabase gen types typescript --linked", {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    shell: true,
  });
} catch (e) {
  console.error("supabase gen types failed, leaving", OUT, "untouched:");
  console.error((e.stderr || e.message || "").toString().trim());
  process.exit(1);
}

if (!stdout.includes("export type Database") || stdout.length < 2000) {
  console.error(`Refusing to write ${OUT}: output does not look like generated types.`);
  console.error(stdout.slice(0, 400));
  process.exit(1);
}

writeFileSync(OUT, stdout, "utf8");
console.log(`${OUT}: written, ${stdout.split("\n").length} lines`);
