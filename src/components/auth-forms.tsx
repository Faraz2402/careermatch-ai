"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, api, DemoButton } from "./client";

function useSubmit() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(url: string, json: unknown, onDone?: (r: Record<string, unknown>) => void) {
    setBusy(true);
    setError("");
    try {
      const r = await api(url, { method: "POST", json });
      if (onDone) onDone(r);
      else if (typeof r.redirect === "string") {
        router.push(r.redirect);
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, submit };
}

type Provider = "google" | "microsoft" | "linkedin";

const PROVIDER_NAMES: Record<string, string> = { google: "Google", microsoft: "Microsoft", linkedin: "LinkedIn" };

function oauthError(code: string | null, provider: string | null): string | null {
  const name = PROVIDER_NAMES[provider ?? ""] ?? "That provider";
  switch (code) {
    case "oauth_disabled": return `${name} sign-in isn't set up on this site yet.`;
    case "oauth_cancelled": return `${name} sign-in was cancelled.`;
    case "oauth_state": return `${name} sign-in expired. Please try again.`;
    case "oauth_no_email": return `${name} didn't share an email address, so we can't sign you in with it.`;
    case "oauth_unverified": return `An account with this email already exists. Sign in with your password, because ${name} didn't confirm this email belongs to you.`;
    case "oauth_failed": return `${name} sign-in failed. Please try again.`;
    default: return null;
  }
}

const ICONS: Record<Provider, React.ReactNode> = {
  google: (
    <svg aria-hidden width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
  ),
  microsoft: (
    <svg aria-hidden width="16" height="16" viewBox="0 0 21 21"><path fill="#f25022" d="M1 1h9v9H1z"/><path fill="#7fba00" d="M11 1h9v9h-9z"/><path fill="#00a4ef" d="M1 11h9v9H1z"/><path fill="#ffb900" d="M11 11h9v9h-9z"/></svg>
  ),
  linkedin: (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#0A66C2"/><path fill="#fff" d="M7.1 9.4h-2.6V19h2.6V9.4zM5.8 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm13.7 8.6c0-2.5-1.3-4.4-3.9-4.4-1.3 0-2.2.7-2.6 1.4V9.4h-2.5V19h2.6v-5c0-1.3.3-2.6 1.9-2.6s1.7 1.5 1.7 2.7V19h2.6v-5.4z"/></svg>
  ),
};

const LABELS: Record<Provider, string> = { google: "Continue with Google", microsoft: "Continue with Outlook / Microsoft", linkedin: "Continue with LinkedIn" };

function SocialButtons({ providers }: { providers: Provider[] }) {
  if (providers.length === 0) return null;
  return (
    <>
      <div className="space-y-2">
        {providers.map((p) => (
          <a key={p} href={`/api/auth/oauth/${p}`} className="btn-secondary w-full gap-2.5">
            {ICONS[p]}
            {LABELS[p]}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or use your email<span className="h-px flex-1 bg-slate-200" /></div>
    </>
  );
}

const formData = (e: React.FormEvent<HTMLFormElement>) => Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;

export function LoginForm({ providers }: { providers: Provider[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const { busy, error, submit } = useSubmit();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const next = params.get("next");
        submit("/api/auth/login", formData(e), (r) => {
          router.push(next?.startsWith("/") && !next.startsWith("//") ? next : String(r.redirect));
          router.refresh();
        });
      }}
    >
      <h1 className="font-serif text-4xl font-normal">Welcome back</h1>
      {params.get("reset") && <Alert kind="success">Password updated. Sign in with your new password.</Alert>}
      {oauthError(params.get("error"), params.get("provider")) && <Alert>{oauthError(params.get("error"), params.get("provider"))}</Alert>}
      {error && <Alert>{error}</Alert>}
      <SocialButtons providers={providers} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="password">Password</label>
          <Link href="/forgot-password" className="mb-1 text-xs font-medium text-brand-600 hover:underline">Forgot password?</Link>
        </div>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="text-center text-sm text-slate-600">
        New here? <Link href="/signup" className="font-semibold text-brand-600 hover:underline">Create an account</Link>
      </p>
      <div className="border-t border-slate-100 pt-4 text-center">
        <DemoButton className="btn-ghost w-full">Explore the demo instead</DemoButton>
      </div>
    </form>
  );
}

export function SignupForm({ providers }: { providers: Provider[] }) {
  const { busy, error, submit } = useSubmit();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit("/api/auth/signup", formData(e));
      }}
    >
      <h1 className="font-serif text-4xl font-normal">Create your account</h1>
      <p className="text-sm text-slate-600">Free to start. Your data stays private until you publish your profile.</p>
      {error && <Alert>{error}</Alert>}
      <SocialButtons providers={providers} />
      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input className="input" id="name" name="name" autoComplete="name" required />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="mt-1 text-xs text-slate-500">At least 8 characters, including a letter and a number.</p>
      </div>
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
      <p className="text-center text-sm text-slate-600">
        Already have an account? <Link href="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link>
      </p>
      <p className="text-center text-xs text-slate-500">
        By creating an account you agree to our <Link href="/terms" className="underline hover:text-slate-800">Terms of Service</Link> and{" "}
        <Link href="/privacy" className="underline hover:text-slate-800">Privacy Policy</Link>, and confirm you are 18 or older.
      </p>
    </form>
  );
}

export function ForgotForm() {
  const { busy, error, submit } = useSubmit();
  const [sent, setSent] = useState<{ devResetUrl?: string } | null>(null);
  if (sent)
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-4xl font-normal">Check your email</h1>
        <p className="text-sm text-slate-600">If an account exists for that address, we&apos;ve sent a link to reset your password. It expires in 30 minutes.</p>
        {sent.devResetUrl && (
          <Alert kind="info">
            Development mode — no email provider is configured. <a className="font-semibold underline" href={sent.devResetUrl}>Open the reset link</a>.
          </Alert>
        )}
        <Link href="/login" className="btn-secondary w-full">Back to sign in</Link>
      </div>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit("/api/auth/forgot", formData(e), (r) => setSent(r as { devResetUrl?: string }));
      }}
    >
      <h1 className="font-serif text-4xl font-normal">Reset your password</h1>
      <p className="text-sm text-slate-600">Enter your email and we&apos;ll send you a reset link.</p>
      {error && <Alert>{error}</Alert>}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
      <Link href="/login" className="block text-center text-sm text-slate-600 hover:underline">Back to sign in</Link>
    </form>
  );
}

export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const { busy, error, submit } = useSubmit();
  if (!token) return <Alert>This reset link is missing its token. Request a new one from the sign-in page.</Alert>;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit("/api/auth/reset", { token, password: formData(e).password });
      }}
    >
      <h1 className="font-serif text-4xl font-normal">Choose a new password</h1>
      {error && <Alert>{error}</Alert>}
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Update password"}</button>
    </form>
  );
}
