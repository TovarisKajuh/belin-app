// Pure material-check logic, no server imports, fully unit tested. The data
// layer and the client both build on these; keeping them framework-free means
// the gate rules and the payload validation are testable in the node
// environment without a database or a browser.

export type MaterialCheckStatus = "present" | "partial" | "missing";

export interface MaterialItemRow {
  id: string;
  name: string;
  qty: number;
  unit: string;
  sortOrder: number;
  updatedAt: string; // ISO timestamptz from the DB
}

export interface MaterialCheckItemRow {
  materialItemId: string;
  status: MaterialCheckStatus;
  missingQty: number | null;
}

export interface MaterialDocRow {
  kind: "material_photo" | "delivery_note";
  storagePath: string;
  sortOrder: number;
}

export interface LatestCheck {
  id: string;
  isComplete: boolean;
  note: string | null;
  checkedAt: string; // ISO
  items: MaterialCheckItemRow[]; // empty array means the "not arrived yet" escape
  docs: MaterialDocRow[];
}

export interface MaterialState {
  items: MaterialItemRow[];
  latest: LatestCheck | null;
  needsFirstCheck: boolean; // latest === null: the crew gate (escapable)
  // Items the latest check does not settle: any item with no row in the check,
  // OR an item whose updatedAt postdates checkedAt. Membership comes first: an
  // item added while the crew's form was open has no row in the submitted check
  // and MUST count, even though its updatedAt predates checkedAt. The escape
  // state (a check with no items) therefore counts every item, keeping a
  // standing prompt until a real check covers the list.
  uncoveredOrChanged: number;
}

export function buildMaterialState(
  items: MaterialItemRow[],
  latest: LatestCheck | null
): MaterialState {
  if (latest === null) {
    return { items, latest, needsFirstCheck: true, uncoveredOrChanged: items.length };
  }

  const covered = new Set(latest.items.map((i) => i.materialItemId));
  const checkedAtMs = Date.parse(latest.checkedAt);

  let count = 0;
  for (const item of items) {
    if (!covered.has(item.id)) {
      count += 1; // not settled by this check at all (mid-flight add, or escape)
      continue;
    }
    if (Date.parse(item.updatedAt) > checkedAtMs) {
      count += 1; // changed since it was checked
    }
  }

  return { items, latest, needsFirstCheck: false, uncoveredOrChanged: count };
}

export type CheckDraft = Record<
  string,
  { status: MaterialCheckStatus | null; missingQty: number | null }
>;

export type CheckItemsPayload = {
  material_item_id: string;
  status: MaterialCheckStatus;
  missing_qty: number | null;
};

// Turns a client draft into RPC-ready items. isComplete here is for optimistic
// UI only; the database derives its own authoritative completeness.
export function buildCheckItemsPayload(
  items: MaterialItemRow[],
  draft: CheckDraft
):
  | { ok: true; items: CheckItemsPayload[]; isComplete: boolean }
  | { ok: false; error: "unresolved" | "badQty" } {
  const out: CheckItemsPayload[] = [];

  for (const item of items) {
    const entry = draft[item.id];
    const status = entry?.status ?? null;
    if (status === null) return { ok: false, error: "unresolved" };

    if (status === "present") {
      out.push({ material_item_id: item.id, status, missing_qty: null });
      continue;
    }

    if (status === "partial") {
      // "partial" means some of it is missing but not all: 0 < missing < qty.
      // qty <= 0 items cannot be partial at all.
      if (item.qty <= 0) return { ok: false, error: "badQty" };
      const q = entry?.missingQty;
      if (q === null || q === undefined || Number.isNaN(q) || q <= 0 || q >= item.qty) {
        return { ok: false, error: "badQty" };
      }
      out.push({ material_item_id: item.id, status, missing_qty: q });
      continue;
    }

    // missing: the whole line. missingQty defaults to the full qty; null when qty <= 0.
    const q = entry?.missingQty;
    const missing = q === null || q === undefined ? (item.qty > 0 ? item.qty : null) : q;
    if (missing !== null && (Number.isNaN(missing) || missing <= 0)) {
      return { ok: false, error: "badQty" };
    }
    out.push({ material_item_id: item.id, status, missing_qty: missing });
  }

  const isComplete = out.length > 0 && out.every((i) => i.status === "present");
  return { ok: true, items: out, isComplete };
}

export function shortfallCount(items: MaterialCheckItemRow[]): number {
  return items.filter((i) => i.status !== "present").length;
}

// Parses a quantity the crew typed, accepting a comma or a period as the
// decimal separator (Slovenian keyboards produce commas). Returns NaN for
// unparseable input; rounds to 2 decimals to match the numeric(12,2) column.
export function parseQty(raw: string): number {
  const cleaned = raw.trim().replace(",", ".");
  if (cleaned === "") return NaN;
  const n = Number(cleaned);
  if (Number.isNaN(n)) return NaN;
  return Math.round(n * 100) / 100;
}
