import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// One database serves local, demo and production, and the browser holds the
// anon key. Two rules keep that safe and both are easy to forget in a new
// migration, so they are checked here rather than remembered:
// 1. every table in public has row level security enabled (deny-all for anon;
//    the app reads with the service role, which bypasses it);
// 2. every function in public has EXECUTE revoked from public, anon and
//    authenticated AFTER its last create. DROP plus CREATE, the overload
//    lesson of DECISIONS 2026-08-12, resets the grants to the open defaults.
const dir = path.resolve(__dirname, "../supabase/migrations");
const sources = readdirSync(dir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(path.join(dir, name), "utf8").replace(/--[^\n]*/g, "").toLowerCase());

// name -> position of its LAST match, ordered by file then by offset
function lastPositions(pattern: RegExp): Map<string, number> {
  const out = new Map<string, number>();
  sources.forEach((sql, fileIndex) => {
    for (const match of sql.matchAll(pattern)) {
      const at = fileIndex * 10_000_000 + (match.index ?? 0);
      if ((out.get(match[1]) ?? -1) < at) out.set(match[1], at);
    }
  });
  return out;
}

describe("migrations", () => {
  it("enable row level security on every public table", () => {
    const tables = lastPositions(/create table (?:if not exists )?public\.([a-z_]+)/g);
    const secured = lastPositions(/alter table public\.([a-z_]+) enable row level security/g);
    expect([...tables.keys()].filter((name) => !secured.has(name))).toEqual([]);
  });

  it("close EXECUTE to public, anon and authenticated after the last create of every public function", () => {
    const created = lastPositions(/create (?:or replace )?function public\.([a-z_]+)\s*\(/g);
    const revoked = lastPositions(
      /revoke execute on function public\.([a-z_]+)\s*\([^)]*\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/g,
    );
    const open = [...created].filter(([name, at]) => (revoked.get(name) ?? -1) < at).map(([name]) => name);
    expect(open).toEqual([]);
  });
});
