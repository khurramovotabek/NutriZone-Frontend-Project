import { NextRequest, NextResponse } from "next/server";
import { AccountApiError, getMyConversations, openConversation } from "@/lib/account-api";
import { getAccessToken } from "@/lib/session";

export async function GET(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const pageSize = searchParams.get("page_size") ? Number(searchParams.get("page_size")) : undefined;
    const result = await getMyConversations(accessToken, { status, page, pageSize });
    return NextResponse.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    if (err instanceof AccountApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load your conversations." } }, { status: 500 });
  }
}

export async function POST() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    const conversation = await openConversation(accessToken);
    return NextResponse.json({ success: true, data: conversation });
  } catch (err) {
    if (err instanceof AccountApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not start a new conversation." } }, { status: 500 });
  }
}
