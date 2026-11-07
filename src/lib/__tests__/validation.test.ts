import { describe, expect, it } from "vitest";
import { getFileExtension, isValidTextContent, validateFile } from "@/lib/storage/validation";

const MB = 1024 * 1024;

/** Minimal File stand-in: validateFile only reads name, type and size. */
function fakeFile(name: string, type: string, size: number): File {
  return { name, type, size } as File;
}

describe("validateFile", () => {
  it("accepts allowed types within their size limit", () => {
    expect(validateFile(fakeFile("a.png", "image/png", 1 * MB))).toBeNull();
    expect(validateFile(fakeFile("a.pdf", "application/pdf", 9 * MB))).toBeNull();
    expect(validateFile(fakeFile("a.md", "text/markdown", 1 * MB))).toBeNull();
  });

  it("rejects disallowed MIME types", () => {
    expect(validateFile(fakeFile("a.exe", "application/x-msdownload", 10))?.field).toBe("type");
    expect(validateFile(fakeFile("a.html", "text/html", 10))?.field).toBe("type");
  });

  it("enforces per-type size limits", () => {
    expect(validateFile(fakeFile("a.png", "image/png", 6 * MB))?.field).toBe("size");
    expect(validateFile(fakeFile("a.pdf", "application/pdf", 11 * MB))?.field).toBe("size");
  });

  it("only allows text extensions for application/octet-stream", () => {
    expect(validateFile(fakeFile("notes.md", "application/octet-stream", 100))).toBeNull();
    expect(validateFile(fakeFile("run.sh", "application/octet-stream", 100))?.field).toBe("type");
    expect(validateFile(fakeFile("big.txt", "application/octet-stream", 3 * MB))?.field).toBe(
      "size",
    );
  });
});

describe("isValidTextContent", () => {
  it("accepts plain and unicode text", () => {
    expect(isValidTextContent(Buffer.from("# Title\n\nHello, world!\tok\r\n"))).toBe(true);
    expect(isValidTextContent(Buffer.from("नमस्ते दुनिया — ünïcödé ✓"))).toBe(true);
    expect(isValidTextContent(Buffer.alloc(0))).toBe(true);
  });

  it("rejects binary content", () => {
    expect(isValidTextContent(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x1a]))).toBe(false);
    expect(isValidTextContent(Buffer.from([0xff, 0xfe, 0xfd]))).toBe(false); // invalid UTF-8
    expect(isValidTextContent(Buffer.from("\x01\x02\x03\x04 text"))).toBe(false);
  });
});

describe("getFileExtension", () => {
  it("maps known MIME types and falls back to the subtype", () => {
    expect(getFileExtension("image/jpeg")).toBe("jpg");
    expect(getFileExtension("text/plain")).toBe("txt");
    expect(getFileExtension("application/zip")).toBe("zip");
  });
});
