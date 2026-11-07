import { NextResponse } from "next/server";
import { fetchThreadHistory } from "@/services/agentService";
import { getCurrentUser } from "@/lib/auth";
import { checkThreadAccess } from "@/lib/thread";
import { getGuestId } from "@/lib/guest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    const { threadId } = await params;
    if (!threadId) return NextResponse.json([], { status: 200 });

    const user = await getCurrentUser();
    const access = await checkThreadAccess(threadId, user?.id, await getGuestId());
    if (access.status === "missing") return NextResponse.json([], { status: 200 });
    if (access.status === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await fetchThreadHistory(threadId);
    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/agent/history/[threadId]:", error);
    return NextResponse.json([], { status: 200 });
  }
}
