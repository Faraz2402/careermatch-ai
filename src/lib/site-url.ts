/** The production domain. Google sign-in only accepts redirects to this host. */
export const CANONICAL_URL = "https://careermatch.online";

/**
 * Public base URL of the site. APP_URL wins; production deployments otherwise
 * use the custom domain (never the *.vercel.app alias: OAuth redirects, email
 * links and cookies must all be on the same host); preview deployments use
 * their own URL; then localhost for dev.
 */
export function appUrl() {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return CANONICAL_URL;
  const vercel = process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
