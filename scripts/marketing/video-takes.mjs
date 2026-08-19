import { readFileSync, mkdirSync, rmSync, readdirSync, renameSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

// The raw footage: one webm per scene, filmed by driving the real app.
//
// Same rules as the screenshot pipeline. Real minted login tokens walked
// through the real magic link, the seeded demo underneath, and the `belin-shot`
// cookie so no dev chrome is in frame. Nothing here is simulated: the report
// that appears on the dashboard in scene 2 is the one the thumb sent in scene 1.
//
// Deliberately SLOW. Every interaction is padded, because a recording of a
// machine filling a form at machine speed is unwatchable and, worse, unbelievable.

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = "assets/marketing/video/takes";
const PROJECT = "33333333-3333-4333-8333-333333333333";
const PEOPLE = {
  epc: "marko@sonce-demo.si",
  sub: "bostjan@avesol-demo.si",
  crew: "luka@avesol-demo.si",
};

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

async function magicLink(email) {
  const raw = randomBytes(32).toString("base64url");
  const { data: person } = await db.from("people").select("id").ilike("email", email).maybeSingle();
  if (!person) throw new Error(`no person for ${email}`);
  await db.from("login_tokens").insert({
    person_id: person.id,
    token_hash: createHash("sha256").update(raw, "utf8").digest("hex"),
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
  });
  return `${BASE}/sl/auth/verify/${raw}`;
}

/** A recording context, signed in, with dev chrome suppressed. */
async function take(browser, { who, viewport, name }) {
  const context = await browser.newContext({
    viewport,
    locale: "sl-SI",
    recordVideo: { dir: `${OUT}/.raw-${name}`, size: viewport },
  });
  await context.addCookies([{ name: "belin-shot", value: "1", url: BASE }]);

  // The launch animation, killed before it can paint a single frame.
  //
  // It is right for a real cold start and wrong for a camera: three seconds of
  // a loading animation at the head of every take, and those are the three
  // seconds that decide whether anyone watches the rest. Done here rather than
  // in the component because the app renders the splash on the server, and a
  // client-side "skip it" makes the server and client trees disagree, which in
  // React 19 leaves the whole page unhydrated. An init script runs before any
  // of that exists.
  await context.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "[data-splash]{display:none !important}";
    const attach = () => document.head?.appendChild(style);
    if (document.head) attach();
    else document.addEventListener("DOMContentLoaded", attach, { once: true });
  });

  if (who) {
    // Signing in happens in a SEPARATE page so the verify screen is never in
    // frame: the recording is per context, and a page that is opened and closed
    // still contributes its own file, which is why each take gets its own dir
    // and only the last file is kept.
    const auth = await context.newPage();
    await auth.goto(await magicLink(PEOPLE[who]), { waitUntil: "domcontentloaded" });
    await auth.getByRole("button").first().click();
    await auth.waitForURL((url) => !url.pathname.includes("/auth/verify"), { timeout: 20000 });
    await auth.close();
  }
  return context;
}

/** Closes the context and leaves exactly one webm named after the scene. */
async function finish(context, name) {
  await context.close();
  const dir = `${OUT}/.raw-${name}`;
  const files = readdirSync(dir).filter((f) => f.endsWith(".webm"));
  // The biggest file is the scene: any sign-in page produced a tiny one.
  const chosen = files
    .map((f) => ({ f, size: readFileSync(`${dir}/${f}`).length }))
    .sort((a, b) => b.size - a.size)[0];
  renameSync(`${dir}/${chosen.f}`, `${OUT}/${name}.webm`);
  rmSync(dir, { recursive: true, force: true });
  console.log(`take ${name.padEnd(10)} ${(chosen.size / 1024).toFixed(0)} KB`);
}

const settle = (page, ms) => page.waitForTimeout(ms);

/**
 * A tap, the way a viewer can see it.
 *
 * A recording of a form filling itself is unreadable: things change and nobody
 * knows why. A ring at the point of contact turns every change into a visible
 * cause. Drawn into the page rather than added in the edit, so it lands exactly
 * where the click lands, at the real resolution, with no compositing.
 */
