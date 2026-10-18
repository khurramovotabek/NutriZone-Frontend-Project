/**
 * Category artwork for the catalogue (Dashboard → Kategoriyalar images): one premium 768×768 tile per category —
 * the section's gradient, a soft light, a faint oversized watermark, a frosted disc with a white Lucide icon and,
 * where it helps, a language-neutral badge (D3, BCAA, Mg…). Output: JPEG files named by the category's English name,
 * applied with `python manage.py apply_category_art` in the backend.
 *
 *   node scripts/category-art.mjs <out-dir> [--preview]
 */
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Lucide from "lucide-react";
import sharp from "sharp";

const SIZE = 768;

// Section palettes [from, to]; a category inherits its section's.
const PALETTE = {
  "Sports Nutrition": ["#1d4ed8", "#7c3aed"], Vitamins: ["#059669", "#0d9488"], "Accessories & Extras": ["#ea580c", "#be123c"],
  Proteins: ["#2563eb", "#7c3aed"], Creatine: ["#0ea5e9", "#2563eb"], Gainers: ["#f97316", "#db2777"], "Amino Acids": ["#8b5cf6", "#ec4899"],
  Hydration: ["#06b6d4", "#3b82f6"], Performance: ["#ef4444", "#f97316"], "Pre-Workout": ["#f59e0b", "#ef4444"], Pump: ["#dc2626", "#9333ea"],
  Recovery: ["#14b8a6", "#6366f1"], "Fat Burners": ["#f97316", "#e11d48"],
  Multivitamins: ["#10b981", "#0d9488"], "Single Vitamins": ["#f59e0b", "#10b981"], Minerals: ["#475569", "#0f766e"], Omega: ["#0284c7", "#0d9488"],
  "Joint Support": ["#6366f1", "#0ea5e9"], "Sleep Support": ["#312e81", "#7c3aed"],
  Shakers: ["#1e3a8a", "#2563eb"], "Water Bottles": ["#0891b2", "#22d3ee"], "Gym Accessories": ["#334155", "#0f172a"], Sportswear: ["#1e293b", "#6366f1"],
  "Protein Snacks": ["#b45309", "#f59e0b"], "Healthy Food": ["#65a30d", "#ca8a04"], "Sports Bags": ["#475569", "#1e40af"], "Sports Electronics": ["#0f172a", "#10b981"],
};

