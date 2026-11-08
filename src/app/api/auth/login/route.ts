import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { verifyPassword, signToken, COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const ipLimit = rateLimit(`login:ip:${ip}`, 30, LOGIN_WINDOW_MS);
  if (!ipLimit.ok)
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } },
    );

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON format in request" }, { status: 400 });
    }

    const { email, password } = body || {};

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Brute-force guard for a single account, independent of the IP-wide limit above.
    const accountLimit = rateLimit(
      `login:acct:${ip}:${email.toLowerCase().trim()}`,
      8,
      LOGIN_WINDOW_MS,
    );
    if (!accountLimit.ok)
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(accountLimit.retryAfter) } },
      );

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const sessionUser = { id: user.id, email: user.email, name: user.name };
    const token = signToken(sessionUser);

    const res = NextResponse.json({ user: sessionUser }, { status: 200 });
    res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());

    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
