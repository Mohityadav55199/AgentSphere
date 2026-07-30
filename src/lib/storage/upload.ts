import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getS3Client, BUCKET_NAME } from "./s3-client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function sanitizeFilenameForHeader(filename: string): string | undefined {
  const stripped = filename
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\\/]/g, "_")
    .trim();

  if (!stripped) return undefined;
  return stripped.slice(0, 180);
}

function escapeQuotedString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildContentDispositionAttachment(originalFilename: string): string | undefined {
  const safe = sanitizeFilenameForHeader(originalFilename);
  if (!safe) return undefined;

  const fallback = safe.replace(/[^\x20-\x7E]/g, "_");
  const quotedFallback = escapeQuotedString(fallback || "download");

  const encoded = encodeURIComponent(safe).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `attachment; filename="${quotedFallback}"; filename*=UTF-8''${encoded}`;
}

export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string,
  originalFilename?: string,
): Promise<string> {
  const client = getS3Client();
  if (!client) {
    throw new Error("File uploads are currently disabled (S3 credentials not configured).");
  }

  const contentDisposition = originalFilename
    ? buildContentDispositionAttachment(originalFilename)
    : undefined;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ...(contentDisposition && { ContentDisposition: contentDisposition }),
  });

  await client.send(command);

  const endpoint = process.env.S3_ENDPOINT || "";
  return `${endpoint}/${BUCKET_NAME}/${key}`;
}

export async function uploadLargeFile(
  buffer: Buffer,
  key: string,
  contentType: string,
  originalFilename?: string,
): Promise<string> {
  const client = getS3Client();
  if (!client) {
    throw new Error("File uploads are currently disabled (S3 credentials not configured).");
  }

  const contentDisposition = originalFilename
    ? buildContentDispositionAttachment(originalFilename)
    : undefined;

  const upload = new Upload({
    client,
    params: {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ...(contentDisposition && { ContentDisposition: contentDisposition }),
    },
    queueSize: 4,
    partSize: 5 * 1024 * 1024,
  });

  await upload.done();

  const endpoint = process.env.S3_ENDPOINT || "";
  return `${endpoint}/${BUCKET_NAME}/${key}`;
}

export async function getFile(key: string): Promise<Buffer> {
  const client = getS3Client();
  if (!client) {
    throw new Error("File storage is currently disabled.");
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await client.send(command);

  if (!response.Body) {
    throw new Error("File not found");
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getS3Client();
  if (!client) {
    throw new Error("File storage is currently disabled.");
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

