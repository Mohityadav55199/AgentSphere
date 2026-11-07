import { NextRequest, NextResponse } from "next/server";
import type { Thread } from "@/types/message";
import prisma from "@/lib/database/prisma";
import { UpdateThreadBody, DeleteThreadBody } from "./schema";
import { getCurrentUser } from "@/lib/auth";
import { checkThreadAccess } from "@/lib/thread";
import { getGuestId, getOrCreateGuestId } from "@/lib/guest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ThreadEntity = {
  id: string;
  title: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET() {
  const user = await getCurrentUser();
  const guestId = await getGuestId();

  // Signed-in users see their own threads plus the guest threads of this browser;
  // guests see only the threads created by this browser.
  const guestCondition = guestId ? [{ userId: null, guestId }] : [];
  const whereCondition = user
    ? { OR: [{ userId: user.id }, ...guestCondition] }
    : guestCondition[0];
  if (!whereCondition) return NextResponse.json([], { status: 200 });

  const dbThreads = await prisma.thread.findMany({
    where: whereCondition,
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });

  const threads: Thread[] = dbThreads.map((t: ThreadEntity) => ({
    id: t.id,
    title: t.title,
    isPinned: t.isPinned,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
  return NextResponse.json(threads, { status: 200 });
}

export async function POST() {
  const user = await getCurrentUser();

  // Verify the user actually exists in DB — session may be stale after a DB reset
  let userId: string | null = null;
  if (user?.id) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    userId = dbUser?.id ?? null;
  }

  const guestId = userId ? null : await getOrCreateGuestId();

  const created = await prisma.thread.create({
    data: {
      title: "New thread",
      userId,
      guestId,
    },
  });
  const thread: Thread = {
    id: created.id,
    title: created.title,
    isPinned: created.isPinned,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
  return NextResponse.json(thread, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  try {
    const parsed = UpdateThreadBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const { id, title, isPinned } = parsed.data;

    const user = await getCurrentUser();
    const access = await checkThreadAccess(id, user?.id, await getGuestId());
    if (access.status === "missing") {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    if (access.status === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: { title?: string; isPinned?: boolean } = {};
    if (title !== undefined) updateData.title = title;
    if (isPinned !== undefined) updateData.isPinned = isPinned;

    const updated = await prisma.thread.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(
      {
        id: updated.id,
        title: updated.title,
        isPinned: updated.isPinned,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (e: unknown) {
    console.error("Error updating thread:", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const deleteEmpty = url.searchParams.get("empty") === "true";

    if (deleteEmpty) {
      const user = await getCurrentUser();
      const guestId = await getGuestId();
      const guestCondition = guestId ? [{ userId: null, guestId }] : [];
      const userCondition = user
        ? { OR: [{ userId: user.id }, ...guestCondition] }
        : guestCondition[0];
      if (!userCondition) return NextResponse.json({ success: true, count: 0 }, { status: 200 });

      const deleted = await prisma.thread.deleteMany({
        where: {
          AND: [
            userCondition,
            { isPinned: false },
            {
              OR: [
                { title: "New thread" },
                { title: "Untitled thread" },
                { title: "New chat" },
                { title: "Untitled" },
                { title: "" },
              ],
            },
          ],
        },
      });

      return NextResponse.json({ success: true, count: deleted.count }, { status: 200 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = DeleteThreadBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Thread id required" }, { status: 400 });
    }
    const { id } = parsed.data;

    const user = await getCurrentUser();
    const access = await checkThreadAccess(id, user?.id, await getGuestId());
    if (access.status === "missing") {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    if (access.status === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the thread from Prisma (metadata)
    await prisma.thread.delete({ where: { id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: unknown) {
    console.error("Error deleting thread:", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
