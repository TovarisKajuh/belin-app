// Signs in through the Demo Door as every persona and screenshots where each lands.
//   node --env-file=.env.local scripts/demo-door-smoke.mjs <base url> <output folder>
// The key comes from DEMO_DOOR_KEY and is never printed: error text is scrubbed.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = process.argv[3] ?? path.join(process.cwd(), "door-smoke");
const KEY = process.env.DEMO_DOOR_KEY ?? "";
if (KEY.length < 32) {
  console.error("DEMO_DOOR_KEY is missing or shorter than 32 characters in this environment.");
  process.exit(1);
}
const scrub = (text) => String(text).split(KEY).join("<KEY>");
mkdirSync(OUT, { recursive: true });

const TR = "33333333-3333-4333-8333-333333333333";
const D1 = "33333333-3333-4333-8333-333333333334";
const DOOR = `${BASE}/sl/demo/${KEY}`;
const phone = (width, height) => ({ viewport: { width, height }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const desk = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const RUNS = [
  { persona: "epcAdmin", project: "portfelj", ctx: desk, expect: "/sl/app" },
  { persona: "epcAdmin", project: "trenutno", ctx: desk, expect: `/sl/app/${TR}` },
  { persona: "bauleiter", project: "trenutno", ctx: desk, expect: `/sl/app/${TR}` },
  { persona: "subOffice", project: "trenutno", ctx: phone(390, 844), expect: `/sl/app/${TR}` },
  { persona: "subOffice", project: "dan1", ctx: phone(360, 740), expect: `/sl/app/${D1}` },
  { persona: "crew", project: "trenutno", ctx: phone(390, 844), expect: `/sl/app/${TR}` },
  { persona: "crew", project: "dan1", ctx: phone(360, 740), expect: `/sl/app/${D1}` },
];

async function settle(page) {
  await page.waitForSelector("[data-splash]", { state: "detached", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
}

const results = [];
const browser = await chromium.launch();
try {
  // 1. A wrong key is a plain 404.
  const wrong = await fetch(`${BASE}/sl/demo/${"x".repeat(43)}`);
  results.push({ check: "wrong key", status: wrong.status });

  // 2. Every persona, from the panel.
  for (const run of RUNS) {
    const context = await browser.newContext({ ...run.ctx, locale: "sl-SI" });
    const page = await context.newPage();
    try {
      await page.goto(DOOR, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.locator(`button[data-persona="${run.persona}"][data-project="${run.project}"]`).click();
      await page.waitForURL((u) => u.pathname === run.expect, { timeout: 90000 });
      await settle(page);
      const cookies = await context.cookies();
      const demo = cookies.find((c) => c.name === "belin-demo");
      const session = cookies.find((c) => c.name === "belin_session");
      const file = path.join(OUT, `${run.persona}-${run.project}-${run.ctx.viewport.width}.png`);
      await page.screenshot({ path: file });
      results.push({
        persona: run.persona, project: run.project, width: run.ctx.viewport.width,
        landed: new URL(page.url()).pathname, demoCookieHttpOnly: demo?.httpOnly ?? null,
        sessionHoursLeft: session ? Math.round((session.expires * 1000 - Date.now()) / 3600000) : null,
        switchVisible: await page.locator(".dm-switch").isVisible(),
        overflowX: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
        file,
      });
    } catch (err) {
      results.push({ persona: run.persona, project: run.project, error: scrub(err.message) });
    } finally {
      await context.close();
    }
  }

  // 3. The persona switch keeps the project: EPC admin on Trenutno becomes the sub office.
  {
    const context = await browser.newContext({ ...desk, locale: "sl-SI" });
    const page = await context.newPage();
    try {
      await page.goto(DOOR, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.locator('button[data-persona="epcAdmin"][data-project="trenutno"]').click();
      await page.waitForURL((u) => u.pathname === `/sl/app/${TR}`, { timeout: 90000 });
      await settle(page);
      await page.locator(".dm-chip").click();
      await page.locator('button.dm-opt[data-persona="subOffice"]').click();
      // The switch lands on the SAME path, so wait for the role, not the URL.
      await page.waitForFunction(
        () => document.querySelector(".dm-chip")?.textContent?.includes("Podizvajalec") ?? false,
        null,
        { timeout: 60000 },
      );
      await settle(page);
      const file = path.join(OUT, "switch-epc-to-sub-1440.png");
      await page.screenshot({ path: file });
      results.push({ check: "switch keeps project", landed: new URL(page.url()).pathname, chip: await page.locator(".dm-chip").innerText(), file });
    } catch (err) {
      results.push({ check: "switch keeps project", error: scrub(err.message) });
    } finally {
      await context.close();
    }
  }

  // 4. The guest QR: a fresh phone, no presenter cookie, no switch, two hours.
  {
    const panel = await browser.newContext({ ...desk, locale: "sl-SI" });
    const page = await panel.newPage();
    let guestUrl = null;
    try {
      await page.goto(DOOR, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.screenshot({ path: path.join(OUT, "panel-1440.png"), fullPage: true });
      guestUrl = await page.locator("a.dm-qr-link").getAttribute("href");
    } finally {
      await panel.close();
    }
    for (const [label, url] of [["guest", guestUrl], ["guest tampered", guestUrl?.replace(/\/gost\/(.)/, (m, c) => `/gost/${c === "e" ? "f" : "e"}`)]]) {
      const context = await browser.newContext({ ...phone(390, 844), locale: "sl-SI" });
      const guest = await context.newPage();
      try {
        await guest.goto(url.startsWith("http") ? url : `${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 120000 });
        await settle(guest);
        const cookies = await context.cookies();
        const session = cookies.find((c) => c.name === "belin_session");
        const file = path.join(OUT, `${label.replace(" ", "-")}-390.png`);
        await guest.screenshot({ path: file });
        results.push({
          check: label, landed: new URL(guest.url()).pathname,
          presenterCookie: cookies.some((c) => c.name === "belin-demo"),
          sessionHoursLeft: session ? Math.round((session.expires * 1000 - Date.now()) / 3600000) : null,
          switchCount: await guest.locator(".dm-switch").count(),
          tabs: await guest.locator(".cr-tabs").count(), file,
        });
      } catch (err) {
        results.push({ check: label, error: scrub(err.message) });
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
console.log(scrub(JSON.stringify(results, null, 1)));
