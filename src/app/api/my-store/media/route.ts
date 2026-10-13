import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  const formData = await req.formData();
  const response = await fetch(`${API_BASE_URL}/api/v1/my-store/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  const body = await response.json();
  if (!response.ok) {
    return NextResponse.json({ success: false, error: { code: body?.error?.code ?? "UNKNOWN", message: body?.error?.message ?? "Could not add media." } }, { status: response.status });
  }
  return NextResponse.json({ success: true, data: body.data }, { status: 201 });
}