// [English name, Lucide icon, badge or "", section (palette) or "" for a section itself]
const ART = [
  ["Sports Nutrition", "Dumbbell", ""], ["Vitamins", "Pill", ""], ["Accessories & Extras", "Gift", ""],
  ["Proteins", "Milk", ""], ["Whey Protein", "Milk", "WHEY", "Proteins"], ["Whey Isolate", "FlaskConical", "ISO", "Proteins"],
  ["Hydrolyzed Whey", "Atom", "HYDRO", "Proteins"], ["Casein", "Moon", "CASEIN", "Proteins"], ["Beef Protein", "Beef", "BEEF", "Proteins"],
  ["Vegan Protein", "Leaf", "VEGAN", "Proteins"],
  ["Creatine", "Zap", ""], ["Creatine Monohydrate", "Zap", "MONO", "Creatine"], ["Creatine HCL", "FlaskConical", "HCL", "Creatine"],
  ["Kre-Alkalyn", "Beaker", "KRE-ALK", "Creatine"],
  ["Gainers", "Weight", ""], ["Mass Gainer", "TrendingUp", "MASS", "Gainers"], ["Lean Gainer", "Activity", "LEAN", "Gainers"],
  ["Amino Acids", "Atom", ""], ["BCAA", "Hexagon", "BCAA", "Amino Acids"], ["EAA", "Hexagon", "EAA", "Amino Acids"], ["Amino Complex", "Layers", "AMINO", "Amino Acids"],
  ["Hydration", "Droplets", ""], ["Isotonic", "GlassWater", "ISO", "Hydration"], ["Electrolytes", "Droplet", "Na · K", "Hydration"],
  ["Performance", "Medal", ""], ["Arginine", "HeartPulse", "ARG", "Performance"], ["Citrulline", "Citrus", "CIT", "Performance"],
  ["Beta-Alanine", "Activity", "β-ALA", "Performance"],
  ["Pre-Workout", "Rocket", ""], ["Stim", "Zap", "STIM", "Pre-Workout"], ["Stim-Free", "Sparkles", "0 STIM", "Pre-Workout"], ["Hardcore", "Flame", "HARDCORE", "Pre-Workout"],
  ["Pump", "BicepsFlexed", ""], ["Pump Formula", "BicepsFlexed", "PUMP", "Pump"], ["Nitric Oxide", "Wind", "NO", "Pump"], ["Stim-Free Pump", "Waves", "0 STIM", "Pump"],
  ["Recovery", "RefreshCw", ""], ["HMB", "Shield", "HMB", "Recovery"], ["Glutamine", "ShieldPlus", "GLN", "Recovery"], ["Beef Amino", "Beef", "AMINO", "Recovery"],
  ["Carbohydrates", "Wheat", "CARBS", "Recovery"],
  ["Fat Burners", "Flame", ""], ["Thermogenics", "Thermometer", "THERMO", "Fat Burners"], ["L-Carnitine", "Flame", "L-CAR", "Fat Burners"],
  ["Multivitamins", "Sparkles", ""], ["Daily", "Sunrise", "DAILY", "Multivitamins"], ["Sport", "Trophy", "SPORT", "Multivitamins"], ["Men's", "Mars", "MEN", "Multivitamins"],
  ["Women's", "Venus", "WOMEN", "Multivitamins"],
  ["Single Vitamins", "Citrus", ""], ["Vitamin D3", "Sun", "D3", "Single Vitamins"], ["Vitamin C", "Citrus", "C", "Single Vitamins"],
  ["B-Complex", "BatteryCharging", "B", "Single Vitamins"], ["Vitamin E", "Leaf", "E", "Single Vitamins"], ["Vitamin K2", "Bone", "K2", "Single Vitamins"],
  ["Minerals", "Gem", ""], ["Magnesium", "Moon", "Mg", "Minerals"], ["Zinc", "Shield", "Zn", "Minerals"], ["Calcium", "Bone", "Ca", "Minerals"],
  ["Iron", "Magnet", "Fe", "Minerals"], ["Selenium", "Gem", "Se", "Minerals"],
  ["Omega", "Fish", ""], ["Omega-3", "Fish", "Ω-3", "Omega"], ["Fish Oil", "Droplet", "OIL", "Omega"], ["Krill Oil", "Shell", "KRILL", "Omega"],
  ["Joint Support", "Bone", ""], ["Collagen", "Sparkles", "COLLAGEN", "Joint Support"], ["Glucosamine", "Bone", "GLUCO", "Joint Support"],
  ["Chondroitin", "Footprints", "CHONDRO", "Joint Support"],
  ["Sleep Support", "Moon", ""], ["Melatonin", "Moon", "MLT", "Sleep Support"], ["Sleep Complex", "BedDouble", "SLEEP", "Sleep Support"],
  ["Shakers", "CupSoda", ""], ["Classic", "CupSoda", "CLASSIC", "Shakers"], ["Blender", "Blend", "BLENDER", "Shakers"], ["Smart Shaker", "CupSoda", "SMART", "Shakers"],
  ["Water Bottles", "GlassWater", ""], ["Bottles", "Droplet", "BOTTLE", "Water Bottles"], ["Gallon Jugs", "Waves", "GALLON", "Water Bottles"],
  ["Gym Accessories", "Dumbbell", ""], ["Gloves", "Hand", "GLOVES", "Gym Accessories"], ["Straps", "Anchor", "STRAPS", "Gym Accessories"],
  ["Belts", "Shield", "BELT", "Gym Accessories"], ["Wrist Wraps", "Ribbon", "WRAPS", "Gym Accessories"],
  ["Sportswear", "Shirt", ""], ["T-Shirts", "Shirt", "T-SHIRT", "Sportswear"], ["Shorts", "Shirt", "SHORTS", "Sportswear"], ["Hoodies", "Shirt", "HOODIE", "Sportswear"],
  ["Socks", "Footprints", "SOCKS", "Sportswear"],
  ["Protein Snacks", "Cookie", ""], ["Protein Bars", "Candy", "BAR", "Protein Snacks"], ["Protein Cookies", "Cookie", "COOKIE", "Protein Snacks"],
  ["Protein Chips", "Popcorn", "CHIPS", "Protein Snacks"],
  ["Healthy Food", "Apple", ""], ["Peanut Butter", "Nut", "PEANUT", "Healthy Food"], ["Protein Pancakes", "Egg", "PANCAKE", "Healthy Food"],
  ["Sugar-Free Sauces", "Soup", "0 SUGAR", "Healthy Food"],
  ["Sports Bags", "Briefcase", ""], ["Gym Bags", "Briefcase", "GYM BAG", "Sports Bags"], ["Backpacks", "Backpack", "BACKPACK", "Sports Bags"],
  ["Sports Electronics", "Watch", ""], ["Fitness Trackers", "Watch", "TRACKER", "Sports Electronics"], ["Smart Scales", "Scale", "SCALE", "Sports Electronics"],
];

