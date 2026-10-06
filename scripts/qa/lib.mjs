// Shared Playwright helpers for Wave 5 verification and the Gate 5 sweep.
// Signs in exactly like a magic link: one login_tokens row, then the verify
// page's confirm button. Never submits anything else.
// One database serves local and production: take C:\DevEnv\belin-db.lock
// before any run that signs in (index rule 11).
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
function envValue(name) {
  if (process.env[name]) return process.env[name];
  const line = readFileSync(path.join(ROOT, ".env.local"), "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : undefined;
}

export const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/$/, "");
export const TR = "33333333-3333-4333-8333-333333333333";
export const D1 = "33333333-3333-4333-8333-333333333334";
export const PERSONAS = {
  epc: "66666666-6666-4666-8666-666666666605",
  sub: "66666666-6666-4666-8666-666666666603",
  crew: "66666666-6666-4666-8666-666666666602",
};
export const VIEWPORTS = {
  w1440: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  w390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  w360: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

let client = null;
export function db() {
  client ??= createClient(envValue("NEXT_PUBLIC_SUPABASE_URL"), envValue("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  return client;
}

export function launch() {
  return chromium.launch();
}

export async function signedInContext(browser, persona, vp) {
  const raw = randomBytes(32).toString("base64url");
  const { error } = await db().from("login_tokens").insert({
    person_id: PERSONAS[persona],
    token_hash: createHash("sha256").update(raw, "utf8").digest("hex"),
    expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
  if (error) throw new Error(`login token for ${persona}: ${error.message}`);
  const ctx = await browser.newContext({ ...VIEWPORTS[vp], locale: "sl-SI" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sl/auth/verify/${raw}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByRole("button").first().click();
  await page.waitForURL((u) => !u.pathname.includes("/auth/verify"), { timeout: 90_000 });
  await page.close();
  return ctx;
}

export async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.waitForSelector("[data-splash]", { state: "detached", timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(500);
}

export async function measure(page, { phone }) {
  return page.evaluate((isPhone) => {
    const sel = 'a[href], button, input:not([type=hidden]), textarea, select, [role=button], [role=radio], [role=tab], summary';
    const small = [];
    if (isPhone) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.display === "none") continue;
        if (el.closest("nextjs-portal, [data-sonner-toaster], .lp-foot, .lg-doc")) continue;
        if (cs.display === "inline" && el.closest("p")) continue;
        if (r.width < 44 || r.height < 44) {
          const text = (el.getAttribute("aria-label") || el.innerText || el.value || "").toString().trim().replace(/\s+/g, " ").slice(0, 30);
          small.push({ cls: String(el.className).slice(0, 40), text, w: Math.round(r.width), h: Math.round(r.height) });
        }
      }
    }
    const zeroBars = [...document.querySelectorAll(".sh-bar i, .e-sfill, .sb-fill")].filter(
      (el) => el.getBoundingClientRect().width === 0 && parseFloat(el.style.width || "0") > 0,
    ).length;
    const sizes = new Set();
    for (const el of document.querySelectorAll(".belin-dark *")) sizes.add(getComputedStyle(el).fontSize);
    return {
      url: location.pathname + location.search,
      title: document.title,
      innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
      hasHeader: Boolean(document.querySelector(".ah")),
      oldBar: Boolean(document.querySelector(".e-bar")),
      liveFixed: Boolean(document.querySelector(".e-live-fixed")),
      fontSizes: [...sizes].sort((a, b) => parseFloat(a) - parseFloat(b)),
      zeroBars,
      small,
    };
  }, phone);
}
