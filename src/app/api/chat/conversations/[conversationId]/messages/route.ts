import { NextRequest, NextResponse } from "next/server";
import { AccountApiError, getConversationMessages, sendAttachmentMessage, sendMessage } from "@/lib/account-api";
import { getAccessToken } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const pageSize = searchParams.get("page_size") ? Number(searchParams.get("page_size")) : undefined;
    const result = await getConversationMessages(accessToken, conversationId, { page, pageSize });
    return NextResponse.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    if (err instanceof AccountApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load messages." } }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    const rawBody = await req.json();
    if (rawBody?.message_type === "attachment") {
      const { attachment_type, attachment_url, attachment_filename, attachment_size_bytes } = rawBody;
      if (!attachment_type || !attachment_url) {
        return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Missing attachment." } }, { status: 422 });
      }
      const message = await sendAttachmentMessage(accessToken, conversationId, { attachment_type, attachment_url, attachment_filename, attachment_size_bytes });
      return NextResponse.json({ success: true, data: message });
    }

    const { content } = rawBody;
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Message cannot be empty." } }, { status: 422 });
    }
    const message = await sendMessage(accessToken, conversationId, content.trim(), rawBody?.message_type === "sticker" ? "sticker" : "text");
    return NextResponse.json({ success: true, data: message });
  } catch (err) {
    if (err instanceof AccountApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not send message." } }, { status: 500 });
  }
}
