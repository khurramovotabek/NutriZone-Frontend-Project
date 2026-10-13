/**
 * The backend has no first_name/last_name split anywhere (confirmed:
 * UserProfile.full_name and Address.recipient_name are both single
 * combined strings) -- the spec's own First Name / Last Name fields
 * are a UI-only convenience over that one real field. Splitting is
 * used ONLY to pre-fill two editable inputs from an existing name (the
 * user can freely correct it before submit); the authoritative value
 * saved is always the two fields re-joined with `joinName`, never a
 * parsed/reconstructed guess treated as truth.
 */
export function splitFullName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const [first, ...rest] = trimmed.split(/\s+/);
  return { firstName: first, lastName: rest.join(" ") };
}

export function joinName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}
