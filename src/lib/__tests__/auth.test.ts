import { afterEach, describe, expect, it, vi } from "vitest";
import { hashPassword, signToken, verifyPassword, verifyToken } from "@/lib/auth";

const user = { id: "user-1", email: "ada@example.com", name: "Ada" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("password hashing", () => {
  it("verifies the correct password and rejects a wrong one", () => {
    const stored = hashPassword("correct horse");
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(verifyPassword("correct horse", stored)).toBe(true);
    expect(verifyPassword("wrong", stored)).toBe(false);
  });

  it("uses a fresh salt for every hash", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("returns false for malformed stored hashes", () => {
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "no-separator")).toBe(false);
  });
});

describe("session tokens", () => {
  it("round-trips a signed token", () => {
    expect(verifyToken(signToken(user))).toEqual(user);
  });

  it("rejects a token whose payload was tampered with", () => {
    const [header, , signature] = signToken(user).split(".");
    const forgedBody = Buffer.from(JSON.stringify({ ...user, id: "admin" })).toString("base64url");
    expect(verifyToken(`${header}.${forgedBody}.${signature}`)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    vi.stubEnv("JWT_SECRET", "secret-a");
    const token = signToken(user);
    vi.stubEnv("JWT_SECRET", "secret-b");
    expect(verifyToken(token)).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = signToken(user);
    vi.setSystemTime(new Date("2026-01-09T00:00:00Z")); // > 7 days later
    expect(verifyToken(token)).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(verifyToken("")).toBeNull();
    expect(verifyToken("a.b")).toBeNull();
    expect(verifyToken("not.a.token")).toBeNull();
  });

  it("refuses to sign in production without JWT_SECRET", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "");
    expect(() => signToken(user)).toThrow(/JWT_SECRET/);
  });
});
