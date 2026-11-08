/**
 * Gets the application's public base URL (used for OAuth redirect URLs).
 *
 * Order of preference:
 *  1. NEXT_PUBLIC_APP_URL, unless it points at localhost in production (usually a value copied
 *     from .env.example into the hosting dashboard, which sent OAuth redirects to localhost).
 *  2. The platform's own URL: RENDER_EXTERNAL_URL (Render), VERCEL_PROJECT_PRODUCTION_URL or
 *     VERCEL_URL (Vercel). Both platforms set these automatically.
 *  3. http://localhost:3000 for development and builds.
 */
const LOCAL_HOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/\/+$/, "");
  return trimmed || undefined;
}

function platformUrl(): string | undefined {
  const render = clean(process.env.RENDER_EXTERNAL_URL);
  if (render) return render;
  const vercelProduction = clean(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelProduction) return `https://${vercelProduction}`;
  const vercel = clean(process.env.VERCEL_URL);
  return vercel ? `https://${vercel}` : undefined;
}

export function getAppUrl(): string {
  const configured = clean(process.env.NEXT_PUBLIC_APP_URL);
  const platform = platformUrl();
  const isProduction = process.env.NODE_ENV === "production";

  if (configured && !(isProduction && platform && LOCAL_HOST_PATTERN.test(configured))) {
    return configured;
  }
  return platform ?? "http://localhost:3000";
}
