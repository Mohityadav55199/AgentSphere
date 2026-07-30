import { NextResponse } from "next/server";
import { fetchThreadHistory } from "@/services/agentService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    const { threadId } = await params;
    if (!threadId) return NextResponse.json([], { status: 200 });

    const messages = await fetchThreadHistory(threadId);
    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/agent/history/[threadId]:", error);
    return NextResponse.json([], { status: 200 });
  }
}

