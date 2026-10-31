/**
 * Public base URL of the site. APP_URL wins; on Vercel we fall back to the
 * project's production domain (a system env var), then localhost for dev.
 */
export function appUrl() {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
