import { NextResponse } from "next/server";
import { AuthApiError, createTelegramAuthSession } from "@/lib/auth-api";

export async function POST() {
  try {
    const session = await createTelegramAuthSession();
    return NextResponse.json({ success: true, data: session });
  } catch (err) {
    if (err instanceof AuthApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Something went wrong. Please try again." } }, { status: 500 });
  }
}
