import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/my-store/media/${mediaId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status !== 204) {
    const body = await response.json().catch(() => ({}));
    return NextResponse.json({ success: false, error: { code: body?.error?.code ?? "UNKNOWN", message: body?.error?.message ?? "Could not remove media." } }, { status: response.status });
  }
  return new NextResponse(null, { status: 204 });
}
