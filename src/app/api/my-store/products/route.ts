import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

interface BackendErrorBody {
  error?: { code?: string; message?: string };
}

export async function POST(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  const rawBody = await req.json().catch(() => ({}));
  const forwardBody = { product_variant_id: rawBody.product_variant_id, quantity: rawBody.quantity };

  const response = await fetch(`${API_BASE_URL}/api/v1/my-store/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(forwardBody),
  });
  const body = await response.json();
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    return NextResponse.json({ success: false, error: { code: errBody.error?.code ?? "UNKNOWN", message: errBody.error?.message ?? "Could not add product." } }, { status: response.status });
  }
  return NextResponse.json({ success: true, data: body.data }, { status: 201 });
}
