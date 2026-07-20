import { describe, it, expect } from "vitest";
import {
  NOTIFY_KINDS,
  recipientsFor,
  emailSubjectKey,
  emailBodyKey,
  wantsEmail,
  type NotifyKind,
} from "@/lib/notify-shared";

describe("recipientsFor", () => {
  it("sends the events the EPC must react to, to the EPC only", () => {
    for (const kind of [
      "entry_submitted",
      "material_check_completed",
      "request_created",
      "incident_created",
      "hours_submitted",
      "change_order_submitted",
      "finalization_requested",
    ] as NotifyKind[]) {
      expect(recipientsFor(kind)).toEqual(["epc"]);
    }
  });

  it("sends the decisions the sub is waiting on, to the sub only", () => {
    for (const kind of [
      "request_resolved",
      "hours_decided",
      "hours_deemed_approved",
      "change_order_decided",
      "po_sent",
      "document_expiring",
    ] as NotifyKind[]) {
      expect(recipientsFor(kind)).toEqual(["sub"]);
    }
  });

  // The naročilnica acceptance is the contract-forming act: both sides must hold
  // the same confirmation, which is what makes the evidence trail worth anything.
  it("sends the contract-forming acts to both sides", () => {
    for (const kind of [
      "po_accepted",
      "po_rejected",
      "acceptance_signed",
      "invoice_sent",
    ] as NotifyKind[]) {
      expect(recipientsFor(kind)).toEqual(["epc", "sub"]);
    }
  });

  it("gives every declared kind at least one recipient", () => {
    for (const kind of NOTIFY_KINDS) {
      expect(recipientsFor(kind).length).toBeGreaterThan(0);
    }
  });
});

describe("message keys", () => {
  it("derives the catalog keys from the kind", () => {
    expect(emailSubjectKey("po_sent")).toBe("notify.subject.po_sent");
    expect(emailBodyKey("po_sent")).toBe("notify.body.po_sent");
  });
});

describe("wantsEmail", () => {
  it("defaults to true when nothing is stored", () => {
    expect(wantsEmail({}, "po_sent")).toBe(true);
    expect(wantsEmail(null, "po_sent")).toBe(true);
    expect(wantsEmail(undefined, "po_sent")).toBe(true);
  });

  it("is disabled only by an explicit false", () => {
    expect(wantsEmail({ po_sent: false }, "po_sent")).toBe(false);
    expect(wantsEmail({ po_sent: true }, "po_sent")).toBe(true);
  });

  // A garbled preference bag must never silence a notification: the safe
  // failure is one email too many, not a missed naročilnica.
  it("ignores values that are not a boolean false", () => {
    expect(wantsEmail({ po_sent: 0 }, "po_sent")).toBe(true);
    expect(wantsEmail({ po_sent: "false" }, "po_sent")).toBe(true);
    expect(wantsEmail("not an object", "po_sent")).toBe(true);
    expect(wantsEmail([], "po_sent")).toBe(true);
  });

  it("keeps preferences independent per kind", () => {
    const prefs = { po_sent: false };
    expect(wantsEmail(prefs, "po_sent")).toBe(false);
    expect(wantsEmail(prefs, "po_accepted")).toBe(true);
  });
});