function iconInner(name, stroke) {
  const Icon = Lucide[name];
  if (!Icon) throw new Error(`Unknown Lucide icon: ${name}`);
  const svg = renderToStaticMarkup(createElement(Icon, { size: 24, strokeWidth: stroke, color: "#ffffff" }));
  return svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function tileSvg([name, icon, badge, section]) {
  const [from, to] = PALETTE[section || name] || ["#334155", "#0f172a"];
  const id = name.replace(/[^a-z0-9]/gi, "");
  const glyph = iconInner(icon, 1.75);
  const mark = iconInner(icon, 1.1);
  const disc = 300;
  const cy = badge ? 340 : 384;
  const iconSize = 196;
  const badgeW = Math.max(150, badge.length * 34 + 72);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
    <radialGradient id="light${id}" cx="0.22" cy="0.12" r="0.75"><stop offset="0" stop-color="#ffffff" stop-opacity="0.34"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <radialGradient id="shade${id}" cx="0.85" cy="1" r="0.8"><stop offset="0" stop-color="#000000" stop-opacity="0.32"/><stop offset="1" stop-color="#000000" stop-opacity="0"/></radialGradient>
    <linearGradient id="disc${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.30"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.10"/></linearGradient>
    <filter id="soft${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000" flood-opacity="0.28"/></filter>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg${id})"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#light${id})"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#shade${id})"/>
  <g opacity="0.13" transform="translate(455 425) rotate(-14) scale(17)" fill="none" stroke="#fff">${mark}</g>
  <g opacity="0.07" fill="none" stroke="#fff" stroke-width="2">
    <circle cx="${SIZE / 2}" cy="${cy}" r="${disc / 2 + 70}"/><circle cx="${SIZE / 2}" cy="${cy}" r="${disc / 2 + 140}"/>
  </g>
  <circle cx="${SIZE / 2}" cy="${cy}" r="${disc / 2}" fill="url(#disc${id})" stroke="#ffffff" stroke-opacity="0.42" stroke-width="2.5" filter="url(#soft${id})"/>
  <g transform="translate(${SIZE / 2 - iconSize / 2} ${cy - iconSize / 2}) scale(${iconSize / 24})" fill="none" stroke="#fff">${glyph}</g>
  ${badge ? `<g filter="url(#soft${id})">
    <rect x="${SIZE / 2 - badgeW / 2}" y="560" width="${badgeW}" height="86" rx="43" fill="#ffffff" fill-opacity="0.96"/>
    <text x="${SIZE / 2}" y="617" text-anchor="middle" font-family="Ubuntu Sans, Ubuntu, DejaVu Sans, sans-serif" font-weight="800" font-size="44" letter-spacing="2" fill="${to}">${esc(badge)}</text>
  </g>` : ""}
</svg>`;
}

export function fileName(name) {
  return `${name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.jpg`;
}

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error("usage: node scripts/category-art.mjs <out-dir> [--preview]");
  fs.mkdirSync(out, { recursive: true });
  const manifest = {};
  for (const row of ART) {
    const file = fileName(row[0]);
    await sharp(Buffer.from(tileSvg(row))).jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" }).toFile(path.join(out, file));
    manifest[row[0]] = file;
  }
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  if (process.argv.includes("--preview")) {
    const cards = ART.map(([n, , , s]) => `<figure><img src="${fileName(n)}" alt=""><figcaption>${esc(n)}<small>${esc(s || "bo'lim")}</small></figcaption></figure>`).join("");
    fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><meta charset="utf-8"><title>NutriZone category art</title><style>body{margin:0;padding:24px;background:#0b1220;font:13px system-ui;color:#e2e8f0}h1{font-size:18px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px}figure{margin:0}img{width:100%;border-radius:18px;display:block;box-shadow:0 10px 30px -12px #000}figcaption{margin-top:6px;font-weight:600}small{display:block;color:#94a3b8;font-weight:400}</style><h1>NutriZone — kategoriya rasmlari (${ART.length})</h1><main>${cards}</main>`);
  }
  console.log(`${ART.length} tiles → ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
