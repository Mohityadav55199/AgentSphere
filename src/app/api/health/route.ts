import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "unknown";

  try {
    // Quick, lightweight ping to ensure database is responsive
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (error) {
    dbStatus = "disconnected";
    console.warn(
      "Health check database ping failed:",
      error instanceof Error ? error.message : error,
    );
  }

  const responseTimeMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
      responseTimeMs,
      message: "AgentSphere server is active and warm",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
