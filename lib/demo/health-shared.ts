// The presenter panel's lights, judged here so the thresholds are tested. Pure.

import { lastSiteDayBefore } from "@/lib/demo/calendar";

export type LightState = "ok" | "warn" | "bad";

export type DemoHealth = {
  db: { ok: boolean; flagged: boolean; ms: number | null };
  region: string | null;
  fresh: string | null;
  sheet: { status: string; deadline_at: string | null } | null;
  po: { pdf_path: string | null; pdf_sha256: string | null }[];
};

export const DB_OK_MS = 400;
export const DB_WARN_MS = 1500;

export function dbLight(db: DemoHealth["db"]): LightState {
  if (!db.ok || !db.flagged || db.ms === null) return "bad";
  if (db.ms <= DB_OK_MS) return "ok";
  return db.ms <= DB_WARN_MS ? "warn" : "bad";
}

/** Functions belong in Frankfurt next to the database (D14). */
export function regionLight(region: string | null): LightState {
  return region === "fra1" ? "ok" : "warn";
}

/** Trenutno's newest report is on the last site day before today, or later. */
export function freshLight(last: string | null, todayIso: string): LightState {
  if (!last) return "bad";
  return last >= lastSiteDayBefore(todayIso) ? "ok" : "bad";
}

/** The open hour sheet is still submitted and its deadline is ahead: the countdown exists. */
export function sheetLight(sheet: DemoHealth["sheet"], now: Date): LightState {
  if (!sheet || sheet.status !== "submitted" || !sheet.deadline_at) return "bad";
  return Date.parse(sheet.deadline_at) > now.getTime() ? "ok" : "bad";
}

/** Both naročilnice can be opened and accepted: a stored PDF and its hash. */
export function poLight(rows: DemoHealth["po"]): LightState {
  return rows.length === 2 && rows.every((r) => r.pdf_path && /^[0-9a-f]{64}$/.test(r.pdf_sha256 ?? "")) ? "ok" : "bad";
}
