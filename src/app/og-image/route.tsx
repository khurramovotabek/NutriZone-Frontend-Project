import { ImageResponse } from "next/og";
import { getBrand } from "@/lib/brand";

// The shared-link preview (Telegram, Facebook, WhatsApp, Google Discover) for pages without their own photo.
export const revalidate = 3600;

export async function GET() {
  const { name, primaryColor } = await getBrand();
  const accent = primaryColor || "#1d4ed8";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: `linear-gradient(135deg, #0b1220 0%, ${accent} 120%)`, color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, textTransform: "uppercase", opacity: 0.8 }}>nutrizone.uz</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 104, fontWeight: 800, lineHeight: 1 }}>{name}</div>
          <div style={{ display: "flex", fontSize: 46, marginTop: 28, fontWeight: 600 }}>Sport ozuqalari · Sports nutrition</div>
          <div style={{ display: "flex", fontSize: 34, marginTop: 14, opacity: 0.85 }}>Protein · Gainer · Creatine · BCAA · Vitamins</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, opacity: 0.85 }}>{"Toshkent · O‘zbekiston — original, delivery, NutriZone Coins"}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
