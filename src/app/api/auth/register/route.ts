import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { hashPassword, signToken, COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON format in request" }, { status: 400 });
    }

    const { name, email, password } = body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 },
      );
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    if (name.trim().length > 80) {
      return NextResponse.json({ error: "Name must be 80 characters or fewer" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
      },
    });

    const sessionUser = { id: user.id, email: user.email, name: user.name };
    const token = signToken(sessionUser);

    const res = NextResponse.json({ user: sessionUser }, { status: 201 });
    res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());

    return res;
  } catch (error) {
    // Two concurrent sign-ups with the same email: the unique constraint wins the race.
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
