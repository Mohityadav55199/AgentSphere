import prisma from "@/lib/database/prisma";

function generateSmartTitle(seed: string): string {
  const clean = seed
    .replace(/[#*`_~]/g, "") // remove markdown
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length === 0) return "New thread";

  // Take first 5 words or 40 characters
  const words = clean.split(" ");
  const shortTitle = words.slice(0, 6).join(" ");
  if (shortTitle.length > 35) {
    return shortTitle.substring(0, 32) + "...";
  }
  return shortTitle.charAt(0).toUpperCase() + shortTitle.slice(1);
}

/**
 * Ensure a thread exists; create if missing. Auto-summarizes title from prompt seed.
 */
export async function ensureThread(threadId: string, titleSeed?: string, userId?: string) {
  if (!threadId) throw new Error("threadId is required");

  const existing = await prisma.thread.findUnique({ where: { id: threadId } });
  const smartTitle = titleSeed ? generateSmartTitle(titleSeed) : "New thread";

  if (existing) {
    // If existing thread still has default title "New thread", update it with smart title
    const updateData: { userId?: string; title?: string } = {};
    if (userId && !existing.userId) updateData.userId = userId;
    if (existing.title === "New thread" && titleSeed) {
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

  return prisma.thread.create({
    data: {
      id: threadId,
      title: smartTitle,
      userId: userId || null,
    },
  });
}