async function tap(page, locator, { hold = 420 } = {}) {
  await locator.scrollIntoViewIfNeeded();
  await settle(page, 220);
  const box = await locator.boundingBox();
  if (box) {
    await page.evaluate(
      ([x, y]) => {
        const ring = document.createElement("div");
        ring.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:74px;height:74px;
          margin:-37px 0 0 -37px;border-radius:999px;border:3px solid #ffd21a;
          box-shadow:0 0 26px rgba(255,210,26,.55);pointer-events:none;z-index:2147483647;
          transform:scale(.35);opacity:.95;transition:transform .5s cubic-bezier(.2,.8,.2,1),opacity .5s ease`;
        document.body.appendChild(ring);
        requestAnimationFrame(() => {
          ring.style.transform = "scale(1.5)";
          ring.style.opacity = "0";
        });
        setTimeout(() => ring.remove(), 900);
      },
      [box.x + box.width / 2, box.y + box.height / 2],
    );
  }
  await settle(page, hold);
  await locator.click();
}

/**
 * A slow push toward whatever matters right now.
 *
 * Done in the browser, not in ffmpeg. A zoom applied to finished footage is
 * resampled from 1080p and jitters, because ffmpeg's zoompan moves in whole
 * pixels; a CSS transform is rendered by the same engine that drew the page, at
 * full resolution, and lands smooth and sharp. It also means the framing is
 * chosen while looking at a real element rather than guessed at in the edit.
 */
async function pushIn(page, locator, { to = 1.22, ms = 1100 } = {}) {
  const box = await locator.boundingBox();
  if (!box) return;
  await page.evaluate(
    ([x, y, scale, duration]) => {
      const root = document.documentElement;
      root.style.transformOrigin = `${x}px ${y}px`;
      root.style.transition = `transform ${duration}ms cubic-bezier(.4,0,.2,1)`;
      root.style.transform = `scale(${scale})`;
    },
    [box.x + box.width / 2, box.y + box.height / 2, to, ms],
  );
  await settle(page, ms + 120);
}

async function pullOut(page, { ms = 700 } = {}) {
  await page.evaluate((duration) => {
    const root = document.documentElement;
    root.style.transition = `transform ${duration}ms cubic-bezier(.4,0,.2,1)`;
    root.style.transform = "scale(1)";
  }, ms);
  await settle(page, ms + 80);
}

async function waitForApp(page) {
  await page.waitForFunction(() => !document.querySelector("[data-splash]"), { timeout: 15000 })
    .catch(() => {});
}

/** Scene 1: the roof. A thumb fills a report and sends it. */
async function sceneCrew(browser) {
  const context = await take(browser, { who: "crew", viewport: { width: 440, height: 950 }, name: "crew" });
  const page = await context.newPage();
  await page.goto(`${BASE}/sl/app/${PROJECT}`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await settle(page, 1000);

  // Quantities, tapped up the way a thumb does it: one press at a time, with
  // the ring showing where the thumb landed.
  const plus = page.locator(".b-step-btn").filter({ hasText: "+" });
  const count = await plus.count();
  for (let i = 0; i < Math.min(count, 2); i++) {
    for (let n = 0; n < 3; n++) {
      await tap(page, plus.nth(i), { hold: n === 0 ? 380 : 140 });
      await settle(page, 150);
    }
    await settle(page, 350);
  }

  // A photo, from the same fixture the seed uses for its site pictures.
  const file = page.locator('input[type="file"]').first();
  if (await file.count()) {
    await file.setInputFiles("public/icons/icon-512.png");
    await settle(page, 1600);
  }

  // The send: pushed into, tapped, then held on the result. This is the beat
  // the whole scene exists for, so it gets the camera move.
  const send = page.locator(".b-submit-bar .b-btn");
  await pushIn(page, send, { to: 1.3, ms: 1000 });
  await tap(page, send, { hold: 600 });
  await settle(page, 2200);
  await pullOut(page);
  await settle(page, 1600);

  await finish(context, "crew");
}

/**
 * Scene 4: the acceptance, signed by both sides.
 *
 * The most convincing seconds this product has, and the most expensive to film:
 * the pads only exist after a handover has been requested and a completion
 * report generated, so both of those happen off camera in their own contexts
 * and only the acceptance itself is recorded. The demo is left mid-acceptance
 * and `npm run seed` puts it back.
 */
async function sceneSign(browser) {
  const sub = await take(browser, { who: "sub", viewport: { width: 1600, height: 1000 }, name: ".sub-setup" });
  const subPage = await sub.newPage();
  await subPage.goto(`${BASE}/sl/app/${PROJECT}/final`, { waitUntil: "networkidle" });
  await waitForApp(subPage);
  const askOne = subPage.getByRole("button", { name: "Zaključi projekt" }).first();
  if (await askOne.count()) {
    await askOne.click();
    await subPage.getByRole("button", { name: "Zaključi projekt" }).last().click();
    await settle(subPage, 1500);
  }
  await discard(sub, ".sub-setup");

  const prep = await take(browser, { who: "epc", viewport: { width: 1600, height: 1000 }, name: ".epc-setup" });
  const prepPage = await prep.newPage();
  await prepPage.goto(`${BASE}/sl/app/${PROJECT}/final`, { waitUntil: "networkidle" });
  await waitForApp(prepPage);
  const make = prepPage.getByRole("button", { name: "Ustvari poročilo" });
  if (await make.count()) {
    await make.click();
    await prepPage.waitForSelector("text=Prenesi poročilo", { timeout: 90000 }).catch(() => {});
  }
  await discard(prep, ".epc-setup");

  // Now the camera.
  const context = await take(browser, { who: "epc", viewport: { width: 1600, height: 1000 }, name: "sign" });
  const page = await context.newPage();
  await page.goto(`${BASE}/sl/app/${PROJECT}/final`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await settle(page, 900);

  const start = page.getByRole("button", { name: "Začni prevzem" });
  if (!(await start.count())) {
    console.log("skip sign: acceptance is not available in this state");
    await finish(context, "sign");
    return;
  }
  await tap(page, start, { hold: 500 });
  await page.waitForSelector("canvas", { timeout: 20000 });
  await settle(page, 900);

  await page.getByPlaceholder(/Imena oseb/i).fill("Marko Golob, Boštjan Novak, Matej Kovač");
  await settle(page, 500);

  const canvas = page.locator("canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  await settle(page, 500);
  await pushIn(page, canvas, { to: 1.35, ms: 1100 });

  // Both signatures, drawn at a human speed rather than a machine one.
  for (let index = 0; index < 2; index++) {
    const pad = page.locator("canvas").nth(index);
    const box = await pad.boundingBox();
    if (!box) continue;
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.6);
    await page.mouse.down();
    for (let i = 1; i <= 26; i++) {
      const t = i / 26;
      await page.mouse.move(
        box.x + box.width * (0.15 + t * 0.7),
        box.y + box.height * (0.6 - Math.sin(t * Math.PI * (2 + index)) * 0.22),
      );
      await settle(page, 22);
    }
    await page.mouse.up();
    await settle(page, 700);
  }

  await settle(page, 1200);
  await pullOut(page);
  await settle(page, 900);
  await finish(context, "sign");
}

/** Scene 2: the office. The report that was just sent, on the dashboard. */
async function sceneDashboard(browser) {
  const context = await take(browser, { who: "epc", viewport: { width: 1600, height: 1000 }, name: "dashboard" });
  const page = await context.newPage();
  await page.goto(`${BASE}/sl/app/${PROJECT}`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await settle(page, 1400);

  // Into the progress ring first: it is the number the client actually opens
  // this page for, and it moved because of the report sent in the last scene.
  const ring = page.locator(".e-proj-ring, .e-bar").first();
  if (await ring.count()) {
    await pushIn(page, ring, { to: 1.28, ms: 1100 });
    await settle(page, 1500);
    await pullOut(page);
  }

  // A slow scroll down to the day feed, where the new report is.
  await page.evaluate(async () => {
    const target = document.querySelector(".e-daylog, .e-sec:nth-of-type(4)");
    const top = target ? target.getBoundingClientRect().top + window.scrollY - 90 : 700;
    const start = window.scrollY;
    const steps = 70;
    for (let i = 1; i <= steps; i++) {
      window.scrollTo(0, start + ((top - start) * i) / steps);
      await new Promise((r) => setTimeout(r, 26));
    }
  });
  await settle(page, 2600);
  await finish(context, "dashboard");
}

/** Scene 3: the money. The six day countdown on an open hour sheet. */
async function sceneHours(browser) {
  const context = await take(browser, { who: "epc", viewport: { width: 1600, height: 1000 }, name: "hours" });
  const page = await context.newPage();
  await page.goto(`${BASE}/sl/app/${PROJECT}/hours`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await settle(page, 4200);
  await finish(context, "hours");
}

/** A setup context: recorded (every context is) but its file is thrown away. */
async function discard(context, name) {
  await context.close();
  rmSync(`${OUT}/.raw-${name}`, { recursive: true, force: true });
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const response = await fetch(BASE).catch(() => null);
  if (!response) {
    console.error(`No server at ${BASE}. Start one first (npm run dev, or next start).`);
    process.exit(1);
  }

  const browser = await chromium.launch();
  await sceneCrew(browser);
  await sceneDashboard(browser);
  await sceneHours(browser);
  await sceneSign(browser);
  await browser.close();
  console.log(`\ntakes in ${OUT}`);
}

if (process.argv[1]?.endsWith("video-takes.mjs")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
