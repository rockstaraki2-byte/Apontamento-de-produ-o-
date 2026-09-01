const path = require("path");
const { Jimp, loadFont, measureText } = require("jimp");

const ROOT = path.resolve(__dirname, "..");
const FONT_PATH = path.join(
  ROOT,
  "node_modules",
  "@jimp",
  "plugin-print",
  "fonts",
  "open-sans",
  "open-sans-128-white",
  "open-sans-128-white.fnt",
);

const NAVY = 0x1e1b4bff;
const INDIGO = 0x312e81ff;
const GREEN = 0x22c55eff;
const WHITE = 0xffffffff;

function fillCircle(image, centerX, centerY, radius, color) {
  const radiusSquared = radius * radius;
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy <= radiusSquared) {
        image.setPixelColor(color, x, y);
      }
    }
  }
}

function fillRoundedRect(image, x, y, width, height, radius, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      const nearestX = Math.max(x + radius, Math.min(px, x + width - radius - 1));
      const nearestY = Math.max(y + radius, Math.min(py, y + height - radius - 1));
      const dx = px - nearestX;
      const dy = py - nearestY;
      if (dx * dx + dy * dy <= radius * radius) {
        image.setPixelColor(color, px, py);
      }
    }
  }
}

async function createIcon() {
  const image = new Jimp({ width: 512, height: 512, color: NAVY });
  const font = await loadFont(FONT_PATH);

  fillRoundedRect(image, 34, 34, 444, 444, 92, INDIGO);
  fillCircle(image, 256, 224, 145, GREEN);

  const label = "AP";
  const textWidth = measureText(font, label);
  image.print({ font, x: Math.round((512 - textWidth) / 2), y: 142, text: label });

  fillRoundedRect(image, 139, 374, 234, 24, 12, WHITE);
  fillRoundedRect(image, 176, 414, 160, 18, 9, GREEN);

  return image;
}

async function main() {
  const icon512 = await createIcon();
  await icon512.write(path.join(ROOT, "public", "icon-512.png"));
  await icon512.clone().write(path.join(ROOT, "public", "icon.png"));
  await icon512.clone().resize({ w: 192, h: 192 }).write(path.join(ROOT, "public", "icon-192.png"));
  await icon512.clone().write(path.join(ROOT, "public", "icon-maskable-512.png"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
