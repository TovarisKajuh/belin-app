import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const hoisted = vi.hoisted(() => ({
  send: vi.fn(),
  logged: [] as Record<string, unknown>[],
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: hoisted.send };
  },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        hoisted.logged.push(row);
        return { error: null };
      },
    }),
  }),
}));

import { emailFrom, sendEmail } from "@/lib/email";
import { senderDomain } from "@/lib/email-shared";

const base = { kind: "login", projectId: null, subject: "s", html: "<p>h</p>" };

afterEach(() => {
  hoisted.send.mockReset();
  hoisted.logged.length = 0;
  delete process.env.EMAIL_FROM;
  delete process.env.RESEND_API_KEY;
});

describe("sendEmail reports what happened", () => {
  it("refuses a demo address without calling the provider", async () => {
    process.env.RESEND_API_KEY = "re_test";
    await expect(sendEmail({ ...base, to: "luka@avesol-demo.si" })).resolves.toEqual({
      sent: false,
      reason: "demo-domain",
    });
    expect(hoisted.send).not.toHaveBeenCalled();
  });

  it("says so when there is no API key", async () => {
    await expect(sendEmail({ ...base, to: "a@example.com" })).resolves.toEqual({
      sent: false,
      reason: "no-api-key",
    });
  });

  it("returns the caller's refusal without calling the provider", async () => {
    process.env.RESEND_API_KEY = "re_test";
    await expect(
      sendEmail({ ...base, to: "a@example.com", refuseReason: "no-base-url" }),
    ).resolves.toEqual({ sent: false, reason: "no-base-url" });
    expect(hoisted.send).not.toHaveBeenCalled();
    expect(hoisted.logged[0]).toMatchObject({ status: "failed", error: "no-base-url" });
  });

  it("passes the provider's refusal through, which is what a failed DKIM looks like", async () => {
    process.env.RESEND_API_KEY = "re_test";
    hoisted.send.mockResolvedValue({
      data: null,
      error: { message: "The getbelin.com domain is not verified." },
    });
    const result = await sendEmail({ ...base, to: "a@example.com" });
    expect(result).toEqual({ sent: false, reason: "The getbelin.com domain is not verified." });
    expect(hoisted.logged[0]).toMatchObject({ status: "failed" });
  });

  it("returns the provider id on success and logs it", async () => {
    process.env.RESEND_API_KEY = "re_test";
    hoisted.send.mockResolvedValue({ data: { id: "em_1" }, error: null });
    await expect(sendEmail({ ...base, to: "a@example.com" })).resolves.toEqual({
      sent: true,
      providerId: "em_1",
    });
    expect(hoisted.logged[0]).toMatchObject({ status: "sent", provider_id: "em_1" });
  });

  it("never throws, even when the provider does", async () => {
    process.env.RESEND_API_KEY = "re_test";
    hoisted.send.mockRejectedValue(new Error("socket hang up"));
    await expect(sendEmail({ ...base, to: "a@example.com" })).resolves.toEqual({
      sent: false,
      reason: "socket hang up",
    });
  });
});

describe("the sender", () => {
  it("defaults to getbelin.com and follows EMAIL_FROM", async () => {
    expect(emailFrom()).toBe("Belin <obvestila@getbelin.com>");
    process.env.EMAIL_FROM = "  Belin <belin@avesol.si> ";
    expect(emailFrom()).toBe("Belin <belin@avesol.si>");
    process.env.RESEND_API_KEY = "re_test";
    hoisted.send.mockResolvedValue({ data: { id: "em_2" }, error: null });
    await sendEmail({ ...base, to: "a@example.com" });
    expect(hoisted.send.mock.calls[0][0].from).toBe("Belin <belin@avesol.si>");
  });

  it("falls back to the default when EMAIL_FROM is blank", () => {
    process.env.EMAIL_FROM = "   ";
    expect(emailFrom()).toBe("Belin <obvestila@getbelin.com>");
  });

  it("reads the domain the health check must find verified", () => {
    expect(senderDomain("Belin <obvestila@getbelin.com>")).toBe("getbelin.com");
    expect(senderDomain("belin@AVESOL.si")).toBe("avesol.si");
    expect(senderDomain("no address")).toBe("");
  });
});
