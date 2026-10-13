import { NextRequest, NextResponse } from "next/server";
import { backendGeo } from "@/lib/geo-locate";

/** POST /api/geo/parse-link {text} → {latitude, longitude} from a map link or "lat, lng". */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 2000) : "";
  if (!text) return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Paste a map link." } }, { status: 422 });
  try {
    return await backendGeo("parse-link", { method: "POST", body: JSON.stringify({ text }) });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNAVAILABLE", message: "Link reader is unavailable." } }, { status: 503 });
  }
}
