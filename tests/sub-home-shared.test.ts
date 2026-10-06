import { describe, expect, it } from "vitest";
import { summarizeSubWaiting, type SubWaitingInput } from "@/lib/sub-home-shared";

const NOW = new Date("2026-10-06T08:00:00Z");
const base: SubWaitingInput = {
  po: null,
  sheets: [],
  orders: [],
  projectStatus: "active",
  progressPercent: 40,
  finalizationRequestedAt: null,
  acceptance: null,
  invoice: null,
  isOffice: true,
  country: "si",
};

describe("summarizeSubWaiting", () => {
  it("a sent naročilnica is the office's move", () => {
    const r = summarizeSubWaiting(
      { ...base, po: { number: 1, status: "sent", sentAt: "2026-10-05T09:00:00Z", acceptedAt: null, rejectedAt: null } },
      NOW,
    );
    expect(r.po).toMatchObject({ tone: "action", state: "sent", number: 1 });
    expect(r.actionCount).toBe(1);
  });

  it("a sent naročilnica only waits for a person who cannot accept it", () => {
    const r = summarizeSubWaiting(
      { ...base, isOffice: false, po: { number: 1, status: "sent", sentAt: null, acceptedAt: null, rejectedAt: null } },
      NOW,
    );
    expect(r.po.tone).toBe("waiting");
    expect(r.actionCount).toBe(0);
  });

  it("a draft naročilnica is invisible to the subcontractor", () => {
    const r = summarizeSubWaiting(
      { ...base, po: { number: 1, status: "draft", sentAt: null, acceptedAt: null, rejectedAt: null } },
      NOW,
    );
    expect(r.po).toMatchObject({ tone: "idle", state: "none" });
  });

  it("hours: a draft is the subcontractor's move, a submitted sheet counts down", () => {
    const draft = summarizeSubWaiting({ ...base, sheets: [{ number: 3, status: "draft", deadlineAt: null, hours: 4 }] }, NOW);
    expect(draft.hours).toMatchObject({ tone: "action", drafts: 1 });
    const waiting = summarizeSubWaiting(
      { ...base, sheets: [{ number: 2, status: "submitted", deadlineAt: "2026-10-09T21:59:59Z", hours: 5 }] },
      NOW,
    );
    expect(waiting.hours.tone).toBe("waiting");
    expect(waiting.hours.awaiting).toBe(1);
    expect(waiting.hours.nearestDaysLeft).toBe(3);
  });

  it("hours: a lapsed deadline counts as approved", () => {
    const r = summarizeSubWaiting(
      { ...base, sheets: [{ number: 2, status: "submitted", deadlineAt: "2026-10-01T21:59:59Z", hours: 5 }] },
      NOW,
    );
    expect(r.hours).toMatchObject({ tone: "ok", awaiting: 0, approvedHours: 5 });
  });

  it("dodatna dela: submitted waits, approved sums the money and counts the unpriced", () => {
    const r = summarizeSubWaiting(
      {
        ...base,
        orders: [
          { number: 1, status: "approved", amount: 1200 },
          { number: 2, status: "approved", amount: null },
        ],
      },
      NOW,
    );
    expect(r.co).toMatchObject({ tone: "ok", approved: 2, approvedAmount: 1200, unpriced: 1 });
    const w = summarizeSubWaiting({ ...base, orders: [{ number: 3, status: "submitted", amount: 300 }] }, NOW);
    expect(w.co.tone).toBe("waiting");
  });

  it("zaključek walks running, ready, requested, accepted, invoiced, finished", () => {
    expect(summarizeSubWaiting(base, NOW).final.state).toBe("running");
    expect(summarizeSubWaiting({ ...base, progressPercent: 100 }, NOW).final).toMatchObject({ state: "ready", tone: "action" });
    expect(
      summarizeSubWaiting({ ...base, progressPercent: 100, finalizationRequestedAt: "2026-10-05T10:00:00Z" }, NOW).final.state,
    ).toBe("requested");
    expect(
      summarizeSubWaiting(
        { ...base, acceptance: { kind: "final", status: "signed", conductedAt: "2026-10-05T10:00:00Z" } },
        NOW,
      ).final,
    ).toMatchObject({ state: "accepted", tone: "action" });
    expect(
      summarizeSubWaiting({ ...base, invoice: { number: "2026-001", issueDate: "2026-10-05" } }, NOW).final,
    ).toMatchObject({ state: "invoiced", tone: "ok", invoiceNumber: "2026-001" });
    expect(summarizeSubWaiting({ ...base, projectStatus: "finished" }, NOW).final.state).toBe("finished");
  });

  it("a partial acceptance does not end the project", () => {
    const r = summarizeSubWaiting(
      { ...base, acceptance: { kind: "partial", status: "signed", conductedAt: "2026-10-05T10:00:00Z" } },
      NOW,
    );
    expect(r.final.state).toBe("running");
  });
});
