/**
 * Gets the application base URL from environment variable.
 *
 * Checks NEXT_PUBLIC_APP_URL first, then VERCEL_URL (auto-provided on Vercel),
 * and falls back to localhost:3000.
 */
export function getAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Development & build fallback
  return "http://localhost:3000";
}

