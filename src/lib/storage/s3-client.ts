import { S3Client } from "@aws-sdk/client-s3";

export const isS3Configured = Boolean(
  process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY,
);

/**
 * S3 client configured for MinIO (development) or AWS S3/Cloudflare R2 (production).
 * Only created if S3 credentials are configured.
 */
let clientInstance: S3Client | null = null;

export function getS3Client(): S3Client | null {
  if (!isS3Configured) return null;
  if (!clientInstance) {
    clientInstance = new S3Client({
      endpoint: process.env.S3_ENDPOINT || undefined,
      region: process.env.S3_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    });
  }
  return clientInstance;
}

// Fallback dummy export for compatibility
export const s3Client = isS3Configured
  ? getS3Client()!
  : (null as unknown as S3Client);

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || "uploads";


