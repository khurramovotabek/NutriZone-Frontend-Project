/**
 * Flavour artwork (Dashboard → Ta'mlar images): one premium 768×768 tile per flavour in the catalogue's
 * reference list — the flavour's own colour as a gradient, soft light, a faint oversized watermark, a frosted
 * disc with a white Lucide icon of the flavour family and the flavour's name (as printed on the tub) on a pill.
 * Output: JPEG files named by slug + manifest.json, applied with `python manage.py apply_flavour_art` in the backend.
 * A photo dropped into <out-dir>/photos/<slug>.jpg is used instead of the generated tile.
 *
 *   node scripts/flavour-art.mjs <out-dir> [--preview]
 */
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Lucide from "lucide-react";
import sharp from "sharp";

const SIZE = 768;

// [slug, name on the tub, base colour, Lucide icon]
const FLAVOURS = [
  ["chocolate", "Chocolate", "#5d3a1a", "Candy"],
  ["double-rich-chocolate", "Double Rich Chocolate", "#3f2210", "Candy"],
  ["gourmet-chocolate", "Gourmet Chocolate", "#4a2c17", "Dessert"],
  ["extreme-milk-chocolate", "Extreme Milk Chocolate", "#7b4a26", "Milk"],
  ["milk-chocolate", "Milk Chocolate", "#8b5a2b", "Milk"],
  ["white-chocolate", "White Chocolate", "#d9c39a", "Candy"],
  ["chocolate-peanut-butter", "Chocolate Peanut Butter", "#7a4a23", "Nut"],
  ["chocolate-mint", "Chocolate Mint", "#3e7b5b", "Leaf"],
  ["chocolate-hazelnut", "Chocolate Hazelnut", "#6b4423", "Nut"],
  ["chocolate-malt", "Chocolate Malt", "#6a4328", "Wheat"],
  ["chocolate-caramel", "Chocolate Caramel", "#8a5222", "Candy"],
  ["chocolate-coconut", "Chocolate Coconut", "#5c3b24", "Dessert"],
  ["chocolate-brownie", "Chocolate Brownie", "#3d2314", "CakeSlice"],
  ["rocky-road", "Rocky Road", "#5a3a2a", "IceCreamBowl"],
  ["cookies-and-cream", "Cookies & Cream", "#3b3b46", "Cookie"],
  ["cookie-dough", "Cookie Dough", "#b8905c", "Cookie"],
  ["vanilla", "Vanilla", "#d9b96a", "IceCreamCone"],
  ["french-vanilla", "French Vanilla", "#cfae6a", "IceCreamCone"],
  ["vanilla-ice-cream", "Vanilla Ice Cream", "#d8bf7e", "IceCreamCone"],
  ["cake-batter", "Cake Batter", "#d9a96a", "Cake"],
  ["birthday-cake", "Birthday Cake", "#e889ad", "Cake"],
  ["cinnamon-roll", "Cinnamon Roll", "#b97a45", "Croissant"],
  ["strawberry", "Strawberry", "#e8434f", "Cherry"],
  ["delicious-strawberry", "Delicious Strawberry", "#e23a54", "Cherry"],
  ["strawberry-cream", "Strawberry Cream", "#e86a80", "IceCreamBowl"],
  ["strawberry-banana", "Strawberry Banana", "#ef7a5b", "Banana"],
  ["kiwi-strawberry", "Kiwi Strawberry", "#d94f5c", "Cherry"],
  ["banana", "Banana", "#e3b52f", "Banana"],
  ["banana-cream", "Banana Cream", "#e0bd4f", "Banana"],
  ["salted-caramel", "Salted Caramel", "#c68642", "Candy"],
  ["caramel", "Caramel", "#c9822b", "Candy"],
  ["coconut", "Coconut", "#8f7a5c", "Dessert"],
  ["coconut-cream", "Coconut Cream", "#9c8a6d", "Dessert"],
  ["cappuccino", "Cappuccino", "#8b6a4f", "Coffee"],
  ["coffee", "Coffee", "#6f4e37", "Bean"],
  ["mocha", "Mocha", "#4b3621", "Coffee"],
  ["mocha-cappuccino", "Mocha Cappuccino", "#6b4a35", "Coffee"],
  ["caffe-latte", "Caffè Latte", "#a47551", "Coffee"],
  ["blueberry", "Blueberry", "#4f5d9a", "Grape"],
  ["raspberry", "Raspberry", "#c2185b", "Cherry"],
  ["blue-raspberry", "Blue Raspberry", "#2e86de", "Cherry"],
  ["icy-blue-razz", "Icy Blue Razz", "#2b9be0", "Snowflake"],
  ["cherry", "Cherry", "#a4161a", "Cherry"],
  ["mixed-berry", "Mixed Berry", "#8e3b6e", "Grape"],
  ["pomegranate", "Pomegranate", "#b3203b", "Apple"],
  ["mango", "Mango", "#f09a2c", "Citrus"],
  ["pineapple", "Pineapple", "#e0b52c", "Citrus"],
  ["passion-fruit", "Passion Fruit", "#e2733a", "Citrus"],
  ["orange", "Orange", "#f28c28", "Citrus"],
  ["lemon", "Lemon", "#e0c12c", "Citrus"],
  ["lemon-lime", "Lemon Lime", "#9cbf35", "Citrus"],
  ["lime", "Lime", "#7cb342", "Citrus"],
  ["watermelon", "Watermelon", "#f25f5c", "Popsicle"],
  ["green-apple", "Green Apple", "#7cb83a", "Apple"],
  ["grape", "Grape", "#6f2da8", "Grape"],
  ["peach", "Peach", "#f39a63", "Apple"],
  ["fruit-punch", "Fruit Punch", "#e63946", "CupSoda"],
  ["tropical", "Tropical", "#ff9f1c", "Citrus"],
  ["pink-lemonade", "Pink Lemonade", "#ec7a96", "CupSoda"],
  ["lemon-iced-tea", "Lemon Iced Tea", "#c9951a", "CupSoda"],
  ["cola", "Cola", "#3b1f0e", "CupSoda"],
  ["tutti-frutti", "Tutti Frutti", "#e85d8f", "Lollipop"],
  ["cotton-candy", "Cotton Candy", "#e98fb5", "Lollipop"],
  ["sour-gummy", "Sour Gummy", "#86bd3a", "Candy"],
  ["rainbow-candy", "Rainbow Candy", "#b55ee0", "Lollipop"],
  ["pistachio", "Pistachio", "#7fae5c", "Nut"],
  ["peanut-butter", "Peanut Butter", "#c68e3f", "Nut"],
  ["hazelnut", "Hazelnut", "#a0522d", "Nut"],
  ["unflavoured", "Unflavoured", "#64748b", "Droplet"],
];

