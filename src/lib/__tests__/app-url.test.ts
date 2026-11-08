import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppUrl } from "@/lib/config/app-url";

function env(vars: Record<string, string>) {
  for (const key of [
    "NEXT_PUBLIC_APP_URL",
    "RENDER_EXTERNAL_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
    "VERCEL_URL",
  ]) {
    vi.stubEnv(key, "");
  }
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value);
}

afterEach(() => vi.unstubAllEnvs());

describe("getAppUrl", () => {
  it("uses NEXT_PUBLIC_APP_URL when it is a real URL (trailing slash removed)", () => {
    env({ NODE_ENV: "production", NEXT_PUBLIC_APP_URL: "https://myapp.com/" });
    expect(getAppUrl()).toBe("https://myapp.com");
  });

  // Regression: the OAuth callback redirected users to http://localhost:3000 on both deployments.
  it("ignores a localhost NEXT_PUBLIC_APP_URL in production and uses Render's URL", () => {
    env({
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      RENDER_EXTERNAL_URL: "https://agentsphere.onrender.com",
    });
    expect(getAppUrl()).toBe("https://agentsphere.onrender.com");
  });

  it("uses Vercel's production domain, then the deployment URL", () => {
    env({
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      VERCEL_PROJECT_PRODUCTION_URL: "agent-sphere-self.vercel.app",
      VERCEL_URL: "agent-sphere-abc123.vercel.app",
    });
    expect(getAppUrl()).toBe("https://agent-sphere-self.vercel.app");
    env({ NODE_ENV: "production", VERCEL_URL: "agent-sphere-abc123.vercel.app" });
    expect(getAppUrl()).toBe("https://agent-sphere-abc123.vercel.app");
  });

  it("keeps localhost in development, and when no platform URL is available", () => {
    env({ NODE_ENV: "development", NEXT_PUBLIC_APP_URL: "http://localhost:3001" });
    expect(getAppUrl()).toBe("http://localhost:3001");
    env({ NODE_ENV: "production", NEXT_PUBLIC_APP_URL: "http://localhost:3000" });
    expect(getAppUrl()).toBe("http://localhost:3000");
    env({ NODE_ENV: "development" });
    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});
