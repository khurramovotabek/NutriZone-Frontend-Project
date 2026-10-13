import { NextRequest, NextResponse } from "next/server";
import { ADDRESS_TYPES, GeoApiError, cleanAddressDetails, deleteAddress, updateAddress, type AddressTypeValue } from "@/lib/geo-api";
import { getAccessToken } from "@/lib/session";

function isAddressType(value: unknown): value is AddressTypeValue {
  return typeof value === "string" && (ADDRESS_TYPES as readonly string[]).includes(value);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ addressId: string }> }) {
  const { addressId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { line1, line2, postalCode, cityId, addressType, recipientName, recipientPhone, recipientTelegramUsername, districtId, metadata } = body ?? {};
  if (addressType !== undefined && !isAddressType(addressType)) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_FAILED", message: "Invalid address type." } }, { status: 422 });
  }

  try {
    const address = await updateAddress(accessToken, addressId, {
      ...(typeof line1 === "string" ? { line1 } : {}),
      ...(line2 !== undefined ? { line2 } : {}),
      ...(postalCode !== undefined ? { postalCode } : {}),
      ...(typeof cityId === "string" ? { cityId } : {}),
      ...(isAddressType(addressType) ? { addressType } : {}),
      ...(typeof recipientName === "string" ? { recipientName } : {}),
      ...(typeof recipientPhone === "string" ? { recipientPhone } : {}),
      ...(typeof recipientTelegramUsername === "string" ? { recipientTelegramUsername } : {}),
      ...(typeof districtId === "string" && districtId ? { districtId } : {}),
      ...(cleanAddressDetails(metadata) ? { metadata: cleanAddressDetails(metadata) } : {}),
    });
    return NextResponse.json({ success: true, data: address });
  } catch (err) {
    if (err instanceof GeoApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not update this address." } }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ addressId: string }> }) {
  const { addressId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { code: "NO_SESSION", message: "Please log in." } }, { status: 401 });
  }
  try {
    await deleteAddress(accessToken, addressId);
    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    if (err instanceof GeoApiError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: { code: "UNKNOWN", message: "Could not delete this address." } }, { status: 500 });
  }
}
