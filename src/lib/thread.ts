import prisma from "@/lib/database/prisma";

export function generateSmartTitle(seed: string): string {
  const clean = seed
    .replace(/[#*`_~]/g, "") // remove markdown
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length === 0) return "New thread";

  // Strip conversational/greeting prefixes to produce punchy, descriptive titles
  const stripped = clean
    .replace(
      /^(can you (please )?|could you (please )?|please |help me (with )?|i want to |i need to |how to |how do i |tell me about |what is |what are |explain (to me )?|write a |write an |create a |create an |generate a |give me (a |an )?)/i,
      "",
    )
    .trim();

  const titleSource = stripped.length > 3 ? stripped : clean;

  // Take first 6 words or up to 38 characters
  const words = titleSource.split(" ");
  const shortTitle = words.slice(0, 6).join(" ");
  const finalTitle = shortTitle.length > 38 ? shortTitle.substring(0, 35) + "..." : shortTitle;
  return finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);
}

/**
 * Ensure a thread exists; create if missing. Auto-summarizes title from prompt seed.
 */
export async function ensureThread(
  threadId: string,
  titleSeed?: string,
  userId?: string,
  guestId?: string,
) {
  if (!threadId) throw new Error("threadId is required");

  const existing = await prisma.thread.findUnique({ where: { id: threadId } });
  const smartTitle = titleSeed ? generateSmartTitle(titleSeed) : "New thread";

  if (existing) {
    const updateData: { userId?: string; title?: string } = {};

    // Only verify user against DB when we'd actually claim the thread
    if (userId && !existing.userId) {
      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      if (dbUser) updateData.userId = dbUser.id;
    }

    // Rename if current title is any variation of the default or untitled chat
    const isDefaultTitle =
      !existing.title ||
      existing.title === "New thread" ||
      existing.title === "Untitled thread" ||
      existing.title === "New chat" ||
      existing.title === "Untitled" ||
      existing.title.toLowerCase().startsWith("thread ");

    if (isDefaultTitle && titleSeed) {
      updateData.title = smartTitle;
    }
    if (Object.keys(updateData).length > 0) {
      return prisma.thread.update({
        where: { id: threadId },
        data: updateData,
      });
    }
    return existing;
  }

  // For new threads, verify user exists before associating
  let verifiedUserId: string | null = null;
  if (userId) {
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    verifiedUserId = dbUser?.id ?? null;
  }

  return prisma.thread.create({
    data: {
      id: threadId,
      title: smartTitle,
      userId: verifiedUserId,
      guestId: verifiedUserId ? null : (guestId ?? null),
    },
  });
}

export type ThreadAccess =
  | { status: "missing" }
  | { status: "forbidden" }
  | { status: "ok"; thread: NonNullable<Awaited<ReturnType<typeof prisma.thread.findUnique>>> };

/**
 * Ownership check shared by every thread-scoped endpoint.
 * Threads owned by a signed-in user are limited to that user; guest threads are limited to the
 * browser holding the matching guest cookie. Legacy threads with no owner at all stay open.
 */
export async function checkThreadAccess(
  threadId: string,
  userId: string | undefined | null,
  guestId?: string | null,
): Promise<ThreadAccess> {
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) return { status: "missing" };
  if (thread.userId) {
    if (thread.userId !== userId) return { status: "forbidden" };
  } else if (thread.guestId && thread.guestId !== guestId) {
    return { status: "forbidden" };
  }
  return { status: "ok", thread };
}
