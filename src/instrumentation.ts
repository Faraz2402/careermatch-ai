// Runs once per server start. Node-only work lives in instrumentation-node.ts
// so it is never bundled for the edge runtime.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}

export async function onRequestError(err: unknown, request: { path: string; method: string }) {
  const { reportError } = await import("./lib/log");
  await reportError(err, { path: request.path, method: request.method });
}
