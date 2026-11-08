import type { FileAttachment } from "@/types/message";
import { MAX_ATTACHMENTS } from "./validation";
import { getPublicObjectUrl } from "./upload";

/** Object keys created by /api/agent/upload: `<uuid>.<ext>`. */
const UPLOAD_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,10}$/i;

/**
 * Attachment metadata arrives from the browser in the stream request and is stored in the
 * conversation. Keep only well-formed entries for keys our upload endpoint could have created,
 * and rebuild the URL from the key so a crafted `url` (e.g. `javascript:`) never reaches the UI.
 */
export function sanitizeAttachments(input: unknown): FileAttachment[] | undefined {
  if (!Array.isArray(input)) return undefined;

  const result: FileAttachment[] = [];
  for (const item of input.slice(0, MAX_ATTACHMENTS)) {
    if (!item || typeof item !== "object") continue;
    const { key, name, type, size } = item as Record<string, unknown>;
    if (typeof key !== "string" || !UPLOAD_KEY_PATTERN.test(key)) continue;
    if (typeof type !== "string" || !/^[\w.+-]+\/[\w.+-]+$/.test(type)) continue;

    result.push({
      key,
      url: getPublicObjectUrl(key),
      name: typeof name === "string" && name.trim() ? name.trim().slice(0, 180) : key,
      type,
      size: typeof size === "number" && Number.isFinite(size) && size >= 0 ? size : 0,
    });
  }
  return result.length ? result : undefined;
}
