import { NextRequest, NextResponse } from "next/server";
import { AuthApiError, requestTelegramCode } from "@/lib/auth-api";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phoneNumber = body?.phone_number;
  if (typeof phoneNumber !== "string" || !phoneNumber) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Phone number is required." } }, { status: 422 });
  }

  try {
    const result = await requestTelegramCode(phoneNumber);
    return NextResponse.json({ success: true, data: result }, { status: 202 });
  } catch (err) {
    if (err instanceof AuthApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Something went wrong. Please try again." } }, { status: 500 });
  }
}
