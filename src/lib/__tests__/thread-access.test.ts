import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
vi.mock("@/lib/database/prisma", () => ({
  default: { thread: { findUnique } },
  prisma: { thread: { findUnique } },
}));

const { checkThreadAccess } = await import("@/lib/thread");

const thread = (over: Record<string, unknown>) => ({
  id: "t1",
  userId: null,
  guestId: null,
  ...over,
});

beforeEach(() => findUnique.mockReset());

describe("checkThreadAccess", () => {
  it("reports missing threads", async () => {
    findUnique.mockResolvedValue(null);
    expect((await checkThreadAccess("t1", "u1")).status).toBe("missing");
  });

  it("limits user-owned threads to the owner", async () => {
    findUnique.mockResolvedValue(thread({ userId: "u1" }));
    expect((await checkThreadAccess("t1", "u1")).status).toBe("ok");
    expect((await checkThreadAccess("t1", "u2")).status).toBe("forbidden");
    expect((await checkThreadAccess("t1", undefined, "g1")).status).toBe("forbidden");
  });

  it("limits guest threads to the browser that created them", async () => {
    findUnique.mockResolvedValue(thread({ guestId: "g1" }));
    expect((await checkThreadAccess("t1", undefined, "g1")).status).toBe("ok");
    expect((await checkThreadAccess("t1", undefined, "g2")).status).toBe("forbidden");
    expect((await checkThreadAccess("t1", "u1", undefined)).status).toBe("forbidden");
  });

  it("keeps legacy threads with no owner open", async () => {
    findUnique.mockResolvedValue(thread({}));
    expect((await checkThreadAccess("t1", undefined)).status).toBe("ok");
  });
});
