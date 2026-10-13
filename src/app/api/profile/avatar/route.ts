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

  const formData = await req.formData();
  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "An avatar file is required." } }, { status: 422 });
  }

  const backendForm = new FormData();
  backendForm.set("avatar", file);

  const response = await fetch(`${API_BASE_URL}/api/v1/identity/users/me/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: backendForm,
  });
  const body = await response.json();
  if (!response.ok) {
    const errBody = body as BackendErrorBody;
    return NextResponse.json({ success: false, error: { code: errBody.error?.code ?? "UNKNOWN", message: errBody.error?.message ?? "Could not upload avatar." } }, { status: response.status });
  }
  return NextResponse.json({ success: true, data: body.data }, { status: 201 });
}
