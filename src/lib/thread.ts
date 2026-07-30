import prisma from "@/lib/database/prisma";

/**
 * Ensure a thread exists; create if missing. Title derived from seed (first 100 chars) or fallback.
 * Returns the Prisma thread record.
 */
export async function ensureThread(threadId: string, titleSeed?: string, userId?: string) {
  if (!threadId) throw new Error("threadId is required");
  const title = (titleSeed?.trim() || "New thread").substring(0, 100);
  return prisma.thread.upsert({
    where: { id: threadId },
    update: userId ? { userId } : {},
    create: { id: threadId, title, userId },
  });
}
