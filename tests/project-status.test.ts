import { describe, expect, it } from "vitest";
import {
  statusTransitions,
  canTransition,
  transitionActionKey,
  needsConfirm,
  PROJECT_STATUSES,
} from "@/lib/project-status";

describe("statusTransitions", () => {
  it("lets the EPC pause or cancel an active project, never finish it from the menu", () => {
    expect(statusTransitions("epc", "active").sort()).toEqual(["cancelled", "paused"]);
  });

  it("lets the EPC resume a paused project", () => {
    expect(statusTransitions("epc", "paused")).toContain("active");
  });

  it("lets the EPC send a review back or cancel; finishing goes through the acceptance", () => {
    expect(statusTransitions("epc", "reviewing").sort()).toEqual(["active", "cancelled"]);
  });

  it("never offers finished to anybody (D10: the signed acceptance finishes a project)", () => {
    for (const status of PROJECT_STATUSES) {
      expect(canTransition("epc", status, "finished")).toBe(false);
      expect(canTransition("sub", status, "finished")).toBe(false);
    }
  });

  it("gives the EPC no moves from end states", () => {
    expect(statusTransitions("epc", "finished")).toEqual([]);
    expect(statusTransitions("epc", "cancelled")).toEqual([]);
  });

  it("lets the sub request a review from active and withdraw it", () => {
    // Requesting a review left the shared status control: it is now its own
    // office-only action, so the sub side offers nothing while a project is
    // active. Two doors to the same state, only one of which notified the
    // client, was the thing worth removing.
    expect(statusTransitions("sub", "active")).toEqual([]);
    expect(statusTransitions("sub", "reviewing")).toEqual(["active"]);
  });

  it("gives the sub no moves from paused, finished or cancelled", () => {
    expect(statusTransitions("sub", "paused")).toEqual([]);
    expect(statusTransitions("sub", "finished")).toEqual([]);
    expect(statusTransitions("sub", "cancelled")).toEqual([]);
  });

  it("canTransition guards illegal moves", () => {
    expect(canTransition("sub", "active", "finished")).toBe(false);
    expect(canTransition("sub", "active", "reviewing")).toBe(false);
    // Withdrawing your own request stays available: it forms no contract, and
    // a crew who asked for review by mistake should be able to undo it.
    expect(canTransition("sub", "reviewing", "active")).toBe(true);
    expect(canTransition("epc", "finished", "active")).toBe(false);
  });

  it("exposes the full status set", () => {
    expect(PROJECT_STATUSES).toEqual(["draft", "active", "paused", "reviewing", "finished", "cancelled"]);
  });
});

describe("transitionActionKey", () => {
  it("labels the sub's review request and withdrawal", () => {
    expect(transitionActionKey("sub", "active", "reviewing")).toBe("requestReview");
    expect(transitionActionKey("sub", "reviewing", "active")).toBe("withdrawReview");
  });
  it("labels the epc accept versus plain finish", () => {
    expect(transitionActionKey("epc", "reviewing", "finished")).toBe("acceptReview");
    expect(transitionActionKey("epc", "active", "finished")).toBe("finish");
  });
  it("labels epc send-back versus resume", () => {
    expect(transitionActionKey("epc", "reviewing", "active")).toBe("sendBack");
    expect(transitionActionKey("epc", "paused", "active")).toBe("resume");
  });
});

describe("needsConfirm", () => {
  it("asks before a move with no way back", () => {
    expect(needsConfirm("cancelled")).toBe(true);
    expect(needsConfirm("paused")).toBe(false);
    expect(needsConfirm("active")).toBe(false);
  });
});
