import "server-only";
// Social sign-in: Google, Microsoft (Outlook / Hotmail / work accounts) and
// LinkedIn, via the OAuth 2.0 / OpenID Connect authorization code flow with
// state (+ PKCE where supported). Each is enabled when its client ID and
// secret are set.

import { createHash, randomBytes } from "node:crypto";
import { appUrl } from "./mailer";

export type ProviderId = "google" | "microsoft" | "linkedin";

/** The column on User that stores each provider's account ID. */
export const ID_FIELD = { google: "googleId", microsoft: "microsoftId", linkedin: "linkedinId" } as const;

// Personal Microsoft accounts (outlook.com, hotmail.com, live.com) sign in
// through this tenant; their email address is verified by Microsoft.
const MS_CONSUMER_TENANT = "9188040d-6c67-4c5b-b112-36a304b66dad";

type Provider = {
  name: string;
  env: string;
  authorize: string;
  token: string;
  scope: string;
  pkce: boolean;
  extra?: Record<string, string>;
};

const PROVIDERS: Record<ProviderId, Provider> = {
  google: {
    name: "Google",
    env: "GOOGLE",
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    pkce: true,
    extra: { prompt: "select_account" },
  },
  microsoft: {
    name: "Microsoft",
    env: "MICROSOFT",
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email profile",
    pkce: true,
    extra: { prompt: "select_account", response_mode: "query" },
  },
  linkedin: {
    name: "LinkedIn",
    env: "LINKEDIN",
    authorize: "https://www.linkedin.com/oauth/v2/authorization",
    token: "https://www.linkedin.com/oauth/v2/accessToken",
    scope: "openid profile email",
    pkce: false, // LinkedIn web apps use the client secret; state still guards the flow
  },
};

export const isProvider = (p: string): p is ProviderId => p in PROVIDERS;
export const providerName = (p: ProviderId) => PROVIDERS[p].name;
const clientId = (p: ProviderId) => process.env[`${PROVIDERS[p].env}_CLIENT_ID`]?.trim();
const clientSecret = (p: ProviderId) => process.env[`${PROVIDERS[p].env}_CLIENT_SECRET`]?.trim();
export const providerEnabled = (p: ProviderId) => Boolean(clientId(p) && clientSecret(p));
export const enabledProviders = (): ProviderId[] => (Object.keys(PROVIDERS) as ProviderId[]).filter(providerEnabled);

export const redirectUri = (p: ProviderId) => `${appUrl()}/api/auth/oauth/${p}/callback`;
export const OAUTH_COOKIE = "cm_oauth";

export function startAuth(p: ProviderId) {
  const cfg = PROVIDERS[p];
  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const url = new URL(cfg.authorize);
  url.search = new URLSearchParams({
    client_id: clientId(p)!,
    redirect_uri: redirectUri(p),
    response_type: "code",
    scope: cfg.scope,
    state,
    ...(cfg.pkce && { code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }),
    ...cfg.extra,
  }).toString();
  return { url: url.toString(), cookie: `${state}.${verifier}` };
}

export type OAuthProfile = { id: string; email: string; emailVerified: boolean; name: string | null };

/** Claims from an ID token received directly from the provider's token endpoint over TLS. */
function idTokenClaims(idToken: string): Record<string, unknown> {
  const payload = idToken.split(".")[1];
  if (!payload) throw new Error("Missing ID token");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

export async function finishAuth(p: ProviderId, code: string, verifier: string): Promise<OAuthProfile> {
  const cfg = PROVIDERS[p];
  const tokenRes = await fetch(cfg.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      code,
      client_id: clientId(p)!,
      client_secret: clientSecret(p)!,
      redirect_uri: redirectUri(p),
      grant_type: "authorization_code",
      ...(cfg.pkce && { code_verifier: verifier }),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!tokenRes.ok) throw new Error(`${cfg.name} token exchange failed (${tokenRes.status}): ${(await tokenRes.text()).slice(0, 200)}`);
  const tokens = (await tokenRes.json()) as { access_token: string; id_token?: string };

  if (p === "microsoft") {
    const c = idTokenClaims(tokens.id_token ?? "");
    const email = String(c.email ?? c.preferred_username ?? "");
    // Work/school accounts can carry an email the organisation never verified.
    return { id: String(c.oid ?? c.sub), email, emailVerified: c.tid === MS_CONSUMER_TENANT && email.includes("@"), name: (c.name as string) ?? null };
  }

  const infoUrl = p === "google" ? "https://openidconnect.googleapis.com/v1/userinfo" : "https://api.linkedin.com/v2/userinfo";
  const infoRes = await fetch(infoUrl, { headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(15_000) });
  if (!infoRes.ok) throw new Error(`${cfg.name} userinfo failed (${infoRes.status})`);
  const info = (await infoRes.json()) as { sub: string; email?: string; email_verified?: boolean | string; name?: string };
  return { id: info.sub, email: info.email ?? "", emailVerified: info.email_verified === true || info.email_verified === "true", name: info.name ?? null };
}

/** Accounts that signed up through a provider may have no password they know. */
export const hasSocialLogin = (u: { googleId?: string | null; microsoftId?: string | null; linkedinId?: string | null }) => !!(u.googleId || u.microsoftId || u.linkedinId);
