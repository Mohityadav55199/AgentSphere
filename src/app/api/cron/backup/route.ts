import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { getS3Client, BUCKET_NAME } from "@/lib/storage/s3-client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import zlib from "zlib";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleBackup(req);
}

export async function POST(req: NextRequest) {
  return handleBackup(req);
}

async function handleBackup(req: NextRequest) {
  // Authentication check for cronjob website
  const cronSecret = process.env.CRON_SECRET;
  const providedKey =
    req.nextUrl.searchParams.get("key") ||
    req.headers.get("x-cron-key") ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (cronSecret && providedKey !== cronSecret) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing CRON_SECRET key" },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    // 1. Fetch core database records
    const [users, threads, mcpServers] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.thread.findMany(),
      prisma.mCPServer.findMany(),
    ]);

    const backupPayload = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        appName: "AgentSphere",
        counts: {
          users: users.length,
          threads: threads.length,
          mcpServers: mcpServers.length,
        },
      },
      data: {
        users,
        threads,
        mcpServers,
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const compressedBuffer = zlib.gzipSync(Buffer.from(jsonString));
    const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
    const s3Key = `database-backups/agentsphere-backup-${timestampStr}.json.gz`;

    let s3Uploaded = false;
    let s3Message = "S3 not configured (backup data returned in response)";

    // 2. Upload to S3/Cloudflare R2 if configured
    const s3 = getS3Client();
    if (s3) {
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: compressedBuffer,
            ContentType: "application/gzip",
            Metadata: {
              timestamp: new Date().toISOString(),
              appName: "AgentSphere",
            },
          })
        );
        s3Uploaded = true;
        s3Message = `Uploaded successfully to s3://${BUCKET_NAME}/${s3Key}`;
      } catch (s3Err) {
        console.error("Failed to upload backup to S3:", s3Err);
        s3Message = `S3 upload failed: ${s3Err instanceof Error ? s3Err.message : String(s3Err)}`;
      }
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationMs,
      stats: {
        users: users.length,
        threads: threads.length,
        mcpServers: mcpServers.length,
        uncompressedBytes: Buffer.byteLength(jsonString),
        compressedBytes: compressedBuffer.length,
      },
      storage: {
        s3Uploaded,
        s3Key: s3Uploaded ? s3Key : undefined,
        message: s3Message,
      },
    });
  } catch (error) {
    console.error("Backup cron execution failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal backup error",
      },
      { status: 500 }
    );
  }
}
