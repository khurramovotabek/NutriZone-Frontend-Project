import { NextRequest, NextResponse } from "next/server";
import { ADDRESS_TYPES, GeoApiError, cleanAddressDetails, createAddress, listAddresses, type AddressTypeValue } from "@/lib/geo-api";
import { getAccessToken } from "@/lib/session";

function isAddressType(value: unknown): value is AddressTypeValue {
  return typeof value === "string" && (ADDRESS_TYPES as readonly string[]).includes(value);
}

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    const addresses = await listAddresses(accessToken);
    return NextResponse.json({ success: true, data: addresses });
  } catch (err) {
    if (err instanceof GeoApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not load your addresses." } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { addressType, countryId, cityId, line1, recipientName, recipientPhone, recipientTelegramUsername, districtId, metadata } = body ?? {};
  if (typeof countryId !== "string" || typeof cityId !== "string" || typeof line1 !== "string" || !line1.trim()) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "City and address line are required." } }, { status: 422 });
  }
  if (typeof recipientName !== "string" || !recipientName.trim() || typeof recipientPhone !== "string" || !recipientPhone.trim()) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Recipient name and phone are required." } }, { status: 422 });
  }
  if (addressType !== undefined && !isAddressType(addressType)) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Invalid address type." } }, { status: 422 });
  }

  try {
    const address = await createAddress(accessToken, {
      countryId, cityId, line1, recipientName, recipientPhone,
      ...(isAddressType(addressType) ? { addressType } : {}),
      ...(typeof recipientTelegramUsername === "string" && recipientTelegramUsername.trim() ? { recipientTelegramUsername } : {}),
      ...(typeof districtId === "string" && districtId ? { districtId } : {}),
      ...(cleanAddressDetails(metadata) ? { metadata: cleanAddressDetails(metadata) } : {}),
    });
    return NextResponse.json({ success: true, data: address }, { status: 201 });
  } catch (err) {
    if (err instanceof GeoApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not save this address." } }, { status: 500 });
  }
}
