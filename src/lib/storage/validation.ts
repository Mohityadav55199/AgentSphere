/**
 * File validation utilities for upload endpoint
 */

// Allowed file extensions for application/octet-stream
// (browsers often send text files with this generic MIME type)
const OCTET_STREAM_ALLOWED_EXTENSIONS = ["md", "markdown", "txt"];
const MAX_OCTET_STREAM_SIZE = 2 * 1024 * 1024; // 2MB

// Maximum number of attachments allowed per message
export const MAX_ATTACHMENTS = 3;

export const ALLOWED_MIME_TYPES = {
  // Images
  "image/png": { ext: "png", maxSize: 5 * 1024 * 1024 }, // 5MB
  "image/jpeg": { ext: "jpg", maxSize: 5 * 1024 * 1024 }, // 5MB
  "image/jpg": { ext: "jpg", maxSize: 5 * 1024 * 1024 }, // 5MB
  // Documents
  "application/pdf": { ext: "pdf", maxSize: 10 * 1024 * 1024 }, // 10MB
  // Text
  "text/markdown": { ext: "md", maxSize: 2 * 1024 * 1024 }, // 2MB
  "text/plain": { ext: "txt", maxSize: 2 * 1024 * 1024 }, // 2MB
} as const;

export interface ValidationError {
  field: string;
  message: string;
}

export function validateFile(file: File): ValidationError | null {
  // Special handling for application/octet-stream
  // (browsers often use this for text files with unrecognized extensions)
  if (file.type === "application/octet-stream") {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";

    // Only allow specific text file extensions for octet-stream
    if (!OCTET_STREAM_ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        field: "type",
        message: `Files with type application/octet-stream must have extension: ${OCTET_STREAM_ALLOWED_EXTENSIONS.join(", ")}. Got: .${extension}`,
      };
    }

    // Apply size limit for text files under octet-stream
    if (file.size > MAX_OCTET_STREAM_SIZE) {
      return {
        field: "size",
        message: `File size exceeds maximum allowed size of ${MAX_OCTET_STREAM_SIZE / (1024 * 1024)}MB for text files`,
      };
    }

    return null;
  }

  // Check if file type is allowed
  if (!(file.type in ALLOWED_MIME_TYPES)) {
    return {
      field: "type",
      message: `File type ${file.type} is not allowed. Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(", ")}`,
    };
  }

  // Check file size
  const { maxSize } = ALLOWED_MIME_TYPES[file.type as keyof typeof ALLOWED_MIME_TYPES];
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      field: "size",
      message: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  return null;
}

export function getFileExtension(mimeType: string): string {
  if (mimeType in ALLOWED_MIME_TYPES) {
    return ALLOWED_MIME_TYPES[mimeType as keyof typeof ALLOWED_MIME_TYPES].ext;
  }
  // Fallback: extract from mime type
  return mimeType.split("/")[1] || "bin";
}

/**
 * Validate that a buffer contains text rather than binary data.
 *
 * Rejects content that contains NUL bytes, is not valid UTF-8, or where fewer than 95% of
 * characters are printable (tabs, newlines and any non-control Unicode count as printable).
 *
 * @param buffer File buffer to validate
 * @returns true if the buffer looks like text
 */
export function isValidTextContent(buffer: Buffer): boolean {
  if (buffer.length === 0) return true;
  if (buffer.includes(0)) return false;

  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return false; // Invalid UTF-8
  }

  let printable = 0;
  for (const char of content) {
    const code = char.codePointAt(0) ?? 0;
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)) printable++;
  }
  return printable / [...content].length >= 0.95;
}
