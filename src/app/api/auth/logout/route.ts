import { NextResponse } from "next/server";
import { COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ success: true }, { status: 200 });
  // Same attributes as when the cookie was set, so browsers reliably overwrite it.
  res.cookies.set(COOKIE_NAME, "", { ...sessionCookieOptions(0), expires: new Date(0) });
  return res;
}
