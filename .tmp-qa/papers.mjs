import sharp from "sharp";
const BG = { r: 12, g: 24, b: 38 };
// side by side, as they will appear, on the page ground
const names = ["doc-report", "doc-abnahme", "doc-invoice"];
const W = 380;
const parts = [];
for (const n of names) {
  const b = await sharp(`assets/marketing/mockups/${n}.png`).resize({ width: W }).toBuffer();
  parts.push({ b, m: await sharp(b).metadata() });
}
const H = Math.max(...parts.map((p) => p.m.height));
const canvas = sharp({ create: { width: W * 3 - 60, height: H + 40, channels: 4, background: { ...BG, alpha: 1 } } });
await canvas.composite(parts.map((p, i) => ({ input: p.b, left: i * (W - 30), top: H - p.m.height + 20 }))).png().toFile(".tmp-qa/papers-row.png");
console.log("row", W * 3 - 60, "x", H + 40);
