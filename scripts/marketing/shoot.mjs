import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { frameBrowser, framePhone } from "./frames.mjs";
import { LOCALE, BROWSER_LOCALE, dir } from "./locale.mjs";

// Every screen Belin sells itself with, shot by the machine.
//
// This exists because the alternative was the founder clicking through a script
// and photographing his own screen, which produces assets that are stale the day
// after any UI change and costs him an hour each time. Now it is one command,
// and the pictures are always of the product as it actually is today.
//
// It drives the SAME dev server that is already running, signing in by minting
// login tokens and walking the real magic-link flow, because a screenshot of a
// faked session is a screenshot of something that does not exist.

const BASE = process.env.BASE ?? "http://localhost:3000";
const RAW = dir("raw");
const FRAMED = dir("framed");

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PROJECT = "33333333-3333-4333-8333-333333333333";
const PEOPLE = {
  epc: "marko@sonce-demo.si",
  sub: "bostjan@avesol-demo.si",
  crew: "luka@avesol-demo.si",
};

/** Mints a login token and returns the verify URL, exactly as the app would email it. */
async function magicLink(email) {
  const raw = randomBytes(32).toString("base64url");
  const { data: person } = await db.from("people").select("id").ilike("email", email).maybeSingle();
  if (!person) throw new Error(`no person for ${email}`);
  await db.from("login_tokens").insert({
    person_id: person.id,
    token_hash: createHash("sha256").update(raw, "utf8").digest("hex"),
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
  });
  return `${BASE}/${LOCALE}/auth/verify/${raw}`;
}

/** A fresh browser context signed in as one person, with dev chrome suppressed. */
async function contextFor(browser, who, viewport, deviceScaleFactor) {
  const context = await browser.newContext({ viewport, deviceScaleFactor, locale: BROWSER_LOCALE });
  await context.addCookies([
    { name: "belin-shot", value: "1", url: BASE },
  ]);

  if (who) {
    const page = await context.newPage();
    await page.goto(await magicLink(PEOPLE[who]), { waitUntil: "domcontentloaded" });
    // The verify page never signs anyone in on GET; the confirm is the act.
    await page.getByRole("button").first().click();
    await page.waitForURL((url) => !url.pathname.includes("/auth/verify"), { timeout: 15000 });
    await page.close();
  }
  return context;
}

const SHOTS = [
  {
    name: "portfolio",
    who: "epc",
    viewport: { width: 1600, height: 1000 },
    scale: 2,
    path: `/${LOCALE}/app`,
    ready: ".pf-strip",
    frame: "browser",
    label: "belin-app.vercel.app",
  },
  {
    name: "epc-dashboard",
    who: "epc",
    viewport: { width: 1600, height: 1000 },
    scale: 2,
    path: `/${LOCALE}/app/${PROJECT}`,
    ready: ".e-proj-ring, .e-bar",
    frame: "browser",
    label: "belin-app.vercel.app",
  },
  {
    name: "epc-dashboard-days",
    who: "epc",
    viewport: { width: 1600, height: 1100 },
    scale: 2,
    path: `/${LOCALE}/app/${PROJECT}`,
    ready: ".e-bar",
    scrollTo: ".e-daylog, .e-sec:nth-of-type(4)",
    frame: "browser",
    label: "belin-app.vercel.app",
  },
  {
    name: "hours-countdown",
    who: "epc",
    viewport: { width: 1600, height: 1000 },
    scale: 2,
    path: `/${LOCALE}/app/${PROJECT}/hours`,
    ready: ".e-bar",
    frame: "browser",
    label: "belin-app.vercel.app",
  },
  {
    name: "settings-roster",
    who: "sub",
    viewport: { width: 1600, height: 1000 },
    scale: 2,
    path: `/${LOCALE}/app/settings`,
    ready: ".cr-list, .st-card",
    scrollTo: ".cr-list",
    frame: "browser",
    label: "belin-app.vercel.app",
  },
  {
    name: "crew-phone",
    who: "crew",
    viewport: { width: 390, height: 844 },
    scale: 3,
    path: `/${LOCALE}/app/${PROJECT}`,
    ready: ".cr-quick",
    frame: "phone",
    hide: [".ih-strip"],
  },
  {
    name: "crew-join",
    who: null,
    viewport: { width: 390, height: 844 },
    scale: 3,
    path: null, // filled at run time with the live crew token
    ready: ".cl-card",
    frame: "phone",
  },
];

async function crewLinkPath() {
  const { data } = await db
    .from("project_tokens")
    .select("token")
    .eq("project_id", PROJECT)
    .eq("role", "sub")
    .eq("revoked", false)
    .limit(1)
    .maybeSingle();
  return `/${LOCALE}/p/${data.token}`;
}

async function main() {
  const health = await fetch(`${BASE}/sl`).catch(() => null);
  if (!health?.ok) {
    console.error(`No dev server on ${BASE}. Start it first, then re-run.`);
    process.exit(1);
  }

  mkdirSync(RAW, { recursive: true });
  mkdirSync(FRAMED, { recursive: true });

  const browser = await chromium.launch();
  const crewPath = await crewLinkPath();

  for (const shot of SHOTS) {
    const context = await contextFor(browser, shot.who, shot.viewport, shot.scale);
    const page = await context.newPage();
    const path = shot.path ?? crewPath;

    await page.goto(BASE + path, { waitUntil: "networkidle" });
    // The launch animation covers the whole viewport on a cold load. Wait for it
    // to unmount rather than sleeping: the first run of this caught the splash
    // instead of the join screen.
    await page.waitForSelector("[data-splash]", { state: "detached", timeout: 15000 }).catch(() => {});
    await page.waitForSelector(shot.ready, { state: "visible", timeout: 15000 });

    // The scroll reveal animations settle, and any lazy image lands, before the
    // shutter: a screenshot of a half-faded section looks like a rendering bug.
    await page.evaluate(() => {
      document.querySelectorAll(".e-reveal").forEach((el) => el.classList.add("in"));
      // Next's dev indicator lives in a portal and would sit in the corner of
      // every desktop shot.
      document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
    });
    if (shot.hide?.length) {
      await page.evaluate((sels) => {
        sels.forEach((s) => document.querySelectorAll(s).forEach((el) => el.remove()));
      }, shot.hide);
    }
    if (shot.scrollTo) {
      await page.evaluate((sel) => {
        document.querySelector(sel)?.scrollIntoView({ block: "start" });
      }, shot.scrollTo);
    }
    await page.waitForTimeout(900);

    const buffer = await page.screenshot({ type: "png" });
    writeFileSync(`${RAW}/${shot.name}.png`, buffer);

    const framed =
      shot.frame === "phone"
        ? await framePhone(buffer)
        : await frameBrowser(buffer, { label: shot.label });
    writeFileSync(`${FRAMED}/${shot.name}.png`, framed);

    console.log(`shot ${shot.name.padEnd(20)} ${shot.viewport.width}x${shot.viewport.height} @${shot.scale}x`);
    await context.close();
  }

  await browser.close();
  console.log(`\n${SHOTS.length} screens in ${RAW} and ${FRAMED}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
