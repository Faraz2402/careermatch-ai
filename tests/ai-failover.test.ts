import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const Schema = z.object({ answer: z.string() });
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const fail = (status: number, msg: string) => new Response(JSON.stringify({ error: { message: msg } }), { status });
const gemini = (text: string) => ok({ candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] });
const chat = (text: string) => ok({ choices: [{ message: { content: text }, finish_reason: "stop" }] });

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const k of ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "GEMINI_API_KEY", "GROQ_API_KEY", "CEREBRAS_API_KEY", "NVIDIA_API_KEY", "OPENROUTER_API_KEY", "MISTRAL_API_KEY", "AI_PROVIDER_ORDER", "GEMINI_FALLBACK_MODELS", "GROQ_MODELS"]) vi.stubEnv(k, "");
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("@/lib/ai");
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("AI provider chain", () => {
  it("uses only providers with a key, in order", async () => {
    const ai = await load({ GEMINI_API_KEY: "g", GROQ_API_KEY: "q", MISTRAL_API_KEY: "m" });
    expect(ai.providerOrder()).toEqual(["gemini", "groq", "mistral"]);
    const custom = await load({ GEMINI_API_KEY: "g", GROQ_API_KEY: "q", AI_PROVIDER_ORDER: "groq,gemini" });
    expect(custom.providerOrder()).toEqual(["groq", "gemini"]);
    expect((await load({})).aiEnabled()).toBe(false);
  });

  it("switches to the next provider when Gemini's daily limit is used up, and remembers it", async () => {
    const ai = await load({ GEMINI_API_KEY: "g", GEMINI_FALLBACK_MODELS: " ", GROQ_API_KEY: "q", GROQ_MODELS: "openai/gpt-oss-120b" });
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      return url.includes("googleapis") ? fail(429, "Quota exceeded for requests per day") : chat('{"answer":"from groq"}');
    }));
    const first = await ai.generateStructuredMeta({ system: "s", prompt: "p", schema: Schema });
    expect(first).toEqual({ data: { answer: "from groq" }, model: "openai/gpt-oss-120b" });
    expect(calls.filter((u) => u.includes("googleapis"))).toHaveLength(1);
    // Gemini is now paused: the next request goes straight to Groq.
    await ai.generateStructured({ system: "s", prompt: "p", schema: Schema });
    expect(calls.filter((u) => u.includes("googleapis"))).toHaveLength(1);
    expect(ai.providerStatus().find((p) => p.id === "gemini")!.models[0].pausedUntil).not.toBeNull();
  });

  it("falls back to a JSON object when a model rejects JSON schemas, and tolerates code fences", async () => {
    const ai = await load({ GROQ_API_KEY: "q", GROQ_MODELS: "m1" });
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      bodies.push(body);
      return body.response_format.type === "json_schema" ? fail(400, "response_format json_schema is not supported") : chat('```json\n{"answer":"ok"}\n```');
    }));
    expect(await ai.generateStructured({ system: "s", prompt: "p", schema: Schema })).toEqual({ answer: "ok" });
    expect(bodies.map((b) => (b.response_format as { type: string }).type)).toEqual(["json_schema", "json_object"]);
  });

  it("skips a provider whose key is rejected and a model that returns bad JSON", async () => {
    const ai = await load({ GROQ_API_KEY: "q", GROQ_MODELS: "bad-json", CEREBRAS_API_KEY: "c", NVIDIA_API_KEY: "n" });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.includes("groq") ? chat("not json") : url.includes("cerebras") ? fail(401, "invalid api key") : chat('{"answer":"nvidia"}'))));
    expect(await ai.generateStructuredMeta({ system: "s", prompt: "p", schema: Schema })).toMatchObject({ data: { answer: "nvidia" } });
  });

  it("says so clearly when every free model is used up", async () => {
    const ai = await load({ GEMINI_API_KEY: "g", GEMINI_FALLBACK_MODELS: " ", GROQ_API_KEY: "q", GROQ_MODELS: "m1" });
    vi.stubGlobal("fetch", vi.fn(async () => fail(429, "rate limit exceeded")));
    await expect(ai.generateStructured({ system: "s", prompt: "p", schema: Schema })).rejects.toBeInstanceOf(ai.AIQuotaError);
  });

  it("streams from the next provider when the first is over its limit", async () => {
    const ai = await load({ GEMINI_API_KEY: "g", GEMINI_FALLBACK_MODELS: " ", OPENROUTER_API_KEY: "o" });
    const sse = 'data: {"choices":[{"delta":{"content":"Hello "}}]}\n\ndata: {"choices":[{"delta":{"content":"there"}}]}\n\ndata: [DONE]\n\n';
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.includes("googleapis") ? fail(429, "quota") : new Response(sse, { status: 200 }))));
    let model = "";
    let text = "";
    for await (const t of ai.streamText({ system: "s", messages: [{ role: "user", content: "hi" }], onModel: (m) => (model = m) })) text += t;
    expect(text).toBe("Hello there");
    expect(model).toBe("openrouter/free");
  });
});
