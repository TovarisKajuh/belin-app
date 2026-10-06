// add-doc.mjs: merge the doc namespace from <scratch>/doc-<locale>.json into messages/<locale>.json.
//   node add-doc.mjs <scratch> [dot.path ...]   (no paths: the whole namespace)
import { readFileSync, writeFileSync } from "node:fs";
const [scratch, ...paths] = process.argv.slice(2);
if (!scratch) throw new Error("usage: add-doc.mjs <scratch> [dot.path ...]");

function pick(tree, path) {
  return path.split(".").reduce((node, key) => (node === undefined ? undefined : node[key]), tree);
}
function merge(target, source, where, conflicts) {
  for (const [key, value] of Object.entries(source)) {
    const here = `${where}.${key}`;
    if (value !== null && typeof value === "object") {
      if (target[key] === undefined) target[key] = {};
      if (typeof target[key] !== "object") conflicts.push(`${here}: is text in the catalog, an object in the block`);
      else merge(target[key], value, here, conflicts);
    } else if (target[key] === undefined) {
      target[key] = value;
    } else if (target[key] !== value) {
      conflicts.push(`${here}: catalog "${String(target[key]).slice(0, 60)}" differs from block "${String(value).slice(0, 60)}"`);
    }
  }
}
for (const locale of ["sl", "de", "en"]) {
  const file = `messages/${locale}.json`;
  const raw = readFileSync(file, "utf8");
  const catalog = JSON.parse(raw);
  if (JSON.stringify(catalog, null, 2) + "\n" !== raw) throw new Error(`${file} does not round-trip; edit by hand instead`);
  const block = JSON.parse(readFileSync(`${scratch}/doc-${locale}.json`, "utf8"));
  if (!catalog.doc) catalog.doc = {};
  const conflicts = [];
  for (const path of paths.length > 0 ? paths : Object.keys(block)) {
    const value = pick(block, path);
    if (value === undefined) throw new Error(`doc.${path} is not in the block`);
    // Rebuild the path as a one-branch tree so merge() can walk it.
    const branch = path.split(".").reduceRight((child, key) => ({ [key]: child }), value);
    merge(catalog.doc, branch, "doc", conflicts);
  }
  if (conflicts.length > 0) throw new Error(`${file}:\n- ${conflicts.join("\n- ")}`);
  writeFileSync(file, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`${file}: doc merged`);
}
