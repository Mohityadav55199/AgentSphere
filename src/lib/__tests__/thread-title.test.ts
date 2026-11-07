import { describe, expect, it, vi } from "vitest";

// thread.ts imports the Prisma client; titles are pure, so stub the DB layer.
vi.mock("@/lib/database/prisma", () => ({ default: {}, prisma: {} }));

const { generateSmartTitle } = await import("@/lib/thread");

describe("generateSmartTitle", () => {
  it("strips conversational prefixes and capitalises", () => {
    expect(generateSmartTitle("can you please explain react server components")).toBe(
      "Explain react server components",
    );
    expect(generateSmartTitle("how do i deploy to render")).toBe("Deploy to render");
  });

  it("removes markdown and collapses whitespace", () => {
    expect(generateSmartTitle("**Fix**   the `build`\n\nerror")).toBe("Fix the build error");
  });

  it("limits titles to six words / 38 characters", () => {
    const title = generateSmartTitle(
      "summarise extraordinarily comprehensive documentation regarding distributed consensus algorithms today",
    );
    expect(title.length).toBeLessThanOrEqual(38);
    expect(title.endsWith("...")).toBe(true);
    expect(generateSmartTitle("one two three four five six seven eight").split(" ")).toHaveLength(
      6,
    );
  });

  it("falls back for empty input", () => {
    expect(generateSmartTitle("   ")).toBe("New thread");
  });
});
