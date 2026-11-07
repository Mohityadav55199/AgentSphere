import { NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";
import {
  getCurrentUser,
  hashPassword,
  verifyPassword,
  signToken,
  COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const userSession = await getCurrentUser();
  if (!userSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userSession.id },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const userSession = await getCurrentUser();
  if (!userSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, currentPassword, newPassword } = body || {};

    const dbUser = await prisma.user.findUnique({ where: { id: userSession.id } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: { name?: string; password?: string } = {};

    if (typeof name === "string" && name.trim().length > 0) {
      if (name.trim().length > 80) {
        return NextResponse.json({ error: "Name must be 80 characters or fewer" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (newPassword !== undefined && typeof newPassword !== "string") {
      return NextResponse.json({ error: "New password must be a string" }, { status: 400 });
    }

    if (newPassword) {
      if (typeof currentPassword !== "string" || !currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to change password" },
          { status: 400 },
        );
      }
      const isValid = verifyPassword(currentPassword, dbUser.password);
      if (!isValid) {
        return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters" },
          { status: 400 },
        );
      }
      updateData.password = hashPassword(newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: userSession.id },
      data: updateData,
    });

    // Refresh JWT cookie if name was changed
    const newSession = { id: updated.id, email: updated.email, name: updated.name };
    const newToken = signToken(newSession);

    const response = NextResponse.json({
      user: { id: updated.id, email: updated.email, name: updated.name },
      message: "Profile updated successfully",
    });

    response.cookies.set(COOKIE_NAME, newToken, sessionCookieOptions());

    return response;
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
