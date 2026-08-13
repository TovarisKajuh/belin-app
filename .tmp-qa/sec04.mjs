import { chromium } from "playwright";
const base = process.env.BASE || "http://localhost:52110";
const b = await chromium.launch();
for (const [name, w, h] of [["s04-desk", 1440, 900], ["s04-phone", 390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(`${base}/sl`, { waitUntil: "networkidle" });
  await p.waitForFunction(() => !document.querySelector("[data-splash]"), { timeout: 9000 }).catch(() => {});
  await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  const papers = p.locator(".lp-papers");
  await papers.scrollIntoViewIfNeeded();
  await p.waitForTimeout(800);
  await p.screenshot({ path: `.tmp-qa/${name}.png` });
  console.log(name, await p.evaluate(() => {
    const c = document.querySelector(".lp-papers");
    const imgs = [...c.querySelectorAll("img")];
    return {
      scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
      box: Math.round(c.getBoundingClientRect().width),
      imgs: imgs.map((i) => `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`),
      loaded: imgs.map((i) => i.naturalWidth > 0),
    };
  }));
  await p.close();
}
await b.close();
