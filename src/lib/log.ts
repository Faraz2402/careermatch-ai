// Structured JSON logging. Errors can also be forwarded to ERROR_WEBHOOK_URL
// (Slack/Discord/any collector) - a lightweight stand-in for Sentry.

type Fields = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", event: string, fields?: Fields) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info: (event: string, fields?: Fields) => emit("info", event, fields),
  warn: (event: string, fields?: Fields) => emit("warn", event, fields),
  error: (event: string, fields?: Fields) => emit("error", event, fields),
};

export async function reportError(err: unknown, context: Fields = {}) {
  const e = err instanceof Error ? err : new Error(String(err));
  log.error("unhandled", { message: e.message, stack: e.stack?.split("\n").slice(0, 6).join(" | "), ...context });
  const hook = process.env.ERROR_WEBHOOK_URL;
  if (!hook) return;
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `CareerMatch error: ${e.message}`, context }),
    });
  } catch {
    /* never let reporting throw */
  }
}
