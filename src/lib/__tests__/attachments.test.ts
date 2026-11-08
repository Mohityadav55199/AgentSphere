import { afterEach, describe, expect, it, vi } from "vitest";
import { sanitizeAttachments } from "@/lib/storage/attachments";
import { getPublicObjectUrl } from "@/lib/storage/upload";

const KEY = "0b4f6a52-7c1d-4e8a-9f3b-2d6c1a5e7b90.png";

afterEach(() => vi.unstubAllEnvs());

describe("sanitizeAttachments", () => {
  it("keeps valid entries and rebuilds the URL from the key", () => {
    vi.stubEnv("S3_PUBLIC_URL", "https://cdn.example.com");
    const [a] = sanitizeAttachments([
      { key: KEY, url: "javascript:alert(1)", name: " cat.png ", type: "image/png", size: 10 },
    ])!;
    expect(a).toEqual({
      key: KEY,
      url: `https://cdn.example.com/${KEY}`,
      name: "cat.png",
      type: "image/png",
      size: 10,
    });
  });

  it("drops entries with foreign or path-like keys and bad types", () => {
    expect(
      sanitizeAttachments([
        { key: "../secrets.txt", type: "text/plain" },
        { key: "other-users-file.png", type: "image/png" },
        { key: KEY, type: "not a mime" },
        "garbage",
        null,
      ]),
    ).toBeUndefined();
  });

  it("returns undefined for non-arrays and caps the count", () => {
    expect(sanitizeAttachments({ key: KEY })).toBeUndefined();
    const many = Array.from({ length: 10 }, () => ({ key: KEY, type: "image/png" }));
    expect(sanitizeAttachments(many)!.length).toBe(3);
  });
});

describe("getPublicObjectUrl", () => {
  it("uses path-style URLs for MinIO", () => {
    vi.stubEnv("S3_PUBLIC_URL", "");
    vi.stubEnv("S3_ENDPOINT", "http://localhost:9000");
    vi.stubEnv("S3_FORCE_PATH_STYLE", "true");
    expect(getPublicObjectUrl(KEY)).toBe(`http://localhost:9000/uploads/${KEY}`);
  });

  it("builds an absolute AWS URL when no endpoint is set (was a broken relative path)", () => {
    vi.stubEnv("S3_PUBLIC_URL", "");
    vi.stubEnv("S3_ENDPOINT", "");
    vi.stubEnv("S3_REGION", "ap-south-1");
    expect(getPublicObjectUrl(KEY)).toBe(`https://uploads.s3.ap-south-1.amazonaws.com/${KEY}`);
  });

  it("uses virtual-hosted style for custom endpoints without path style", () => {
    vi.stubEnv("S3_PUBLIC_URL", "");
    vi.stubEnv("S3_ENDPOINT", "https://acct.r2.cloudflarestorage.com");
    vi.stubEnv("S3_FORCE_PATH_STYLE", "false");
    expect(getPublicObjectUrl(KEY)).toBe(`https://uploads.acct.r2.cloudflarestorage.com/${KEY}`);
  });
});
