import { spawnSync } from "node:child_process";

// The whole asset chain for one language, in the only order that works.
//
// The order is not arbitrary and every step depends on the one before it:
//
//   seed        the demo returns to its known state
//   germanize   the demo is dressed in the target language, INCLUDING the
//               project's `language` column, which is what makes the generated
//               PDFs German. Skipped for Slovenian, which is the seed's own
//               language.
//   flow        drives handover, acceptance and invoice, so the documents that
//               the brochure photographs actually exist and are in the right
//               language
//   shoot       the app screenshots, in that locale's UI
//   pdfs        the generated documents, rasterized
//   mockups     devices and paper sheets built from both of the above
//   brochure    the PDF itself
//   seed        the demo is handed back to the founder exactly as it was
//
// The final seed is not optional. This script mutates the live demo, and the
// founder demos from it; leaving it dressed in German and mid-acceptance would
// be a trap set for his next meeting.

const LOCALE = (process.argv[2] ?? "sl").toLowerCase();
const BASE = process.env.BASE ?? "http://localhost:3000";

const npx = "npx";
const npm = "npm";

function run(label, command, args, env = {}) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, MARKETING_LOCALE: LOCALE, BASE, ...env },
    // The shell is needed for npm and npx on Windows, because they are .cmd
    // shims that cannot be spawned directly. It must NOT be used for node,
    // whose path is C:\Program Files\nodejs\node.exe: through a shell that
    // splits at the space and tries to run "C:\Program".
    shell: process.platform === "win32" && (command === npm || command === npx),
  });
  if (result.status !== 0) {
    console.error(`\nFAILED at "${label}". The demo may still be dressed in ${LOCALE}.`);
    console.error("Run `npm run seed` to restore it before demoing.");
    process.exit(result.status ?? 1);
  }
}

const node = process.execPath;

run("seed, clean state", npm, ["run", "seed"]);
if (LOCALE !== "sl") {
  run(`dress the demo in ${LOCALE}`, node, ["--env-file=.env.local", "scripts/marketing/germanize.mjs"]);
}
run("drive the closing chain", node, ["scripts/marketing/run-demo-flow.mjs"]);
run("screenshots", node, ["scripts/marketing/shoot.mjs"]);
run("documents to images", node, ["scripts/marketing/pdf-shots.mjs"]);
run("device and paper mockups", node, ["scripts/marketing/mockups.mjs"]);
run("brochure", npx, ["tsx", "--tsconfig", "tsconfig.scripts.json", "scripts/marketing/brochure.mjs"]);
run("seed, restore the founder's demo", npm, ["run", "seed"]);

console.log(`\nDone. Assets for "${LOCALE}" are in assets/marketing/.`);
