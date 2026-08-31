import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { LOCALE } from "./locale.mjs";

// Walks the closing chain so the documents exist to photograph.
//
// Handover, completion report, acceptance with a defect and two signatures,
// invoice. This is the sequence the founder was clicking through by hand, and
// the reason it is worth automating twice over: it produces the assets AND it
// is a full end-to-end test of the most legally loaded path in the product.
//
// It leaves the demo dirty on purpose. `npm run marketing:all` re-seeds after
// the pictures are taken, which is also what proves the reset actually resets.

const BASE = "http://localhost:3000";
const PROJECT = "33333333-3333-4333-8333-333333333333";

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

async function signIn(browser, email) {
  const raw = randomBytes(32).toString("base64url");
  const { data: person } = await db.from("people").select("id").ilike("email", email).maybeSingle();
  await db.from("login_tokens").insert({
    person_id: person.id,
    token_hash: createHash("sha256").update(raw, "utf8").digest("hex"),
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
  });

  const context = await browser.newContext({ viewport: { width: 1500, height: 1000 }, locale: "sl-SI" });
  await context.addCookies([{ name: "belin-shot", value: "1", url: BASE }]);
  const page = await context.newPage();
  await page.goto(`${BASE}/sl/auth/verify/${raw}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button").first().click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/verify"), { timeout: 15000 });
  return { context, page };
}

/** Draws a signature the way a finger does: a stroke of pointer events. */
async function sign(page, index) {
  const canvas = page.locator("canvas").nth(index);
  // Into view FIRST. boundingBox is viewport relative, and the signature pads
  // sit near the bottom of a long form: the first run drew both strokes into
  // empty space below the fold and stored two blank signatures.
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.6);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    await page.mouse.move(
      box.x + box.width * (0.15 + t * 0.7),
      box.y + box.height * (0.6 - Math.sin(t * Math.PI * (2 + index)) * 0.22),
    );
  }
  await page.mouse.up();
}

async function main() {
  const browser = await chromium.launch();

  // 1. The contractor declares the roof finished.
  const sub = await signIn(browser, "bostjan@avesol-demo.si");
  await sub.page.goto(`${BASE}/sl/app/${PROJECT}/final`, { waitUntil: "networkidle" });
  await sub.page.getByRole("button", { name: "Zaključi projekt" }).first().click();
  await sub.page.getByRole("button", { name: "Zaključi projekt" }).last().click();
  await sub.page.waitForTimeout(1500);
  console.log("handover requested");

  // 2. The client pulls the completion report.
  const epc = await signIn(browser, "marko@sonce-demo.si");
  await epc.page.goto(`${BASE}/sl/app/${PROJECT}/final`, { waitUntil: "networkidle" });
  await epc.page.getByRole("button", { name: "Ustvari poročilo" }).click();
  await epc.page.waitForSelector("text=Prenesi poročilo", { timeout: 60000 });
  console.log("completion report generated");

  // 3. The acceptance walk, with one defect and both signatures.
  await epc.page.getByRole("button", { name: "Začni prevzem" }).click();
  await epc.page.waitForSelector("canvas", { timeout: 15000 });

  // Targeted by placeholder, the way a person reads the form. These inputs
  // carry no type attribute, so input[type=text] matches none of them, which
  // cost this script its first run.
  // The UI stays Slovenian for the whole drive, because these selectors are
  // written against it, but the TYPED text lands in the generated document and
  // the document renders in the project's language. So the defect text follows
  // the marketing locale, not the interface.
  const PRESENT = {
    sl: "Marko Golob, Boštjan Novak, Matej Kovač",
    de: "Michael Berger, Boštjan Novak, Matthias Kern",
  };
  const DEFECT = {
    sl: "Manjka tesnilo na prehodu kabla skozi kritino na strehi 2.",
    de: "Dichtung an der Kabeldurchführung durch die Dacheindeckung auf Dach 2 fehlt.",
  };
  await epc.page.getByPlaceholder(/Imena oseb/i).fill(PRESENT[LOCALE] ?? PRESENT.sl);
  await epc.page
    .getByPlaceholder(/Opis pomanjkljivosti/i)
    .fill(DEFECT[LOCALE] ?? DEFECT.sl);
  const dates = epc.page.locator("input[type=date]");
  await dates.nth(0).fill("2026-08-27");
  await epc.page.getByRole("button", { name: "Dodaj pomanjkljivost" }).click();
  await epc.page.waitForTimeout(1200);

  await epc.page.getByRole("button", { name: "Prevzeto s pridržki" }).click();
  await epc.page.waitForTimeout(800);
  await epc.page.locator("input[type=date]").last().fill("2026-08-13");
  await epc.page.locator("input[type=checkbox]").first().check();
  await epc.page.waitForTimeout(800);

  await sign(epc.page, 0);
  await sign(epc.page, 1);
  await epc.page.waitForTimeout(1500);

  // Refuse to submit a blank signature: the protocol is the legal artefact and
  // an unsigned one that says it is signed would be worse than a failed run.
  const inked = await epc.page.evaluate(() =>
    [...document.querySelectorAll("canvas")].map((c) => {
      const data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let on = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) on++;
      return on;
    }),
  );
  if (inked.some((pixels) => pixels < 200)) {
    throw new Error(`signature pads did not take ink: ${JSON.stringify(inked)}`);
  }

  await epc.page.getByRole("button", { name: "Podpiši in zaključi prevzem" }).click();
  await epc.page.waitForSelector("text=Prenesi zapisnik", { timeout: 60000 });
  console.log("acceptance signed");

  // 4. The contractor bills.
  await sub.page.goto(`${BASE}/sl/app/${PROJECT}/final`, { waitUntil: "networkidle" });
  await sub.page.getByRole("button", { name: "Ustvari račun" }).click();
  await sub.page.waitForSelector("text=Prenesi račun", { timeout: 60000 });
  console.log("invoice issued");

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
