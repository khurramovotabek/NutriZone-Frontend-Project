import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const NO_SESSION = { success: false, error: { code: "NO_SESSION", message: "Please log in." } };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** GET -- the signed-in customer's "find this product for me" requests, newest first. */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json(NO_SESSION, { status: 401 });
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/product-requests`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body) {
      return NextResponse.json({ success: false, error: body?.error ?? { code: "UNKNOWN", message: "Could not load requests." } }, { status: res.status || 500 });
    }
    return NextResponse.json({ success: true, data: body.data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load requests." } }, { status: 500 });
  }
}

/** POST multipart -- product_name, brand, description, url, quantity, image (optional, ≤ 5 MB). */
export async function POST(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json(NO_SESSION, { status: 401 });
  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Invalid form." } }, { status: 422 });
  }
  const form = new FormData();
  for (const key of ["product_name", "brand", "description", "url", "quantity"]) {
    const value = incoming.get(key);
    if (typeof value === "string") form.set(key, value);
  }
  const image = incoming.get("image");
  if (image instanceof File && image.size > 0) {
    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ success: false, error: { code: "IMAGE_TOO_LARGE", message: "Image is larger than 5 MB." } }, { status: 422 });
    }
    form.set("image", image);
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/product-requests`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: form });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      return NextResponse.json({ success: false, error: body?.error ?? { code: "UNKNOWN", message: "Could not send the request." } }, { status: res.status || 500 });
    }
    return NextResponse.json({ success: true, data: body.data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not send the request." } }, { status: 500 });
  }
}
