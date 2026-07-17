import sharp from "sharp";
import { mkdirSync } from "node:fs";

const NAVY = "#0a1628";

function svg({ size, radius, glyphScale }) {
  const fontSize = Math.round(size * glyphScale);
  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" fill="${NAVY}"/>
      <text x="50%" y="50%" dy=".36em" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="800"
        font-size="${fontSize}" fill="#ffffff">B</text>
    </svg>`
  );
}

mkdirSync("public/icons", { recursive: true });

const jobs = [
  { file: "icon-192.png", size: 192, radius: 36, glyphScale: 0.58 },
  { file: "icon-512.png", size: 512, radius: 96, glyphScale: 0.58 },
  // Maskable: full-bleed background, smaller glyph inside the safe zone.
  { file: "icon-maskable-512.png", size: 512, radius: 0, glyphScale: 0.42 },
  { file: "apple-touch-icon.png", size: 180, radius: 0, glyphScale: 0.58 },
];

for (const job of jobs) {
  await sharp(svg(job)).png().toFile(`public/icons/${job.file}`);
  console.log(`wrote public/icons/${job.file}`);
}
