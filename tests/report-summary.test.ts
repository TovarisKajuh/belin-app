import { describe, expect, it } from "vitest";
import { summarizeTodayPosts } from "@/lib/reports-shared";

describe("summarizeTodayPosts", () => {
  it("shapes entries with their quantities and photo counts", () => {
    const posts = summarizeTodayPosts(
      [{ id: "e1", note: "Sued", headcount: 4, created_at: "2026-07-17T09:00:00Z" }],
      { e1: [{ scope_item_id: "s1", qty: 100 }] },
      { e1: 3 },
      { s1: { name: "Moduli", unit: "kos" } }
    );
    expect(posts).toEqual([
      {
        id: "e1",
        note: "Sued",
        headcount: 4,
        photoCount: 3,
        quantities: [{ name: "Moduli", qty: 100, unit: "kos" }],
        createdAt: "2026-07-17T09:00:00Z",
      },
    ]);
  });

  it("defaults missing photo counts and quantities to empty", () => {
    const posts = summarizeTodayPosts(
      [{ id: "e2", note: null, headcount: null, created_at: "2026-07-17T10:00:00Z" }],
      {},
      {},
      {}
    );
    expect(posts[0].photoCount).toBe(0);
    expect(posts[0].quantities).toEqual([]);
  });
});