function shade(hex, amount) {
  // amount < 0 darkens, > 0 lightens (mix with black / white)
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount));
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function iconInner(name, stroke) {
  const Icon = Lucide[name];
  if (!Icon) throw new Error(`Unknown Lucide icon: ${name}`);
  const svg = renderToStaticMarkup(createElement(Icon, { size: 24, strokeWidth: stroke, color: "#ffffff" }));
  return svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function tileSvg([slug, name, color, icon]) {
  const from = shade(color, 0.12);
  const to = shade(color, -0.55);
  const id = slug.replace(/[^a-z0-9]/gi, "");
  const glyph = iconInner(icon, 1.75);
  const mark = iconInner(icon, 1.1);
  const disc = 380;
  const cy = 330;
  const iconSize = 230;
  const fontSize = name.length > 20 ? 34 : name.length > 14 ? 40 : 46;
  const pillW = Math.min(SIZE - 72, Math.max(240, name.length * fontSize * 0.6 + 90));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
    <radialGradient id="light${id}" cx="0.22" cy="0.12" r="0.75"><stop offset="0" stop-color="#ffffff" stop-opacity="0.38"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <radialGradient id="shade${id}" cx="0.85" cy="1" r="0.8"><stop offset="0" stop-color="#000000" stop-opacity="0.30"/><stop offset="1" stop-color="#000000" stop-opacity="0"/></radialGradient>
    <linearGradient id="disc${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.32"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.10"/></linearGradient>
    <filter id="soft${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000" flood-opacity="0.28"/></filter>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg${id})"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#light${id})"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#shade${id})"/>
  <g opacity="0.13" transform="translate(455 405) rotate(-14) scale(17)" fill="none" stroke="#fff">${mark}</g>
  <g opacity="0.08" fill="none" stroke="#fff" stroke-width="2">
    <circle cx="${SIZE / 2}" cy="${cy}" r="${disc / 2 + 46}"/><circle cx="${SIZE / 2}" cy="${cy}" r="${disc / 2 + 100}"/>
  </g>
  <circle cx="${SIZE / 2}" cy="${cy}" r="${disc / 2}" fill="url(#disc${id})" stroke="#ffffff" stroke-opacity="0.42" stroke-width="2.5" filter="url(#soft${id})"/>
  <g transform="translate(${SIZE / 2 - iconSize / 2} ${cy - iconSize / 2}) scale(${iconSize / 24})" fill="none" stroke="#fff">${glyph}</g>
  <g filter="url(#soft${id})">
    <rect x="${SIZE / 2 - pillW / 2}" y="590" width="${pillW}" height="96" rx="48" fill="#ffffff" fill-opacity="0.96"/>
    <text x="${SIZE / 2}" y="${638 + fontSize * 0.35}" text-anchor="middle" font-family="Ubuntu Sans, Ubuntu, DejaVu Sans, sans-serif" font-weight="800" font-size="${fontSize}" letter-spacing="0.5" fill="${to}">${esc(name)}</text>
  </g>
</svg>`;
}

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error("usage: node scripts/flavour-art.mjs <out-dir> [--preview]");
  fs.mkdirSync(out, { recursive: true });
  const manifest = {};
  for (const row of FLAVOURS) {
    const [slug] = row;
    const photo = path.join(out, "photos", `${slug}.jpg`);
    const file = `${slug}.jpg`;
    const input = fs.existsSync(photo)
      ? sharp(photo).resize(SIZE, SIZE, { fit: "cover", position: "attention" })
      : sharp(Buffer.from(tileSvg(row)));
    await input.jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: "4:4:4" }).toFile(path.join(out, file));
    manifest[slug] = file;
  }
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  if (process.argv.includes("--preview")) {
    const cards = FLAVOURS.map(([s, n]) => `<figure><img src="${s}.jpg" alt=""><figcaption>${esc(n)}</figcaption></figure>`).join("");
    fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta charset="utf-8"><title>NutriZone flavour art</title><style>body{margin:0;padding:24px;background:#0b1220;font:13px system-ui;color:#e2e8f0}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:14px}figure{margin:0}img{width:100%;border-radius:16px;display:block}figcaption{margin-top:6px;font-weight:600}</style><h1>NutriZone — ta'm rasmlari (${FLAVOURS.length})</h1><main>${cards}</main>`);
  }
  console.log(`${FLAVOURS.length} tiles → ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
