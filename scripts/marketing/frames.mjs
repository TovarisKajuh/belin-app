import sharp from "sharp";

// Presentation for flat screenshots.
//
// A raw rectangle of UI reads as a bug report. A thin browser frame reads as a
// product. This is deliberately NOT perspective or device rendering: those are
// the founder's mockup tool, and it is better at them. What this produces is the
// flat, framed master that either goes straight onto a page or gets fed into
// that tool for an angled shot.
//
// Everything composes on transparency, so the same asset drops onto the dark
// landing ground, a white brochure page, or a video title card.

const CHROME_H = 34;
const RADIUS = 14;
const PAD = 44; // room for the shadow to fall

/** A slim dark browser frame with rounded corners and a soft shadow. */
export async function frameBrowser(pngBuffer, { label = "" } = {}) {
  const shot = sharp(pngBuffer);
  const { width, height } = await shot.metadata();

  const bodyH = height + CHROME_H;
  const dots = [0, 1, 2]
    .map((i) => `<circle cx="${20 + i * 16}" cy="${CHROME_H / 2}" r="4.5" fill="rgba(255,255,255,.22)"/>`)
    .join("");

  // The frame: one rounded rect with the title bar drawn on top of it.
  const frameSvg = Buffer.from(`
    <svg width="${width}" height="${bodyH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="r"><rect width="${width}" height="${bodyH}" rx="${RADIUS}" ry="${RADIUS}"/></clipPath>
      </defs>
      <g clip-path="url(#r)">
        <rect width="${width}" height="${bodyH}" fill="#0d1420"/>
        <rect width="${width}" height="${CHROME_H}" fill="#111a28"/>
        ${dots}
        ${label ? `<text x="${width / 2}" y="${CHROME_H / 2 + 4}" text-anchor="middle"
           font-family="Inter, Arial, sans-serif" font-size="12" fill="rgba(255,255,255,.34)">${label}</text>` : ""}
      </g>
      <rect x="0.5" y="0.5" width="${width - 1}" height="${bodyH - 1}" rx="${RADIUS}" ry="${RADIUS}"
            fill="none" stroke="rgba(255,255,255,.10)"/>
    </svg>`);

  const framed = await sharp({
    create: { width, height: bodyH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: frameSvg, top: 0, left: 0 },
      { input: pngBuffer, top: CHROME_H, left: 0 },
    ])
    .png()
    .toBuffer();

  return addShadow(framed, width, bodyH);
}

/** Rounded corners and a thin bezel, for a phone-shaped capture. */
export async function framePhone(pngBuffer, { radius = 42 } = {}) {
  const { width, height } = await sharp(pngBuffer).metadata();

  const mask = Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );
  const rounded = await sharp(pngBuffer)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const bezel = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
       <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${radius}" ry="${radius}"
             fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2"/>
     </svg>`,
  );
  const withBezel = await sharp(rounded)
    .composite([{ input: bezel, top: 0, left: 0 }])
    .png()
    .toBuffer();

  return addShadow(withBezel, width, height);
}

/**
 * A soft drop shadow on transparency.
 *
 * Built by blurring a black silhouette of the artwork's own alpha, so the
 * shadow follows the rounded corners instead of being a rectangle behind them.
 */
async function addShadow(buffer, width, height) {
  const alpha = await sharp(buffer).extractChannel("alpha").toBuffer();
  const silhouette = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .composite([{ input: alpha, blend: "dest-in" }])
    .blur(18)
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: width + PAD * 2,
      height: height + PAD * 2,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: silhouette, top: PAD + 12, left: PAD, opacity: 0.45 },
      { input: buffer, top: PAD, left: PAD },
    ])
    .png()
    .toBuffer();
}
