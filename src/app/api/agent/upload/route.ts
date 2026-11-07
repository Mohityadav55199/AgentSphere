import { NextRequest, NextResponse } from "next/server";
import { uploadFile, uploadLargeFile } from "@/lib/storage/upload";
import { validateFile, isValidTextContent, getFileExtension } from "@/lib/storage/validation";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * File upload endpoint
 * Accepts multipart/form-data with a 'file' field
 * Validates file type and size
 * Uploads to S3/MinIO and returns file metadata
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided", field: "file" }, { status: 400 });
    }

    // Validate file type and size
    const validationError = validateFile(file);
    if (validationError) {
      return NextResponse.json(
        {
          error: validationError.message,
          field: validationError.field,
        },
        { status: 400 },
      );
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Text uploads (text/* or octet-stream .md/.txt) must really be text, not a renamed binary.
    {
      const nameExtension = file.name.split(".").pop()?.toLowerCase() || "";
      const isTextUpload =
        file.type.startsWith("text/") ||
        (file.type === "application/octet-stream" &&
          ["md", "markdown", "txt"].includes(nameExtension));

      if (isTextUpload) {
        if (!isValidTextContent(buffer)) {
          return NextResponse.json(
            {
              error: "File appears to be binary, not text",
              field: "content",
            },
            { status: 400 },
          );
        }
      }
    }

    // Generate a unique object key. The extension comes from the user's filename, so restrict it
    // to short alphanumerics to keep "/", "..", and other path tricks out of the storage key.
    const rawExtension = file.name.includes(".") ? file.name.split(".").pop() || "" : "";
    const extension = /^[a-z0-9]{1,10}$/i.test(rawExtension)
      ? rawExtension.toLowerCase()
      : getFileExtension(file.type);
    const key = `${randomUUID()}.${extension}`;

    // Upload to S3/MinIO (use multipart for files > 5MB)
    // Pass original filename for Content-Disposition header
    const url =
      file.size > 5 * 1024 * 1024
        ? await uploadLargeFile(buffer, key, file.type, file.name)
        : await uploadFile(buffer, key, file.type, file.name);

    return NextResponse.json({
      success: true,
      url,
      key,
      name: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
        field: "server",
      },
      { status: 500 },
    );
  }
}
