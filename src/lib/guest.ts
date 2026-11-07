import { randomUUID } from "crypto";
import { cookies } from "next/headers";

export const GUEST_COOKIE = "agentsphere_guest";
const GUEST_MAX_AGE_SECONDS = 365 * 24 * 3600;

/** Read the guest id of this browser, if it has one. */
export async function getGuestId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value || undefined;
}

/**
 * Return this browser's guest id, minting a cookie on first use.
 * Must run before the response starts streaming, otherwise the cookie cannot be set.
 */
export async function getOrCreateGuestId(): Promise<string> {
  const existing = await getGuestId();
  if (existing) return existing;

  const id = randomUUID();
  try {
    const store = await cookies();
    store.set(GUEST_COOKIE, id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: GUEST_MAX_AGE_SECONDS,
      path: "/",
    });
  } catch {
    // Cookie could not be written (e.g. response already started); the id is still usable for this request.
  }
  return id;
}
