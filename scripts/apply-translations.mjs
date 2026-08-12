import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// One-off tool for the single translation pass (Task 19).
//
// Belin is built in Slovenian only while a feature is still moving; de and en
// carry the Slovenian string as a placeholder so the parity test keeps guarding
// the key structure. When a feature is settled, its German and English wording
// is written once, in one pass, and applied here.
//
// Usage: node scripts/apply-translations.mjs <dir-with-t*.json>
// Each file maps "dotted.key" -> { de, en }.

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/apply-translations.mjs <dir>");
  process.exit(1);
}

const table = {};
for (const file of readdirSync(dir).filter((f) => /^t\d+\.json$/.test(f)).sort()) {
  const part = JSON.parse(readFileSync(join(dir, file), "utf8"));
  for (const [key, value] of Object.entries(part)) {
    if (table[key]) throw new Error(`duplicate key across files: ${key}`);
    table[key] = value;
  }
}
console.log(`loaded ${Object.keys(table).length} translations`);

const sl = JSON.parse(readFileSync("messages/sl.json", "utf8"));

function get(obj, path) {
  return path.split(".").reduce((node, part) => (node == null ? undefined : node[part]), obj);
}
function set(obj, path, value) {
  const parts = path.split(".");
  const last = parts.pop();
  let node = obj;
  for (const part of parts) {
    if (typeof node[part] !== "object" || node[part] === null) node[part] = {};
    node = node[part];
  }
  node[last] = value;
}

// A key that does not exist in sl would silently create a new branch in de/en
// and break parity in the other direction, so refuse the whole run.
const unknown = Object.keys(table).filter((key) => typeof get(sl, key) !== "string");
if (unknown.length) {
  console.error("keys not present in sl.json:");
  for (const key of unknown) console.error(`  ${key}`);
  process.exit(1);
}

for (const locale of ["de", "en"]) {
  const catalog = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"));
  let written = 0;
  for (const [key, value] of Object.entries(table)) {
    const text = value[locale];
    if (typeof text !== "string" || text.trim() === "") {
      console.error(`missing ${locale} for ${key}`);
      process.exit(1);
    }
    set(catalog, key, text);
    written += 1;
  }
  writeFileSync(`messages/${locale}.json`, JSON.stringify(catalog, null, 2) + "\n", "utf8");
  console.log(`messages/${locale}.json: ${written} keys written`);
}

// What is still a Slovenian placeholder after this run, so the remaining debt is
// a number rather than a feeling.
function flatten(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else flatten(value, path, out);
  }
  return out;
}
const flatSl = flatten(sl);
for (const locale of ["de", "en"]) {
  const flat = flatten(JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")));
  const left = Object.keys(flatSl).filter((key) => flat[key] === flatSl[key]);
  console.log(`${locale}: ${left.length} keys still identical to sl`);
  for (const key of left) console.log(`  ${key} | ${flatSl[key]}`);
}
