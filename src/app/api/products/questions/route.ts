import { NextRequest, NextResponse } from "next/server";
import { backendWrite, getProductQuestions } from "@/lib/pdp-api";
import { getAccessToken } from "@/lib/session";

const SLUG = /^[\p{L}\p{N}\-_.~%]{1,220}$/u;

/** GET ?slug= -- the product's answered questions (+ the shopper's own pending ones). */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  if (!SLUG.test(slug)) return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "slug is required." } }, { status: 422 });
  const data = await getProductQuestions(slug, await getAccessToken());
  return NextResponse.json({ success: true, data });
}

/** POST {slug, question} -- a signed-in shopper asks the store. */
export async function POST(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in to ask a question." } }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!SLUG.test(slug) || question.length < 8 || question.length > 600) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "A question of 8–600 characters is required." } }, { status: 422 });
  }
  try {
    const { status, body: out } = await backendWrite(`/api/v1/products/${encodeURIComponent(slug)}/questions`, "POST", accessToken, { question });
    return NextResponse.json(out, { status });
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not reach the server." } }, { status: 502 });
  }
}
